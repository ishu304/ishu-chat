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

// STORE GROUP MESSAGES
let groupMessages = {};

io.on("connection", (socket)=>{

  console.log("🔥 User Connected");

  // JOIN GROUP
  socket.on("join_group", (groupId)=>{

    socket.join(groupId);

    if(groupMessages[groupId]){

      socket.emit(
        "load_messages",
        groupMessages[groupId]
      );

    }

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

    // CREATE GROUP
    if(!groupMessages[data.group]){

      groupMessages[data.group] = [];

    }

    // SAVE
    groupMessages[data.group]
      .push(msg);

    // SEND TO GROUP
    io.to(data.group).emit(
      "receive_message",
      msg
    );

  });

});

// 🔥 AUTO DELETE AFTER 1 MIN
setInterval(()=>{

  const now = Date.now();

  for(const group in groupMessages){

    groupMessages[group] =
      groupMessages[group].filter(msg => {

        return (
          now - msg.time
        ) < 60000;

      });

    io.to(group).emit(
      "load_messages",
      groupMessages[group]
    );

  }

}, 1000);

// ROOT
app.get("/", (req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "client/index.html"
    )
  );

});

// PORT
const PORT =
  process.env.PORT || 3001;

// START
server.listen(PORT, ()=>{

  console.log(
    "🚀 Server Running"
  );

});