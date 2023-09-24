const { number } = require("joi");
const mongoose = require("mongoose");

const tripSchema = mongoose.Schema({
  pickupLocation: {
    type: {
      latitude: Number,
      longitude: Number,
    },
    required: true,
  },
  dropoffLocation: {
    type: {
      latitude: Number,
      longitude: Number,
    },
    required: true,
  },
  dropoffLocationName: {
    type: String,
    required: true,
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  rideType: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  driverRating: {
    type: Number,
    required: false,
  },
  tip: {
    type: Number,
    required: false,
  },
});

const Trip = mongoose.model("Trip", tripSchema);
module.exports = Trip;
