import * as THREE from "three";
import { initWorld } from "../scenes/MainScene.js";
import { setupInput } from "./Controls.js";
import { Player } from "../entities/Player.js";
import { DevTools } from "./DevTools.js"; // Importujemy nową klasę

export class Engine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.devTools = null; // Zamiast devMode i stats
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    setupInput();
    initWorld(this.scene);

    this.player = new Player(this.camera, document.body);
    this.scene.add(this.player.controls.object);

    // Inicjalizacja DevTools
    this.devTools = new DevTools(this.scene, this.player);

    this.setUpPointerLock();

    window.addEventListener("keydown", (e) => {
      if (e.code === "F4") {
        this.devTools.toggle(); // Wywołujemy metodę z nowej klasy
      }
    });

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener("resize", this.onWindowResize);
  }

  setUpPointerLock() {
    const instructions = document.getElementById("instructions");
    instructions.addEventListener("click", () => this.player.controls.lock());
    this.player.controls.addEventListener("lock", () => instructions.style.display = "none");
    this.player.controls.addEventListener("unlock", () => instructions.style.display = "block");
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(delta) {
    this.player.update(delta);
    this.devTools.update(); // Przekazujemy update do DevTools
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}