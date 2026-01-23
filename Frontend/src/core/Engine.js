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

    this.projectileSystem = new ProjectileSystem(this.scene);
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
  }

  startFromMenu() {
    this.player.controls.lock();
  }
  
  setUpPointerLock() {
    const mainMenu = document.getElementById("main-menu");
    const uiLayer = document.getElementById("ui-layer");
    const pauseScreen = document.getElementById("pause-screen");
    const playerBorder = document.getElementById("player-border");

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
        
        // Ustaw kolor obramówki
        playerBorder.style.setProperty('--player-color', this.playerColor);
        playerBorder.classList.add('active');
        
        if (!this.socket) this.initSocket();
      }
      pauseScreen.style.display = "none";
    });

    this.player.controls.addEventListener('unlock', () => {
      if (this.isGameActive) pauseScreen.style.display = "flex";
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
    
    // Gdy połączenie się ustanowi, wyślij swój kolor
    this.socket.on("connect", () => {
      this.socket.emit("changeColor", { color: this.playerColor });
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