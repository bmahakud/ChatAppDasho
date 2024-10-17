import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";

const port = 4000 ;
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
  
          
          socket.on("subscribe", (data)=>{
  
              const roomId = data.roomId;
              const userId = data.userId;
              const otherUserId = data.otherUserId;
              console.log("subscribe", roomId, userId)
              socket.join(`${roomId}`);
  
              io.emit("otherUserId", otherUserId, roomId)
              io.to(`${roomId}`).emit("otherUser",userId)
          })

          socket.on("OtherUserConnectedRevert", (data)=>{

            const roomId = data.roomId
            const userId = data.userId;
            const otherUserId = data.otherUserId;


            console.log("OtherUserConnectedRevert", data)
            io.emit("otherUserIdRevert", data)

          });



          socket.on("newMessage", (data)=>{
  
              const roomId =data.groupId;
              const messageContent = data.commenttext;
              const messageTimestamp = data.commenttime;
              const userId = data.commenter;
              const isRead = data.read;
              const file  = data.file;
              const groupType = data.groupType;
              const senderId = data.senderId
              
              // const chat = await addMessageHelper(roomId, username, messageContent, messageTimestamp, isRead)
              console.log("NewMessage", data)
              io.in(`${roomId}`).emit("newMessage", data)
              // socket.broadcast.to(`${roomId}`).emit("newMessage", data)
          });

          // socket.on("newMessageOuter", (data)=>{

          //   const roomId =data.groupId;
          //   const messageContent = data.commenttext;
          //   const messageTimestamp = data.commenttime;
          //   const userId = data.commenter;
          //   const isRead = data.read;
              
          //   console.log("NewMessageOuter", data)
          //   io.in(`${roomId}`).emit("newMessage", data)

          // });
  



        socket.on('typing', (data) => {
          const { roomId, typingUserId, otherUserId} = data;
          if(roomId && typingUserId) {
              
            console.log("roomId typing", roomId, typingUserId);
              socket.to(`${data.roomId}`).emit("typing",data);
              console.log("who is typing 128",data);
              
              if (users[otherUserId]) {
                  io.to(otherUserId).emit("typing",data);
                  console.log("Typing event emitted to particular userId using SocketID: ", data+" "+users[otherUserId ]);
              }
              else {
                  console.log(`User with userId: ${otherUserId} is not connected`);
  
              }
          } else {
              console.log("Invalid data for typing event", data);
          }
      });

        socket.on('markMessageRead', (data) => {
          const room = data.roomId
          const selfId = data.selfId
          const otherId = data.otherId 
          console.log("markMessageReadEvent emitted by ", data.selfId)
          io.in(`${room}`).emit("markMessageRead", data);
        })  

        socket.on('onChatSeen', (data) =>  {
          const roomId = data.roomId;
          const selfId = data.selfId;
          const otherId = data.otherUserId

          console.log("onChatSeen", roomId, selfId )
          // Emit the id of the person who's on chat screen
          io.in(`${roomId}`).emit("onChatSeen", selfId);
        
        });

        socket.on('onChatSeenLeft', (data) => {

          const roomId = data.roomId
          const selfId = data.selfId

          // Emit the id of the person leaving the chat screen in the room
          io.in(`${roomId}`).emit("onChatSeenLeft", data.selfId)
        });


        socket.on("chatAttachSent", (data) => {

          const roomId = data.roomId;
          const senderId = data.senderId

          console.log("chatAttachSent", data);

          // Emit the id of the person leaving the chat screen in the room
          io.in(`${roomId}`).emit("chatAttachSent", data)
        });

        socket.on("unsubscribe", (data) => {
              const roomId = data.roomId;
              const userId = data.userId;

              console.log("unsubscribe", roomId + "by user: " + userId + "at " + new Date());

              // Emit a relevant message
              socket.to(roomId).emit("userLeft", "User left with id: " + userId);

              socket.leave(`${roomId}`);
        });


      // Notices 
      socket.on('noticePost', (data)=>{

        const uploaderId = data.uploaderId          




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
                                                                                                                                 