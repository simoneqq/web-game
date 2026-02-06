import * as THREE from "three";
import { setupInput } from "./Controls.js";
import { Player } from "../entities/Player.js";
import { RemotePlayer } from "../entities/RemotePlayers.js";
import { DevTools } from "./DevTools.js";
import { ProjectileSystem } from "./ProjectileSystem.js";
import { loadWorld } from "../scenes/ModelScene.js";
import { Chat } from "./Chat.js";
import { Scoreboard } from "./Scoreboard.js";
import { SPAWN_POINTS } from "../utils/Consts.js";

export class Engine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.devTools = null;
    this.projectileSystem = null;

    this.socket = null;
    this.remotePlayers = {};

    this.isGameActive = false;
    this.playerColor = "#ff0000"; // Domyślny kolor
    this.playerNick = "Player"; // Domyślny nick

    this.chat = new Chat(this);

    this.myKills = 0;
    this.scoreboard = new Scoreboard(this);

    // ograniczanie przysylania danych
    this.lastSocketUpdate = 0; // Kiedy ostatnio wysłaliśmy dane
    this.socketUpdateRate = 50; // Co ile ms wysyłać (50ms = 20 razy na sek)
    this.lastPosition = new THREE.Vector3(); // Gdzie byliśmy ostatnio
    this.lastRotation = 0; // Jaka była rotacja ostatnio
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    setupInput();
    loadWorld(this.scene);

    this.projectileSystem = new ProjectileSystem(this.scene, this);
    this.player = new Player(
      this.camera,
      document.body,
      this.projectileSystem,
      this,
    );

    // Początkowy spawn - zostanie nadpisany przez serwer
    const spawn = this.getRandomSpawn();
    const playerHeight = 1.6;

    this.player.collider.start.set(spawn.x, spawn.y, spawn.z);
    this.player.collider.end.set(spawn.x, spawn.y + playerHeight, spawn.z);
    this.player.camera.position.copy(this.player.collider.end);
    this.player.controls.getObject().rotation.y = spawn.angle;

    this.scene.add(this.player.controls.getObject());
    this.devTools = new DevTools(this.scene, this.player);

    this.setUpPointerLock();

    window.addEventListener("keydown", (e) => {
      if (e.code === "F4") {
        this.devTools.toggle();
      }
    });

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener("resize", this.onWindowResize);

    // Obsługa eventu startGame z formularza
    document.addEventListener("startGame", () => {
      this.startFromMenu();
    });
  }

  startFromMenu() {
    this.player.controls.lock();
  }

  getRandomSpawn() {
    return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  }

  setUpPointerLock() {
    const mainMenu = document.getElementById("main-menu");
    const uiLayer = document.getElementById("ui-layer");
    const pauseScreen = document.getElementById("pause-screen");
    const deathScreen = document.getElementById("death-screen");
    const keybindsScreen = document.getElementById("keybinds-screen");
    const playerBorder = document.getElementById("player-border");
    const nickDisplay = document.querySelector("#nick-container .player-nick");
    const nickColorBox = document.querySelector(
      "#nick-container .player-nick-color-box",
    );

    this.player.controls.addEventListener("lock", () => {
      // Przy aktywacji locka:
      if (!this.isGameActive) {
        this.isGameActive = true;
        mainMenu.style.display = "none";
        uiLayer.style.display = "block";

        // Pobierz wybrany kolor z localStorage
        const savedColor = localStorage.getItem("playerColor");
        if (savedColor) {
          this.playerColor = savedColor;
        }

        // Pobierz wybrany nick z localStorage
        const savedNick = localStorage.getItem("playerName");
        if (savedNick) {
          this.playerNick = savedNick;
        }

        // Ustaw kolor obramówki
        playerBorder.style.setProperty("--player-color", this.playerColor);
        playerBorder.classList.add("active");

        // Ustaw nick i kolor w UI
        nickDisplay.textContent = this.playerNick;
        nickColorBox.style.backgroundColor = this.playerColor;

        if (!this.socket) this.initSocket();
      }
      // Ukryj pause screen i death screen przy locku
      pauseScreen.style.display = "none";
      if (deathScreen) deathScreen.style.display = "none";
      if (keybindsScreen) keybindsScreen.style.display = "none";
    });

    this.player.controls.addEventListener("unlock", () => {
      // Pokaż pause screen tylko jeśli gracz nie jest martwy i nie ma otwartych keybinds
      if (
        this.isGameActive &&
        !this.player.healthSystem.isDead &&
        !this.chat.isActive &&
        keybindsScreen.style.display !== "flex"
      ) {
        pauseScreen.style.display = "flex";
      }
    });

    document.getElementById("resume-btn").addEventListener("click", () => {
      this.player.controls.lock();
    });

    // Keybinds button
    document.getElementById("keybinds-btn").addEventListener("click", () => {
      pauseScreen.style.display = "none";
      keybindsScreen.style.display = "flex";
    });

    // Back button w keybinds
    document.getElementById("keybinds-back-btn").addEventListener("click", () => {
      keybindsScreen.style.display = "none";
      pauseScreen.style.display = "flex";
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initSocket() {
    this.socket = io();

    // Gdy połączenie się ustanowi, wyślij swój kolor i nick
    this.socket.on("connect", () => {
      this.socket.emit("changeColor", { color: this.playerColor });
      this.socket.emit("changeNick", { nick: this.playerNick });
    });

    // Gdy wejdziemy, serwer wysyła listę obecnych graczy
    this.socket.on("currentPlayers", (players) => {
      Object.keys(players).forEach((id) => {
        if (id !== this.socket.id) {
          this.addRemotePlayer(players[id]);
        } else {
          // Ustaw pozycję gracza na spawn z serwera
          const playerData = players[id];
          const playerHeight = 1.6;
          
          this.player.collider.start.set(playerData.x, playerData.y, playerData.z);
          this.player.collider.end.set(playerData.x, playerData.y + playerHeight, playerData.z);
          this.player.camera.position.copy(this.player.collider.end);
          this.player.controls.getObject().rotation.y = playerData.rotation;
          
          this.myKills = playerData.kills || 0;
        }
      });
      this.scoreboard.update();
    });

    this.socket.on("updateKills", (data) => {
      if (data.playerId === this.socket.id) {
        this.myKills = data.kills;
      } else if (this.remotePlayers[data.playerId]) {
        this.remotePlayers[data.playerId].kills = data.kills;
      }
      this.scoreboard.update();
    });

    // Gdy ktoś nowy wejdzie
    this.socket.on("newPlayer", (playerData) => {
      this.addRemotePlayer(playerData);
      this.scoreboard.update();
    });

    // Gdy ktoś się ruszy lub zmieni kolor
    this.socket.on("updatePlayer", (playerData) => {
      if (this.remotePlayers[playerData.id]) {
        this.remotePlayers[playerData.id].updateData(playerData);
      }
    });

    // Gdy ktoś strzeli
    this.socket.on("remoteShoot", (shootData) => {
      this.projectileSystem.spawnRemoteProjectile(shootData);
    });

    // Gdy ktoś wyjdzie
    this.socket.on("deletePlayer", (id) => {
      if (this.remotePlayers[id]) {
        this.remotePlayers[id].removeFromScene(this.scene);
        delete this.remotePlayers[id];
        this.scoreboard.update();
      }
    });

    // Gdy ktoś dostanie obrażenia
    this.socket.on("playerDamaged", (damageData) => {
      console.log("playerDamaged event:", damageData);
      // Jeśli to my, zaktualizuj nasze HP
      if (damageData.targetId === this.socket.id) {
        this.player.healthSystem.currentHealth = damageData.health;
        this.player.healthSystem.updateUI();

        // Jeśli HP = 0, wywołaj śmierć
        if (damageData.health <= 0 && !this.player.healthSystem.isDead) {
          console.log("Triggering death manually from playerDamaged");
          this.player.healthSystem.isDead = true;
          this.player.healthSystem.onDeath();

          // Despawn gracza
          this.player.collider.start.set(0, -1000, 0);
          this.player.collider.end.set(0, -1000 + this.player.currentHeight, 0);
          this.player.camera.position.set(0, -1000, 0);
          this.player.velocity.set(0, 0, 0);

          // Odblokuj pointer lock
          if (this.player.controls.isLocked) {
            this.player.controls.unlock();
          }
        }
      }
    });

    // Gdy ktoś zginie
    this.socket.on("playerDied", (deathData) => {
      console.log("playerDied event:", deathData);
      if (deathData.playerId === this.socket.id) {
        // To my zginęliśmy - już obsłużone w playerDamaged
        console.log(`You were killed by player ${deathData.killerId}`);
      } else if (this.remotePlayers[deathData.playerId]) {
        // Zdalny gracz zginął - ukryj go
        console.log(`Remote player ${deathData.playerId} died`);
        this.remotePlayers[deathData.playerId].mesh.visible = false;
        this.remotePlayers[deathData.playerId].mesh.position.set(0, -1000, 0);
      }
    });

    // Gdy ktoś się respawnuje
    this.socket.on("playerRespawned", (respawnData) => {
      console.log("playerRespawned event:", respawnData);
      if (respawnData.playerId === this.socket.id) {
        // To my się respawnujemy - ustaw pozycję z serwera
        console.log("We respawned at:", respawnData.x, respawnData.y, respawnData.z, "rotation:", respawnData.rotation);
        
        const playerHeight = 1.6;
        this.player.collider.start.set(respawnData.x, respawnData.y, respawnData.z);
        this.player.collider.end.set(respawnData.x, respawnData.y + playerHeight, respawnData.z);
        this.player.camera.position.copy(this.player.collider.end);
        this.player.velocity.set(0, 0, 0);
        
        // Ustaw rotację Y (kierunek patrzenia w poziomie) z serwera
        this.player.controls.getObject().rotation.y = respawnData.rotation;
        
      } else if (this.remotePlayers[respawnData.playerId]) {
        // Zdalny gracz się respawnuje - pokaż go z powrotem
        console.log(`Remote player ${respawnData.playerId} respawned`);
        this.remotePlayers[respawnData.playerId].mesh.visible = true;
        this.remotePlayers[respawnData.playerId].teleport(
          respawnData.x,
          respawnData.y,
          respawnData.z,
        );
      }
    });

    this.chat.initNetwork(this.socket);
  }

  addRemotePlayer(data) {
    if (this.remotePlayers[data.id]) return;
    // Tworzymy obiekt RemotePlayer i zapisujemy w mapie
    this.remotePlayers[data.id] = new RemotePlayer(this.scene, data);
  }

  update(delta) {
    if (this.isGameActive) {
      this.devTools.update();
      this.projectileSystem.update(delta);

      Object.values(this.remotePlayers).forEach((remotePlayer) => {
        remotePlayer.animate(delta);
      });

      if (this.player.controls.isLocked) {
        this.player.update(delta);

        if (this.socket) {
          const now = Date.now();

          if (now - this.lastSocketUpdate > this.socketUpdateRate) {
            const pos = this.player.collider.start;
            const rot = this.camera.rotation.y;

            // Sprawdzamy, czy gracz faktycznie się ruszył lub obrócił
            // (Oszczędzamy transfer gdy stoi w miejscu)
            const hasMoved = pos.distanceTo(this.lastPosition) > 0.01;
            const hasRotated = Math.abs(rot - this.lastRotation) > 0.01;

            if (hasMoved || hasRotated) {
              this.socket.emit("playerMove", {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                rotation: rot,
              });

              // Aktualizujemy zapisane pozycje i czas
              this.lastPosition.copy(pos);
              this.lastRotation = rot;
              this.lastSocketUpdate = now;
            }
          }
        }
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}