import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { GRAVITY, worldOctree } from "../core/Physics.js";
import { StaminaSystem } from "../core/Stamina.js";

export class Player {
  constructor(camera, domElement, projectileSystem) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.projectileSystem = projectileSystem;
    
    // --- FIZYKA ---
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.standingHeight = 1.6;
    this.crouchHeight = 0.8;
    this.currentHeight = 1.6;

    // --- KOLIZJE ---
    this.onFloor = false;
    this.collider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1.6, 0),
      0.35
    );

    // --- SYSTEM STAMINY ---
    this.staminaSystem = new StaminaSystem(); 

    // --- STRZELANIE ---
    document.addEventListener("mousedown", () => {
        if (this.controls.isLocked && this.projectileSystem) {
            this.projectileSystem.shoot(this.camera);
        } else {
            this.controls.lock();
        }
    });
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    // --- 1. WYSOKOŚĆ I KUCANIE ---
    let speed = 100.0;
    const targetHeight = keys.crouch ? this.crouchHeight : this.standingHeight;

    this.currentHeight = THREE.MathUtils.lerp(
      this.currentHeight,
      targetHeight,
      delta * 10
    );

    this.collider.end.y = this.collider.start.y + this.currentHeight;

    // --- 2. LOGIKA BIEGANIA
    const isMoving = keys.forward || keys.backward || keys.left || keys.right;
    
    const isTryingToSprint = keys.sprint && isMoving && !keys.crouch && this.onFloor;

    this.staminaSystem.update(delta, isTryingToSprint);

    if (isTryingToSprint && this.staminaSystem.canSprint) {
        speed = 180.0;
    }
    if (keys.crouch) speed = 50.0;

    // --- 3. FIZYKA RUCHU ---
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= GRAVITY * delta;

    this.direction.z = Number(keys.forward) - Number(keys.backward);
    this.direction.x = Number(keys.right) - Number(keys.left);
    this.direction.normalize();

    if (keys.forward || keys.backward)
      this.velocity.z -= this.direction.z * speed * delta;
    if (keys.left || keys.right)
      this.velocity.x -= this.direction.x * speed * delta;

    if (keys.jump && this.onFloor) {
      this.velocity.y = 10.0;
      this.onFloor = false;
    }

    // --- 4. RUCH KAPSUŁY ---
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forwardVec.y = 0;
    forwardVec.normalize();

    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    rightVec.y = 0;
    rightVec.normalize();

    const vecX = rightVec.multiplyScalar(-this.velocity.x * delta);
    const vecZ = forwardVec.multiplyScalar(-this.velocity.z * delta);
    const vecY = new THREE.Vector3(0, this.velocity.y * delta, 0);

    const deltaPosition = vecX.add(vecZ).add(vecY);
    this.collider.translate(deltaPosition);

    // --- 5. KOLIZJE I KAMERA ---
    this.checkCollisions();

    this.camera.position.copy(this.collider.end).sub(new THREE.Vector3(0, 0.1, 0));

    if (this.camera.position.y < -15) {
      this.collider.start.set(0, 0.35, 0);
      this.collider.end.set(0, 1.6, 0);
      this.velocity.set(0, 0, 0);
      this.currentHeight = 1.6;
      this.camera.position.set(0, 1.6, 0);
    }
  }

  checkCollisions() {
    const result = worldOctree.capsuleIntersect(this.collider);
    this.onFloor = false;
    if (result) {
      this.onFloor = result.normal.y > 0;
      if (!this.onFloor) {
        this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
      } else {
        if (this.velocity.y < 0) this.velocity.y = 0;
      }
      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}