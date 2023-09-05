const WebSocket = require("ws");

let wss = null;

const initializeSocketServer = () => {
  wss = new WebSocket.Server({ port: 5051 });

  wss.on("connection", (ws, req) => {
    const queryParams = new URLSearchParams(req.url.split("?")[1]);
    const userType = queryParams.get("type");
    const carType = queryParams.get("carType");
    const userId = queryParams.get("userId");

    addUserToGroup(userId, ws);
    addUserToGroup(userType, ws);
    if (carType) {
      addUserToGroup(carType, ws);
    }

    ws.on("message", (message) => {
      console.log(`Received: ${message}`);
      const convertedMessage = convertMessage(JSON.parse(message));
      const stringifiedMessage = JSON.stringify(convertedMessage);

      if (
        convertedMessage.type === MESSAGES.LOCATION ||
        convertedMessage.type === MESSAGES.OFFLINE
      ) {
        sendToGroup("passenger", stringifiedMessage);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      removeUserFromGroup(userType, ws);
    });
  });
};

const convertMessage = (message) => {
  let { type, ...data } = message;
  return {
    type,
    data: JSON.stringify(data),
  };
};

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
    groups[groupName] = group.filter((socket) => socket !== userSocket);
  }
}

function sendToGroup(groupName, message) {
  const group = groups[groupName];
  if (group) {
    group.forEach((socket) => {
      socket.send(message);
    });
  }
}

const MESSAGES = {
  LOCATION: "location",
  OFFLINE: "offline",
};

module.exports = {
  initializeSocketServer,
  sendToGroup,
  convertMessage,
};
