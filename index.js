// index.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());

app.use(
  express.static(
    path.join(__dirname, "client")
  )
);

const server = http.createServer(app);

const io = new Server(server, {
  cors:{
    origin:"*"
  }
});

// STORE
let groupMessages = {};
let onlineUsers = {};

io.on("connection", (socket)=>{

  console.log("🔥 User Connected");

  // JOIN GROUP
  socket.on("join_group", (data)=>{

    const groupId = data.group;
    const userName = data.name;

    socket.join(groupId);

    socket.groupId = groupId;
    socket.userName = userName;

    // CREATE GROUP
    if(!groupMessages[groupId]){

      groupMessages[groupId] = [];

    }

    // CREATE ONLINE LIST
    if(!onlineUsers[groupId]){

      onlineUsers[groupId] = [];

    }

    // ADD USER
    onlineUsers[groupId].push(userName);

    // REMOVE DUPLICATE
    onlineUsers[groupId] =
      [...new Set(
        onlineUsers[groupId]
      )];

    // SEND ONLINE USERS
    io.to(groupId).emit(
      "online_users",
      onlineUsers[groupId]
    );

    // SEND OLD CHAT
    io.to(groupId).emit(
      "load_messages",
      groupMessages[groupId]
    );

  });

  // SEND MESSAGE
  socket.on("send_message", (data)=>{

    const msg = {

      id:Date.now(),

      name:data.name,

      message:data.message,

      group:data.group,

      time:Date.now()

    };

    if(!groupMessages[data.group]){

      groupMessages[data.group] = [];

    }

    groupMessages[data.group]
      .push(msg);

    io.to(data.group).emit(
      "load_messages",
      groupMessages[data.group]
    );

  });

  // DISCONNECT
  socket.on("disconnect", ()=>{

    const groupId = socket.groupId;
    const userName = socket.userName;

    if(
      groupId &&
      onlineUsers[groupId]
    ){

      onlineUsers[groupId] =
        onlineUsers[groupId]
        .filter(
          user => user !== userName
        );

      io.to(groupId).emit(
        "online_users",
        onlineUsers[groupId]
      );

    }

  });

});

// AUTO DELETE 2 MIN
setInterval(()=>{

  const now = Date.now();

  for(const group in groupMessages){

    groupMessages[group] =
      groupMessages[group]
      .filter(msg => {

        return (
          now - msg.time
        ) < 120000;

      });

    io.to(group).emit(
      "load_messages",
      groupMessages[group]
    );

  }

},1000);

// ROOT
app.get("/", (req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "client/index.html"
    )
  );

});

const PORT =
  process.env.PORT || 3001;

server.listen(PORT, ()=>{

  console.log(
    "🚀 Server Running"
  );

});
