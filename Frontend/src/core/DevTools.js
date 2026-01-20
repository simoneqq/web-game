import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";

export class DevTools {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.active = false;
    
    this.stats = null;
    this.northArrow = null;
  }

  toggle() {
    this.active ? this.disable() : this.enable();
  }

  enable() {
    if (this.active) return;
    this.active = true;

    // Stats FPS
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    // Czerwona strzałka - Minusowe z = Północ w three 
    const dir = new THREE.Vector3(0, 0, -1);
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 1.5;
    this.northArrow = new THREE.ArrowHelper(dir, origin, length, 0xff0000);
    this.scene.add(this.northArrow);

    console.log("DevMode: ON");
  }

  disable() {
    if (!this.active) return;
    this.active = false;

    if (this.stats) {
      document.body.removeChild(this.stats.dom);
      this.stats = null;
    }

    if (this.northArrow) {
      this.scene.remove(this.northArrow);
      this.northArrow = null;
    }

    console.log("DevMode: OFF");
  }

  update() {
    if (!this.active) return;

    // Aktualizacja statystyk FPS
    if (this.stats) this.stats.update();

    // Aktualizacja pozycji strzałki przed oczami gracza
    if (this.northArrow && this.player && this.player.camera) {
      const playerPos = this.player.camera.position;
      const viewDir = new THREE.Vector3();
      this.player.controls.getDirection(viewDir);

      this.northArrow.position.x = playerPos.x + viewDir.x * 1.5;
      this.northArrow.position.y = playerPos.y - 0.5;
      this.northArrow.position.z = playerPos.z + viewDir.z * 1.5;
    }
  }
}