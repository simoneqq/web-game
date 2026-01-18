import * as THREE from "three";
import { initWorld } from "../scenes/MainScene.js";
import { setupInput } from "./Controls.js";
import { Player } from "../entities/Player.js";
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
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    setupInput();
    // initWorld(this.scene, this.loadingManager);
    loadWorld(this.scene);

    this.projectileSystem = new ProjectileSystem(this.scene);

    this.player = new Player(this.camera, document.body, this.projectileSystem);
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

  setUpPointerLock() {
    const pause = document.getElementById("pause-screen");
    pause.addEventListener("click", () => this.player.controls.lock());
    this.player.controls.addEventListener("lock", () => pause.style.display = "none");
    this.player.controls.addEventListener("unlock", () => pause.style.display = "flex");
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(delta) {
    this.player.update(delta);
    this.projectileSystem.update(delta);
    this.devTools.update();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}