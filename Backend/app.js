const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "../Frontend/public")));
app.use(express.static(path.join(__dirname, "../Frontend/src")));
app.use(express.static(path.join(__dirname, "../Frontend")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// Spawn points - takie same jak w Consts.js
const SPAWN_POINTS = [
  { x: 15, y: 2, z: 17, angle: Math.PI / 4 },
  { x: -13, y: 2, z: 10, angle: -Math.PI / 3 },
  { x: 5, y: 1, z: -11, angle: Math.PI },
  { x: 16, y: 3, z: -5, angle: Math.PI / 1.5 },
  { x: -10, y: 2.5, z: -13, angle: -Math.PI / 1.5 },
  { x: 6, y: 0, z: 12, angle: Math.PI / 2 },
  { x: 0, y: 0, z: 0, angle: -Math.PI / 1.5 },
];

function getRandomSpawn() {
  return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
}

const players = {};

io.on("connection", function (socket) {
  console.log(`${socket.id} connected`);

  const spawn = getRandomSpawn();
  
  players[socket.id] = {
    id: socket.id,
    color: "#ff0000", // default color
    nick: "Player", // default nick
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    rotation: spawn.angle,
    health: 5, // HP gracza
    kills: 0,
  };

  socket.emit("currentPlayers", players);

  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("playerMove", function (movementData) {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      players[socket.id].rotation = movementData.rotation;

      socket.broadcast.emit("updatePlayer", players[socket.id]);
    }
  });

  socket.on("playerShoot", function (shootData) {
    shootData.ownerId = socket.id;
    socket.broadcast.emit("remoteShoot", shootData);
  });

  socket.on("changeColor", function (colorData) {
    if (players[socket.id]) {
      players[socket.id].color = colorData.color;
      socket.broadcast.emit("updatePlayer", players[socket.id]);
    }
  });

  socket.on("changeNick", function (nickData) {
    if (players[socket.id]) {
      players[socket.id].nick = nickData.nick;
      socket.broadcast.emit("updatePlayer", players[socket.id]);
    }
  });

  socket.on("playerHit", function (hitData) {
    // hitData zawiera { targetId, damage }
    if (players[hitData.targetId]) {
      players[hitData.targetId].health = Math.max(
        0,
        players[hitData.targetId].health - hitData.damage,
      );

      io.emit("playerDamaged", {
        targetId: hitData.targetId,
        attackerId: socket.id,
        health: players[hitData.targetId].health,
      });

      if (players[hitData.targetId].health <= 0) {
        // Zwiększ kille zabójcy
        if (players[socket.id]) {
          players[socket.id].kills++;

          io.emit("updateKills", {
            playerId: socket.id,
            kills: players[socket.id].kills,
          });
        }

        // Wyślij informację o śmierci
        io.emit("playerDied", {
          playerId: hitData.targetId,
          killerId: socket.id,
        });

        // Wyślij komunikat o zabójstwie do chatu
        const killerNick = players[socket.id] ? players[socket.id].nick : "Unknown";
        const victimNick = players[hitData.targetId] ? players[hitData.targetId].nick : "Unknown";
        const killerColor = players[socket.id] ? players[socket.id].color : "#ffffff";
        const victimColor = players[hitData.targetId] ? players[hitData.targetId].color : "#ffffff";

        io.emit("killMessage", {
          killerNick: killerNick,
          victimNick: victimNick,
          killerColor: killerColor,
          victimColor: victimColor,
        });
      }
    }
  });

  socket.on("chatMessage", (text) => {
    const player = players[socket.id];
    const authorName = player ? player.nick : "Unknown";
    const authorColor = player ? player.color : "#ffffff";

    io.emit("chatMessage", {
      author: authorName,
      text: text,
      color: authorColor,
    });
  });

  socket.on("playerRespawn", function () {
    if (players[socket.id]) {
      // Losowy spawn po każdym respawnie
      const spawn = getRandomSpawn();
      
      players[socket.id].health = 5;
      players[socket.id].x = spawn.x;
      players[socket.id].y = spawn.y;
      players[socket.id].z = spawn.z;
      players[socket.id].rotation = spawn.angle;

      io.emit("playerRespawned", {
        playerId: socket.id,
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        rotation: spawn.angle,
        health: 5,
      });
    }
  });

  socket.on("disconnect", function () {
    console.log(`${socket.id} disconnected`);
    if (players[socket.id]) {
      delete players[socket.id];
    }
    socket.broadcast.emit("deletePlayer", socket.id);
  });
});

http.listen(2002, function () {
  console.log("listening on *:2002");
});