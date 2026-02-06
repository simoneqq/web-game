import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { GRAVITY, worldOctree } from "../core/Physics.js";
import { StaminaSystem } from "../core/Stamina.js";
import { SlideSystem } from "../core/Slide.js";
import { HealthSystem } from "../core/Health.js";

export class Player {
  constructor(camera, domElement, projectileSystem, engine) {
    this.engine = engine;
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
      0.35,
    );

    // --- SYSTEMY ---
    this.staminaSystem = new StaminaSystem();
    this.slideSystem = new SlideSystem();
    this.healthSystem = new HealthSystem(this); // Przekazuję referencję do siebie

    // --- OBSŁUGA PRZYCISKU RESPAWN ---
    const respawnBtn = document.getElementById("respawn-btn");
    if (respawnBtn) {
      console.log("Respawn button found, adding click listener");
      respawnBtn.addEventListener("click", () => {
        console.log(
          "Respawn button clicked! isDead:",
          this.healthSystem.isDead,
        );
        if (this.healthSystem.isDead) {
          console.log("Calling handleRespawn...");
          this.healthSystem.handleRespawn();

          // Wyślij info do serwera o respawnie
          if (this.engine.socket) {
            console.log("Sending playerRespawn to server");
            this.engine.socket.emit("playerRespawn", {});
          }
        } else {
          console.log("Player is not dead, cannot respawn");
        }
      });
    } else {
      console.error("Respawn button not found!");
    }

    // --- STRZELANIE ---
    document.addEventListener("mousedown", () => {
      if (this.controls.isLocked && this.projectileSystem) {
        this.applyRecoil();
        // Najpierw strzel lokalnie
        this.projectileSystem.shoot(this.camera);

        // Potem wyślij info do serwera
        if (this.engine.socket) {
          const direction = new THREE.Vector3();
          this.camera.getWorldDirection(direction);

          this.engine.socket.emit("playerShoot", {
            pos: {
              x: this.camera.position.x,
              y: this.camera.position.y,
              z: this.camera.position.z,
            },
            dir: {
              x: direction.x,
              y: direction.y,
              z: direction.z,
            },
            color: this.engine.playerColor, // Użyj koloru z engine
          });
        }
      }
    });
  }

  applyRecoil() {
    this.recoilAmount += this.recoilStrength;
    // Ograniczenie maksymalnego odrzutu (np. max 15 stopni)
    this.recoilAmount = Math.min(this.recoilAmount, 0.25);
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    // --- 0. AKTUALIZACJA HP ---
    this.healthSystem.update(delta);

    // --- 1. WYSOKOŚĆ I KUCANIE ---

    let targetHeight = keys.crouch ? this.crouchHeight : this.standingHeight;
    if (this.slideSystem.isActive) {
      targetHeight = this.slideHeight;
    }

    this.currentHeight = THREE.MathUtils.lerp(
      this.currentHeight,
      targetHeight,
      delta * 12,
    );

    this.camera.fov = this.baseFov + this.slideSystem.currentFovExtra;
    this.camera.updateProjectionMatrix();

    this.collider.end.y = this.collider.start.y + this.currentHeight;

    // --- 2. LOGIKA RUCHU I STANÓW ---
    const isMoving = keys.forward || keys.backward || keys.left || keys.right;

    const isTryingToSprint = keys.sprint && isMoving && this.onFloor;

    // Bieg (tylko gdy NIE kuca i NIE slajduje) - do staminy i prędkości
    const isSprinting =
      isTryingToSprint && !keys.crouch && !this.slideSystem.isActive;

    this.staminaSystem.update(delta, isSprinting);
    this.slideSystem.update(delta);

    if (
      keys.slide &&
      !this.slideSystem.isActive &&
      !this.slideSystem.isOnCooldown &&
      this.staminaSystem.canSprint
    ) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.camera.quaternion,
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
        this.camera.quaternion,
      );
      forwardVec.y = 0;
      forwardVec.normalize();

      const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(
        this.camera.quaternion,
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

    this.camera.position
      .copy(this.collider.end)
      .sub(new THREE.Vector3(0, 0.1, 0));

    if (this.camera.position.y < -15) {
      this.collider.start.set(0, 0.35, 0);
      this.collider.end.set(0, 1.6, 0);
      this.velocity.set(0, 0, 0);
      this.currentHeight = 1.6;
      this.camera.position.set(0, 1.6, 0);
      this.slideSystem.stop();
    }
  }

  takeDamage(amount = 1) {
    console.log("Player.takeDamage called with amount:", amount);
    const died = this.healthSystem.takeDamage(amount);
    console.log("Health system returned died:", died);

    if (died) {
      console.log("Player died! Despawning...");
      // Natychmiast teleportuj gracza poza mapę (despawn)
      this.collider.start.set(0, -1000, 0);
      this.collider.end.set(0, -1000 + this.currentHeight, 0);
      this.camera.position.set(0, -1000, 0);
      this.velocity.set(0, 0, 0);

      console.log("Unlocking controls...");
      // Odblokuj pointer lock żeby pokazać ekran śmierci
      if (this.controls.isLocked) {
        this.controls.unlock();
      }
    }
  }

  respawn() {
    console.log("Player.respawn called - waiting for server position");
    // Pozycja będzie ustawiona przez Engine.js po otrzymaniu danych z serwera
    // Tutaj tylko resetujemy podstawowe rzeczy
    this.velocity.set(0, 0, 0);
    this.currentHeight = 1.6;
    this.slideSystem.stop();
    
    // RESET WSZYSTKICH ROTACJI KAMERY - to naprawia dziwną rotację
    this.camera.rotation.set(0, 0, 0);
    this.controls.getObject().rotation.set(0, 0, 0);

    console.log("Player respawn preparation complete - camera rotation reset");
    // Zablokuj pointer lock ponownie
    if (!this.controls.isLocked) {
      this.controls.lock();
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
          -result.normal.dot(this.velocity),
        );
      } else {
        if (this.velocity.y < 0) this.velocity.y = 0;
      }
      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}