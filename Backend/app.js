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

const players = {};

io.on("connection", function (socket) {
  console.log(`${socket.id} connected`);

	players[socket.id] = {
		id: socket.id,
		x: 0,
		y: 10,
		z: 0,
		rotation: 0,
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
		socket.broadcast.emit("remoteShoot", shootData);
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