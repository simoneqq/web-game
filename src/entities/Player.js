import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { GRAVITY, worldOctree } from "../core/Physics.js";
import { StaminaSystem } from "../core/Stamina.js";
import { SlideSystem } from "../core/Slide.js";

export class Player {
  constructor(camera, domElement, projectileSystem) {
    this.camera = camera;
    this.baseFov = camera.fov;
    this.controls = new PointerLockControls(camera, domElement);
    this.projectileSystem = projectileSystem;

    // --- FIZYKA ---
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.standingHeight = 1.6;
    this.crouchHeight = 0.8;
    this.slideHeight = 0.6;
    this.currentHeight = 1.6;

    // --- KOLIZJE ---
    this.onFloor = false;
    this.collider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1.6, 0),
      0.35
    );

    // --- SYSTEMY ---
    this.staminaSystem = new StaminaSystem();
    this.slideSystem = new SlideSystem();

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
    
    let targetHeight = keys.crouch ? this.crouchHeight : this.standingHeight;
    if (this.slideSystem.isActive) {
      targetHeight = this.slideHeight;
    }

    this.currentHeight = THREE.MathUtils.lerp(
      this.currentHeight,
      targetHeight,
      delta * 12
    );

    this.camera.fov = this.baseFov + this.slideSystem.currentFovExtra;
    this.camera.updateProjectionMatrix();

    this.collider.end.y = this.collider.start.y + this.currentHeight;

    // --- 2. LOGIKA RUCHU I STANÓW ---
    const isMoving = keys.forward || keys.backward || keys.left || keys.right;

    const isTryingToSprint = keys.sprint && isMoving && this.onFloor;

    // Bieg (tylko gdy NIE kuca i NIE slajduje) - do staminy i prędkości
    const isSprinting = isTryingToSprint && !keys.crouch && !this.slideSystem.isActive;

    this.staminaSystem.update(delta, isSprinting);
    this.slideSystem.update(delta);

    if (
      keys.slide &&
      !this.slideSystem.isActive &&
      !this.slideSystem.isOnCooldown &&
      this.staminaSystem.canSprint
    ) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.camera.quaternion
      );
      forward.y = 0;
      forward.normalize();
      this.slideSystem.start(forward, 15.0);
    }

    // --- 3. PRĘDKOŚĆ ---
    let speed = 70.0;
    if (isSprinting && this.staminaSystem.canSprint) {
      speed = 100.0;
    }
    if (keys.crouch && !this.slideSystem.isActive) speed = 50.0;

    // --- 4. FIZYKA RUCHU ---
    // Tarcie
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= GRAVITY * delta;

    // Jeśli slajdujemy, ignorujemy sterowanie WASD, ale NIE nadpisujemy velocity tutaj, bo slideSystem to robi
    if (!this.slideSystem.isActive) {
      this.direction.z = Number(keys.forward) - Number(keys.backward);
      this.direction.x = Number(keys.right) - Number(keys.left);
      this.direction.normalize();

      if (keys.forward || keys.backward)
        this.velocity.z -= this.direction.z * speed * delta;
      if (keys.left || keys.right)
        this.velocity.x -= this.direction.x * speed * delta;
    }

    if (keys.jump && this.onFloor) {
      this.velocity.y = 10.0;
      this.onFloor = false;
      this.slideSystem.stop();
    }

    // --- 5. RUCH KAPSUŁY (POPRAWKA: WORLD vs LOCAL) ---
    let deltaPosition = new THREE.Vector3();

    if (this.slideSystem.isActive) {
      // Slajdowanie
      const slideVel = this.slideSystem.getVelocity(); // np. (0, 0, -200) World Space
      deltaPosition.copy(slideVel).multiplyScalar(delta);
      deltaPosition.y = this.velocity.y * delta;
    } else {
      // Chodzenie
      const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.camera.quaternion
      );
      forwardVec.y = 0;
      forwardVec.normalize();

      const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(
        this.camera.quaternion
      );
      rightVec.y = 0;
      rightVec.normalize();

      const vecX = rightVec.multiplyScalar(-this.velocity.x * delta);
      const vecZ = forwardVec.multiplyScalar(-this.velocity.z * delta);
      const vecY = new THREE.Vector3(0, this.velocity.y * delta, 0);

      deltaPosition = vecX.add(vecZ).add(vecY);
    }

    this.collider.translate(deltaPosition);

    // --- 6. KOLIZJE I KAMERA ---
    this.checkCollisions();

    this.camera.position.copy(this.collider.end).sub(new THREE.Vector3(0, 0.1, 0));

    if (this.camera.position.y < -15) {
      this.collider.start.set(0, 0.35, 0);
      this.collider.end.set(0, 1.6, 0);
      this.velocity.set(0, 0, 0);
      this.currentHeight = 1.6;
      this.camera.position.set(0, 1.6, 0);
      this.slideSystem.stop();
    }
  }

  checkCollisions() {
    const result = worldOctree.capsuleIntersect(this.collider);
    this.onFloor = false;
    if (result) {
      this.onFloor = result.normal.y > 0;
      if (!this.onFloor) {
        this.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(this.velocity)
        );
      } else {
        if (this.velocity.y < 0) this.velocity.y = 0;
      }
      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}
