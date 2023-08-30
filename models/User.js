const { number } = require("joi");
const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    maxLength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match:
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: {
    type: String,
    required: true,
  },
  type: {
    type: Number,
    required: true,
  },
  home: {
    type: {
        latitude: Number,
        longitude: Number,
    },
    required: false,
  },
  work: {
    type: {
        latitude: Number,
        longitude: Number,
    },
    required: false,
  },
  carType: {
    type: Number,
    required: false,
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
