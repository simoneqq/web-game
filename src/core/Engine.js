import * as THREE from "three";
import { setupInput } from "./Controls.js";
import { initWorld } from "../scenes/MainScene.js";
import { Player } from "./Player.js";

export class Engine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    setupInput();
    initWorld(this.scene);

    this.player = new Player(this.camera, document.body);
    this.scene.add(this.player.controls.object);

    this.setUpPointerLock();
    window.addEventListener("resize", this.onWindowResize());
  }

  setUpPointerLock() {
    const instructions = document.getElementById("instructions");

    instructions.addEventListener("click", () => {
      this.player.controls.lock();
    });

    this.player.controls.addEventListener("lock", () => {
      instructions.style.display = "none";
    });

    this.player.controls.addEventListener("unlock", () => {
      instructions.style.display = "block";
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(delta) {
    this.player.update(delta);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}