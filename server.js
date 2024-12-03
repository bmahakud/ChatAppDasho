import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import https from "https";
import fs from "fs";
import cors from "cors";

const port = 5001;
const app = express();

// SSL options
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/chat.dashoapp.com-0001/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/chat.dashoapp.com-0001/fullchain.pem')
};

console.log("restarting server with SSL");

// Allowed origins for CORS

// Allowed origins for CORS
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://dashoapp.com",
    "https://chat.dashoapp.com",
    "https://stage.dashoapp.com"
];

// CORS setup for Express app
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));

// Create the HTTPS server with Express
const server = https.createServer(sslOptions, app);

// Set up Socket.IO with CORS for the HTTPS server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
// Set up basic routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Store connected users with their User IDs and their connected socket instances
const users = new Map();


// Socket.IO events
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  io.emit("connectId", socket.id);

  socket.on('register', (userId) => {
    if (!users.has(userId)) {
      users.set(userId, []);
    }
    const socketIds = users.get(userId);
    if (!socketIds.includes(socket.id)) {
      socketIds.push(socket.id);
    }

    console.log(`${userId} connected with socketId: ${socket.id}`);
    console.log(users);

  });

  // Join a room
  socket.on("subscribe", (data) => {

    const roomId = data.roomId;
    const userId = data.userId;
    const otherUserId = data.otherUserId;
    console.log("subscribe", roomId, userId)
    socket.join(`${roomId}`);
    socket.in(`${roomId}`).emit("subscribe", data);
    // io.to(roomId).emit("subscribe",data);
    io.to(`${roomId}`).emit("subscribe",data);
  })

  // Notify other users about room events
  socket.on("OtherUserConnectedRevert", (data) => {
    const { roomId } = data;
    console.log("OtherUserConnectedRevert", data);
    // socket.in(`${roomId}`).emit("OtherUserConnectedRevert", data);
    // io.to(roomId).emit("OtherUserConnectedRevert",data);
    io.to(`${roomId}`).emit("OtherUserConnectedRevert",data);


  });

  // Send a new message
  socket.on("newMessage", (data) => {
    const {
      groupId: roomId,
      commenter: senderId,
      otherUserId: receiverId,
    } = data;

    const receiverSocketIds = users.get(receiverId);
    if (receiverSocketIds) {
      receiverSocketIds.forEach((socketId) =>
        io.to(socketId).emit("newMessage", data)
      );
    }

    const senderSocketIds = users.get(senderId);
    if (senderSocketIds) {
      senderSocketIds.forEach((socketId) =>
        io.to(socketId).emit("newMessage", data)
      );
    }

    console.log("NewMessage event emitted:", data);
  });

  // Notify typing event
  socket.on("typing", (data) => {
    const { roomId, typingUserId, otherUserId } = data;

    const receiverSocketIds = users.get(otherUserId);
    if (receiverSocketIds) {
      receiverSocketIds.forEach((socketId) =>
        io.to(socketId).emit("typing", data)
      );
    }

    console.log("Typing event emitted:", data);
  });


  // Handle message deletion
  socket.on("deleteMessage", (data) => {
    const { commenter: senderId, otherUserId } = data;

    const receiverSocketIds = users.get(otherUserId);
    if (receiverSocketIds) {
      receiverSocketIds.forEach((socketId) =>
        io.to(socketId).emit("deleteMessage", data)
      );
    }

    const senderSocketIds = users.get(senderId);
    if (senderSocketIds) {
      senderSocketIds.forEach((socketId) =>
        io.to(socketId).emit("deleteMessage", data)
      );
    }

    console.log("DeleteMessage event emitted:", data);
  });

  // Block user
  socket.on("blockUser", (data) => {
    const { blockedUserId } = data;

    const receiverSocketIds = users.get(blockedUserId);
    if (receiverSocketIds) {
      receiverSocketIds.forEach((socketId) =>
        io.to(socketId).emit("blockUser", data)
      );
    }

    console.log("BlockUser event emitted:", data);
  });

  // Unblock user
  socket.on("unblockUser", (data) => {
    const { unblockedUserId } = data;

    const receiverSocketIds = users.get(unblockedUserId);
    if (receiverSocketIds) {
      receiverSocketIds.forEach((socketId) =>
        io.to(socketId).emit("unblockUser", data)
      );
    }

    console.log("UnblockUser event emitted:", data);
  });

  // Leave a room
  socket.on("unsubscribe", (data) => {
    const { roomId } = data;
    console.log("unsubscribe", roomId);
    socket.leave(roomId);
    socket.in(`${roomId}`).emit("unsubscribe", data);   
    io.to(`${roomId}`).emit("unsubscribe",data);


  });


  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    users.forEach((socketIds, userId) => {
      const updatedSocketIds = socketIds.filter((id) => id !== socket.id);
      if (updatedSocketIds.length > 0) {
        users.set(userId, updatedSocketIds);
      } else {
        users.delete(userId);
      }
    });
    console.log("Updated users list:", users);
  });

  socket.on('unregister', (userId, socketId) => {
    if (users.has(userId)) {
      const socketIds = users.get(userId);
      const index = socketIds.indexOf(socketId);
      if (index !== -1) {
        socketIds.splice(index, 1);  
      }
      if (socketIds.length === 0) {
        users.delete(userId);
      }
      console.log(`${userId} disconnected with socketId: ${socketId}`);
      console.log(users);
    }
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
