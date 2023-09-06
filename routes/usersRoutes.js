const express = require("express");
const Router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const usersController = require("../controllers/usersController");

Router.post("/signup", usersController.signUp);
Router.post("/signin", usersController.signIn);
Router.post("/verify", checkAuth, usersController.verify);
Router.post("/addLocation", checkAuth, usersController.addLocation);
Router.post("/requestRide", checkAuth, usersController.requestRide);
Router.post("/cancelRideRequest", checkAuth, usersController.cancelRideRequest);
Router.post("/acceptRide", checkAuth, usersController.acceptRide);

module.exports = Router;
