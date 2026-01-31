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
		color: "#ff0000", // default color
		nick: "Player", // bazowy nick bez tagu
		team: null, // team gracza (1 lub 2)
		x: 0,
		y: 10,
		z: 0,
		rotation: 0,
		health: 5, // HP gracza
	};

  socket.emit("currentPlayers", players);

	socket.broadcast.emit("newPlayer", players[socket.id]);
	
	// Wyślij listę wszystkich graczy do wszystkich
	io.emit("allPlayers", players);

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

	socket.on("changeColor", function (colorData) {
		if (players[socket.id]) {
			players[socket.id].color = colorData.color;
			socket.broadcast.emit("updatePlayer", players[socket.id]);
			// Wyślij listę wszystkich graczy do wszystkich
			io.emit("allPlayers", players);
		}
	});

	socket.on("changeNick", function (nickData) {
		if (players[socket.id]) {
			players[socket.id].nick = nickData.nick;
			socket.broadcast.emit("updatePlayer", players[socket.id]);
			// Wyślij listę wszystkich graczy do wszystkich
			io.emit("allPlayers", players);
		}
	});

	socket.on("changeTeam", function (teamData) {
		if (players[socket.id]) {
			players[socket.id].team = teamData.team;
			// Wyślij aktualizację do wszystkich (włącznie z nadawcą)
			io.emit("updatePlayer", players[socket.id]);
			// Wyślij także listę wszystkich graczy do wszystkich (dla aktualizacji tabelki)
			io.emit("allPlayers", players);
		}
	});

	// Endpoint do żądania pełnej listy graczy
	socket.on("requestAllPlayers", function () {
		socket.emit("allPlayers", players);
	});

	socket.on("playerHit", function (hitData) {
		// hitData zawiera { targetId, damage }
		if (players[hitData.targetId]) {
			// Sprawdź czy to friendly fire
			const attacker = players[socket.id];
			const target = players[hitData.targetId];
			
			if (attacker && target && attacker.team !== null && attacker.team === target.team) {
				// Friendly fire - ignoruj
				console.log(`Friendly fire blocked: ${socket.id} tried to hit teammate ${hitData.targetId}`);
				return;
			}
			
			players[hitData.targetId].health = Math.max(0, players[hitData.targetId].health - hitData.damage);
			
			// Wyślij do wszystkich informację o trafieniu
			io.emit("playerDamaged", {
				targetId: hitData.targetId,
				attackerId: socket.id,
				health: players[hitData.targetId].health
			});

			// Jeśli gracz zginął
			if (players[hitData.targetId].health <= 0) {
				io.emit("playerDied", {
					playerId: hitData.targetId,
					killerId: socket.id
				});
			}
		}
	});

	socket.on("playerRespawn", function () {
		if (players[socket.id]) {
			players[socket.id].health = 5;
			players[socket.id].x = 0;
			players[socket.id].y = 10;
			players[socket.id].z = 0;
			
			io.emit("playerRespawned", {
				playerId: socket.id,
				x: 0,
				y: 10,
				z: 0,
				health: 5
			});
		}
	});

	socket.on("disconnect", function () {
		console.log(`${socket.id} disconnected`);
		if (players[socket.id]) {
			delete players[socket.id];
		}
		socket.broadcast.emit("deletePlayer", socket.id);
		// Wyślij zaktualizowaną listę graczy do wszystkich
		io.emit("allPlayers", players);
	});
});

http.listen(2002, function () {
	console.log("listening on *:2002");
});