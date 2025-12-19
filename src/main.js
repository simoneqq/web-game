import * as THREE from "three";
import { setupInput } from "./input.js";
import { initWorld } from "./world.js";
import { Player } from "./player.js";

let scene, camera, renderer, player, prevTime = performance.now();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    setupInput();
    initWorld(scene);
    
    player = new Player(camera, document.body);
    scene.add(player.controls.object);

    const instructions = document.getElementById("instructions");
    instructions.addEventListener("click", () => player.controls.lock());
    player.controls.addEventListener("lock", () => instructions.style.display = "none");
    player.controls.addEventListener("unlock", () => instructions.style.display = "block");

    window.addEventListener("resize", onWindowResize);
    
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    player.update(delta);

    prevTime = time;
    renderer.render(scene, camera);
}

init();