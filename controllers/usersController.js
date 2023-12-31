const usersJoiSchema = require("../dataValidation/usersValidation");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const app = require("../app");
const Trip = require("../models/Trip");
const { sendToGroup, convertMessage } = require("../wss");

const signUp = async (req, res) => {
  console.log(req.body);

  let { fullName, email, password, userType, carType } = req.body;

  const { error, value } = usersJoiSchema.validate({
    fullName,
    email,
    password,
    type: userType,
  });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const notUnique = await User.findOne({ $or: [{ email }] });
    if (notUnique) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(value.password, 10);
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      type: userType,
    });

    if (userType === 1) {
      newUser.carType = carType;
    }

    const savedUser = await newUser.save();

    const token = jwt.sign(
      { email: savedUser.email, id: savedUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "100h" }
    );

    return res.status(200).json({ token, user: newUser });
  } catch (e) {
    return res.status(200).json({ error: "Something went wrong. Try again" });
  }
};

const signIn = async (req, res) => {
  const { email, password } = req.body;
  let foundUser = null;
  try {
    foundUser = await User.findOne({ email });
    if (!foundUser) {
      throw new Error();
    }

    const match = await bcrypt.compare(password, foundUser.password);

    if (!match) {
      throw new Error();
    }

    const token = jwt.sign(
      { email: foundUser.email, id: foundUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "100h" }
    );

    return res.status(200).json({ token, user: foundUser });
  } catch (e) {
    res.status(400).json({ error: "Authentication failed" });
  }
};

const verify = async (req, res) => {
  const token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.id;
  // find user by id
  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ error: "User not found" });
  return res.status(200).json({ success: "User is verified", user: user });
};

const addLocation = async (req, res) => {
  const { type, latitude, longitude } = req.body;
  console.log(req.body);
  const token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.id;

  console.log(userId);

  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ error: "User not found" });
  if (type === "home") {
    const home = { latitude, longitude };
    user.home = home;
    await User.updateOne({ _id: userId }, { home });
  } else if (type === "work") {
    const work = { latitude, longitude };
    user.work = work;
    await User.updateOne({ _id: userId }, { work });
  }

  return res.status(200).json({ user });
};

const requestRide = async (req, res) => {
  const {
    pickupLocation,
    dropoffLocation,
    dropoffLocationName,
    tripCost,
    rideType,
  } = req.body;

  const token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const passengerId = decoded.id;

  const trip = new Trip({
    pickupLocation: {
      latitude: pickupLocation.latitude,
      longitude: pickupLocation.longitude,
    },
    dropoffLocation: {
      latitude: dropoffLocation.latitude,
      longitude: dropoffLocation.longitude,
    },
    dropoffLocationName: dropoffLocationName,
    passenger: passengerId,
    price: tripCost,
    status: "requested",
    rideType,
  });

  const passenger = await User.findById(passengerId);

  const message = {
    type: "rideRequest",
    tripId: trip._id,
    passengerId: passenger._id,
    passengerName: passenger.fullName,
    dropoffLocationName,
    pickupLocation,
    dropoffLocation,
    tripCost,
  };

  const convertedMessage = convertMessage(message);
  const stringifiedMessage = JSON.stringify(convertedMessage);

  sendToGroup(rideType, stringifiedMessage);

  await trip.save();

  return res.status(200).json({ message: "success" });
};

const cancelRideRequest = async (req, res) => {
  let token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // find trip by passengerId and status = "requested"
  const trip = await Trip.findOne({
    passenger: decoded.id,
    status: "requested",
  });

  if (!trip) {
    return res.status(400).json({ error: "No trip found" });
  }

  // send message to driver
  const message = {
    type: "rideRequestCancelled",
    tripId: trip._id,
  };

  const convertedMessage = convertMessage(message);
  const stringifiedMessage = JSON.stringify(convertedMessage);

  sendToGroup(trip.rideType, stringifiedMessage);

  // delete trip
  await Trip.deleteOne({ _id: trip._id });

  return res.status(200).json({ message: "success" });
};

