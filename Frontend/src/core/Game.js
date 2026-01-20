import { Engine } from "./Engine.js";

export class Game {
  constructor() {
    this.engine = new Engine();
    this.prevTime = performance.now();
    this.animate = this.animate.bind(this);
  }

  start() {
    this.engine.init();
    
    document.getElementById("start-game-btn").addEventListener("click", () => {
      this.engine.startFromMenu();
    });

    requestAnimationFrame(this.animate);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const time = performance.now();

    if (!this.engine.isGameActive) {
      this.prevTime = time;
      this.engine.render();
      return;
    }

    const delta = Math.min((time - this.prevTime) / 1000, 0.1);
    this.prevTime = time;

    this.engine.update(delta);
    this.engine.render();
  }
}