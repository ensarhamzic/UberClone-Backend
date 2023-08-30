const usersJoiSchema = require("../dataValidation/usersValidation");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcrypt");

const signUp = async (req, res) => {

  console.log(req.body)

  
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
      return res
        .status(400)
        .json({ error: "Email is already in use" });
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

    return res.status(200).json(
        { token, 
            user: newUser
        })
        ;
  } catch (e) {
    return res.status(200).json({ error: "Something went wrong. Try again" });
  }
};

const signIn = async (req, res) => {
  const { email, password } = req.body;
  let foundUser = null;
  try {
    foundUser = await User.findOne({ email});
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
    if(!user)
        return res.status(400).json({ error: "User not found" });
    return res.status(200).json({ success: "User is verified", user: user });
};

const addLocation = async(req, res) => {
    const {type, latitude, longitude} = req.body;
    console.log(req.body)
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    console.log(userId)

    const user = await User.findById(userId);
    if(!user)
        return res.status(400).json({ error: "User not found" });
    if(type === "home") {
        const home  = {latitude, longitude};
        user.home = home;
        await User.updateOne({ _id: userId }, { home });
    }
    else if(type === "work") {
        const work  = {latitude, longitude};
        user.work = work;
        await User.updateOne({ _id: userId }, { work });
    }

    return res.status(200).json({ user });
}

module.exports = {
  signUp,
  signIn,
  verify,
  addLocation
};
