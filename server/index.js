// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://planning-poker-100.azurewebsites.net"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:3000", "https://planning-poker-100.azurewebsites.net"]
}));

app.use(express.static(path.join(__dirname, './build')));

app.get('/api', (req, res) => {
  res.send({ message: 'Hello from the server!' });
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('create-room', ({ playerName }) => {
    const roomCode = uuidv4();
    rooms[roomCode] = {
      host: socket.id,
      players: {},
      votes: {},
      revealed: false
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerName = playerName;
    rooms[roomCode].players[socket.id] = playerName;
    io.to(roomCode).emit('room-updated', rooms[roomCode]);
    socket.emit('room-created', { roomCode, playerName });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.playerName = playerName;
      rooms[roomCode].players[socket.id] = playerName;
      io.to(roomCode).emit('room-updated', rooms[roomCode]);
      socket.emit('room-joined', { roomCode, playerName });
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('vote', (vote) => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && !rooms[roomCode].revealed) {
      rooms[roomCode].votes[socket.id] = vote;
      io.to(roomCode).emit('room-updated', rooms[roomCode]);
    }
  });

  socket.on('reveal-votes', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && rooms[roomCode].host === socket.id) {
      rooms[roomCode].revealed = true;
      io.to(roomCode).emit('room-updated', rooms[roomCode]);
    }
  });

  socket.on('reset-room', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && rooms[roomCode].host === socket.id) {
      rooms[roomCode].votes = {};
      rooms[roomCode].revealed = false;
      io.to(roomCode).emit('room-reset');
      io.to(roomCode).emit('room-updated', rooms[roomCode]);
    }
  });

  socket.on('leave-room', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode].players[socket.id];
      delete rooms[roomCode].votes[socket.id];
      if (Object.keys(rooms[roomCode].players).length === 0) {
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit('room-updated', rooms[roomCode]);
      }
      socket.leave(roomCode);
    }
    console.log('user left the room');
  });

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
      if (rooms[roomCode].host === socket.id) {
        io.to(roomCode).emit('room-closed');
        delete rooms[roomCode];
      } else {
        delete rooms[roomCode].players[socket.id];
        delete rooms[roomCode].votes[socket.id];
        if (Object.keys(rooms[roomCode].players).length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit('room-updated', rooms[roomCode]);
        }
      }
    }
    console.log('user disconnected');
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../planning-poker/build/index.html'));
});

server.listen(4000, () => {
  console.log('listening on *:4000');
});
