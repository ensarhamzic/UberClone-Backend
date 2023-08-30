const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const usersRoutes = require("./routes/usersRoutes");
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 5051 });


const convertMessage = (message) => {
  let {type, ...data} = message;
  return {
    type,
    data: JSON.stringify(data)
  }
}


const groups = {};

// Kada se korisnik poveže, dodajte ga u odgovarajuću grupu
function addUserToGroup(groupName, userSocket) {
  if (!groups[groupName]) {
      groups[groupName] = [];
  }
  groups[groupName].push(userSocket);
}

// Kada se korisnik odspoji, uklonite ga iz grupe
function removeUserFromGroup(groupName, userSocket) {
  const group = groups[groupName];
  if (group) {
      groups[groupName] = group.filter(socket => socket !== userSocket);
  }
}

function sendToGroup(groupName, message) {
  const group = groups[groupName];
  if (group) {
      group.forEach(socket => {
          socket.send(message);
      });
  }
}

wss.on('connection', (ws, req) => {

  const queryParams = new URLSearchParams(req.url.split("?")[1]);
  const userType = queryParams.get("type");
  const carType = queryParams.get("carType");

  addUserToGroup(userType, ws);

  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    const convertedMessage = convertMessage(JSON.parse(message));
    const stringifiedMessage = JSON.stringify(convertedMessage);

    if(convertedMessage.type === "location" || convertedMessage.type === "offline") {
      sendToGroup("passenger", stringifiedMessage);
    }
  //   wss.clients.forEach((client) => {
  //     if (client.readyState === WebSocket.OPEN) {
  //         client.send(stringifiedMessage);
  //     }
  // });
  });


  ws.on('close', () => {
    console.log('Client disconnected');
    removeUserFromGroup(userType, ws);
  });
});

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