const acceptRide = async (req, res) => {
  let token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const { tripId } = req.body;

  // find trip by tripId
  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(400).json({ error: "No trip found" });
  }

  const driver = await User.findById(decoded.id);

  const allDriverTrips = await Trip.find({
    driver: decoded.id,
    status: "completed",
  });

  let driverRating = 0.0;

  if (allDriverTrips.length > 0) {
    let totalRating = 0;
    let totalRatings = 0;
    for (let i = 0; i < allDriverTrips.length; i++) {
      if (allDriverTrips[i].driverRating) {
        totalRating += allDriverTrips[i].driverRating;
        totalRatings++;
      }
    }
    if (totalRatings) {
      driverRating = totalRating / totalRatings;
    }
  }

  // send message to passenger
  const message = {
    type: "rideAccepted",
    tripId: trip._id,
    dropoffLocationName: trip.dropoffLocationName,
    pickupLocation: trip.pickupLocation,
    dropoffLocation: trip.dropoffLocation,
    tripCost: trip.price,
    driverId: decoded.id,
    driverName: driver.fullName,
    rideType: trip.rideType,
    driverRating,
  };

  console.log("DRIVER RATING");
  console.log(driverRating);

  const convertedMessage = convertMessage(message);
  const stringifiedMessage = JSON.stringify(convertedMessage);

  sendToGroup(trip.passenger._id, stringifiedMessage);

  trip.status = "accepted";
  trip.driver = decoded.id;
  await trip.save();

  return res.status(200).json({ message: "success" });
};

const cancelRide = async (req, res) => {
  const { tripId } = req.body;

  console.log("CANCEL RIDE WORKING");
  console.log(tripId);

  let token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const trip = await Trip.findOne({
    _id: tripId,
  });

  if (!trip) {
    return res.status(400).json({ error: "No trip found" });
  }

  // send message to driver
  const message = {
    type: "rideCancelled",
    tripId: trip._id,
  };

  const convertedMessage = convertMessage(message);
  const stringifiedMessage = JSON.stringify(convertedMessage);

  sendToGroup(trip.passenger._id, stringifiedMessage);
  sendToGroup(trip.driver._id, stringifiedMessage);

  // delete trip
  await Trip.deleteOne({ _id: trip._id });

  return res.status(200).json({ message: "success" });
};

const pickupPassenger = async (req, res) => {
  let token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const { tripId } = req.body;

  // find trip by tripId
  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(400).json({ error: "No trip found" });
  }

  const driver = await User.findById(decoded.id);

  // send message to passenger
  const message = {
    type: "rideStarted",
    tripId: trip._id,
  };

  const convertedMessage = convertMessage(message);
  const stringifiedMessage = JSON.stringify(convertedMessage);

  sendToGroup(trip.passenger._id, stringifiedMessage);

  trip.status = "inProgress";
  await trip.save();

  return res.status(200).json({ message: "success" });
};

const completeTrip = async (req, res) => {
  let token = req.headers.authorization;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const { tripId } = req.body;

  // find trip by tripId
  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(400).json({ error: "No trip found" });
  }

  const driver = await User.findById(decoded.id);

  // send message to passenger
  const message = {
    type: "rideCompleted",
    tripId: trip._id,
  };

  const convertedMessage = convertMessage(message);
  const stringifiedMessage = JSON.stringify(convertedMessage);

  sendToGroup(trip.passenger._id, stringifiedMessage);

  trip.status = "completed";
  await trip.save();

  return res.status(200).json({ message: "success" });
};

const rewardDriver = async (req, res) => {
  const { tripId, tip, rating } = req.body;

  // find trip by tripId
  const trip = await Trip.findById(tripId);

  if (!trip) {
    return res.status(400).json({ error: "No trip found" });
  }

  if (tip || rating) {
    const message = {
      type: "driverRewarded",
      tip,
      rating,
    };

    const convertedMessage = convertMessage(message);

    const stringifiedMessage = JSON.stringify(convertedMessage);

    sendToGroup(trip.driver._id, stringifiedMessage);
  }

  trip.tip = tip;
  if (rating) {
    trip.driverRating = rating;
  }
  await trip.save();

  return res.status(200).json({ message: "success" });
};

module.exports = {
  signUp,
  signIn,
  verify,
  addLocation,
  requestRide,
  cancelRideRequest,
  acceptRide,
  cancelRide,
  pickupPassenger,
  completeTrip,
  rewardDriver,
};
