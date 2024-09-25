import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";

const port = 4000;
const app = express();
const server = createServer(app);

const allowedOrigins = [
    "http://localhost:3000",
  "http://localhost:5173",
        "*",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const users = {}


io.on('connection', (socket) => {
        console.log('User connected ' + socket.id );
        io.emit("connectId", socket.id);

        // When socket of a user is connected, we're storing the pair of the userId and it's socketID
        // WHen the socket is disconnecting, we're removing it from the list
        socket.on('register', (userId) => {
            users[userId] = socket.id;
            console.log(`${userId} connected with socketId: ${socket.id}`);
          })
  
          let username = null
          socket.on("subscribe", (data)=>{
  
              const roomId = data.roomId;
              const username = data.username;
              const otherUserId = data.otherUserId;
              console.log("subscribe", roomId, username)
              socket.join(`${roomId}`);
  
              io.emit("otherUserId", otherUserId, roomId)
              io.to(`${roomId}`).emit("otherUser",username)
          })
          socket.on("newMessage", (data)=>{
  
              const roomId =data.roomId;
              const messageContent = data.messageContent;
              const messageTimestamp = data.messageTimestamp;
              const userId = data.userId;
              const otherUserId = data.otherUserId;
              const isRead = false;
              // const chat = await addMessageHelper(roomId, username, messageContent, messageTimestamp, isRead)
              console.log(data)
              io.in(`${roomId}`).emit("newMessage", data)
              // socket.broadcast.to(`${roomId}`).emit("newMessage", data)
          })
  
          socket.on('typing', (data) => {
            const { roomId, typingUserId } = data;
  
            if (roomId && typingUserId) {
                console.log("roomId typing", roomId);
                io.in(`${roomId}`).emit("typing", data.typingUserId);
            } else {
                console.log("Invalid data for typing event", data);
            }
        });

        socket.on("unsubscribe", (data) => {
              const roomId = data.roomId;
              console.log("unsubscribe", roomId);

              // Define a proper message to emit here if needed, e.g., a notification message.
              const leaveMessage = {
                      message: `${username || 'A user'} has left the room.`,
                      timestamp: new Date(),
       };

      io.in(`${roomId}`).emit("newMessage", leaveMessage); // Emit a relevant message instead of chat.
      socket.leave(`${roomId}`);
      });



      socket.on('disconnect', () => {
          console.log('A user disconnected');
          for(let userId in users){
            if(users[userId] == socket.id){
              delete users[userId];
              // console.log(`${userName} disconnected`);
              break;
            }
          }
      });

});

server.listen(port, '0.0.0.0', () => {
console.log(`Server is running on port ${port}`);
});
                                                                                                                                 