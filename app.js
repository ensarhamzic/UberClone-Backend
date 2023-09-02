const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const usersRoutes = require("./routes/usersRoutes");
const { initializeSocketServer } = require("./wss");
initializeSocketServer();

mongoose.connect(
  `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PW}@datacluster.uutk0tv.mongodb.net/uberClone?retryWrites=true&w=majority`,
  { useNewUrlParser: true }
);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use("/users", usersRoutes);

module.exports = app;
