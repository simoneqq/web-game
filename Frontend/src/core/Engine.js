import * as THREE from "three";
import { initWorld } from "../scenes/MainScene.js";
import { setupInput } from "./Controls.js";
import { Player } from "../entities/Player.js";
import { RemotePlayer } from "../entities/RemotePlayers.js";
import { DevTools } from "./DevTools.js";
import { ProjectileSystem } from "./ProjectileSystem.js";
import { loadWorld } from "../scenes/ModelScene.js";

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
    this.player = new Player(this.camera, document.body, this.projectileSystem, this);
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
    document.addEventListener('startGame', () => {
      this.startFromMenu();
    });
  }

  startFromMenu() {
    this.player.controls.lock();
  }
  
  setUpPointerLock() {
    const mainMenu = document.getElementById("main-menu");
    const uiLayer = document.getElementById("ui-layer");
    const pauseScreen = document.getElementById("pause-screen");
    const deathScreen = document.getElementById("death-screen");
    const playerBorder = document.getElementById("player-border");
    const nickDisplay = document.querySelector("#nick-container .player-nick");
    const nickColorBox = document.querySelector("#nick-container .player-nick-color-box");

    this.player.controls.addEventListener('lock', () => {
      // Przy aktywacji locka:
      if (!this.isGameActive) {
        this.isGameActive = true;
        mainMenu.style.display = "none";
        uiLayer.style.display = "block";
        
        // Pobierz wybrany kolor z localStorage
        const savedColor = localStorage.getItem('playerColor');
        if (savedColor) {
          this.playerColor = savedColor;
        }

        // Pobierz wybrany nick z localStorage
        const savedNick = localStorage.getItem('playerName');
        if (savedNick) {
          this.playerNick = savedNick;
        }
        
        // Ustaw kolor obramówki
        playerBorder.style.setProperty('--player-color', this.playerColor);
        playerBorder.classList.add('active');

        // Ustaw nick i kolor w UI
        nickDisplay.textContent = this.playerNick;
        nickColorBox.style.backgroundColor = this.playerColor;
        
        if (!this.socket) this.initSocket();
      }
      // Ukryj pause screen i death screen przy locku
      pauseScreen.style.display = "none";
      if (deathScreen) deathScreen.style.display = "none";
    });

    this.player.controls.addEventListener('unlock', () => {
      // Pokaż pause screen tylko jeśli gracz nie jest martwy
      if (this.isGameActive && !this.player.healthSystem.isDead) {
        pauseScreen.style.display = "flex";
      }
    });

    document.getElementById("resume-btn").addEventListener("click", () => {
      this.player.controls.lock();
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
        }
      });
    });
  
    // Gdy ktoś nowy wejdzie
    this.socket.on("newPlayer", (playerData) => {
      this.addRemotePlayer(playerData);
    });
  
    // Gdy ktoś się ruszy lub zmieni kolor
    this.socket.on("updatePlayer", (playerData) => {
      if (this.remotePlayers[playerData.id]) {
        this.remotePlayers[playerData.id].update(playerData);
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
        // To my się respawnujemy - już obsłużone w przycisku
        console.log("We respawned");
      } else if (this.remotePlayers[respawnData.playerId]) {
        // Zdalny gracz się respawnuje - pokaż go z powrotem
        console.log(`Remote player ${respawnData.playerId} respawned`);
        this.remotePlayers[respawnData.playerId].mesh.visible = true;
        this.remotePlayers[respawnData.playerId].update({
          x: respawnData.x,
          y: respawnData.y,
          z: respawnData.z
        });
      }
    });
  }
  
  addRemotePlayer(data) {
    // Tworzymy obiekt RemotePlayer i zapisujemy w mapie
    this.remotePlayers[data.id] = new RemotePlayer(this.scene, data);
  }
  
  update(delta) {
    if (this.isGameActive) {
      this.devTools.update();
      this.projectileSystem.update(delta);
      
      if (this.player.controls.isLocked) {
        this.player.update(delta);
        
        if (this.socket) {
          const pos = this.player.collider.start;

          this.socket.emit("playerMove", {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            rotation: this.camera.rotation.y
          });
        }
      }
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}