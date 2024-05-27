const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3001",
      "https://planning-poker-100.azurewebsites.net",
      "https://planning-poker-100.scm.azurewebsites.net",
    ],
    methods: ["GET", "POST"],
  },
});

// Serve static files from the client/build directory
app.use(express.static(path.join(__dirname, "../client/build")));

// Define your other routes or middleware
app.get("/api", (req, res) => {
  res.send({ message: "Hello from the server!" });
});

// Catch all other routes and serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Socket.IO logic...
const rooms = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("create-room", ({ playerName }) => {
    const roomCode = uuidv4();
    rooms[roomCode] = {
      host: socket.id,
      players: {},
      votes: {},
      revealed: false,
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerName = playerName;
    rooms[roomCode].players[socket.id] = playerName;
    io.to(roomCode).emit("room-updated", rooms[roomCode]);
    socket.emit("room-created", { roomCode, playerName });
  });

  socket.on("join-room", ({ roomCode, playerName }) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.playerName = playerName;
      rooms[roomCode].players[socket.id] = playerName;
      io.to(roomCode).emit("room-updated", rooms[roomCode]);
      socket.emit("room-joined", { roomCode, playerName });
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("vote", (vote) => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && !rooms[roomCode].revealed) {
      rooms[roomCode].votes[socket.id] = vote;
      io.to(roomCode).emit("room-updated", rooms[roomCode]);
    }
  });

  socket.on("reveal-votes", () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && rooms[roomCode].host === socket.id) {
      rooms[roomCode].revealed = true;
      io.to(roomCode).emit("room-updated", rooms[roomCode]);
    }
  });

  socket.on("reset-room", () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && rooms[roomCode].host === socket.id) {
      rooms[roomCode].votes = {};
      rooms[roomCode].revealed = false;
      io.to(roomCode).emit("room-reset");
      io.to(roomCode).emit("room-updated", rooms[roomCode]);
    }
  });

  socket.on("leave-room", () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode].players[socket.id];
      delete rooms[roomCode].votes[socket.id];
      if (Object.keys(rooms[roomCode].players).length === 0) {
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit("room-updated", rooms[roomCode]);
      }
      socket.leave(roomCode);
    }
    console.log("user left the room");
  });

  socket.on("disconnect", () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
      if (rooms[roomCode].host === socket.id) {
        io.to(roomCode).emit("room-closed");
        delete rooms[roomCode];
      } else {
        delete rooms[roomCode].players[socket.id];
        delete rooms[roomCode].votes[socket.id];
        if (Object.keys(rooms[roomCode].players).length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit("room-updated", rooms[roomCode]);
        }
      }
    }
    console.log("user disconnected");
  });
});
