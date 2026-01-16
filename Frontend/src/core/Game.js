import { Engine } from "./Engine.js";

export class Game {
  constructor() {
    this.engine = new Engine();
    this.prevTime = performance.now();
    this.animate = this.animate.bind(this);
  }

  start() {
    this.engine.init();
    requestAnimationFrame(this.animate);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;
    this.prevTime = time;

    this.engine.update(delta);
    this.engine.render();
    
    // if (this.engine.devMode && this.engine.stats) {
    //   this.engine.stats.update();
    // } zakomentowane bo nie potrzebne CHYBA (działa bez)
  }
}