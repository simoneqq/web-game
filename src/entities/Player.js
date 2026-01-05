import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { worldOctree } from "../core/Physics.js";

// Stamina Configuration
const MAX_STAMINA = 100;
const STAMINA_DEPLETION_RATE = 35; // Per second
const RECOVERY_RATE_BASE = 15; // Post-exhaustion recovery speed
const RECOVERY_RATE_FAST = 30; // Normal recovery speed (2x base)
const EXHAUSTION_COOLDOWN = 3.0; // Seconds to wait after empty
const NORMAL_RECOVERY_DELAY = 1.0; // Seconds to wait if not empty
const UNLOCK_THRESHOLD = 50.0; // Re-enable sprint when stamina hits 50%

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);

    // --- FIZYKA I PARAMETRY (ze starej wersji) ---
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.standingHeight = 1.6;
    this.crouchHeight = 0.8;
    this.currentHeight = 1.6;

    // --- SYSTEM KOLIZJI (z nowej wersji) ---
    this.onFloor = false;
    // Kapsuła: start(dół), end(góra), radius(promień)
    this.collider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1.6, 0),
      0.35
    );

    // SYSTEM STAMINY
    this.stamina = MAX_STAMINA;
    this.isExhausted = false;
    this.exhaustionTimer = 0;
    this.recoveryDelayTimer = 0;
    this.canSprint = true;

    // UI STAMINY
    this.staminaBarElement = document.getElementById('stamina-bar');
  }

  updateStamina(delta) {
    const isMoving = keys.forward || keys.backward || keys.left || keys.right;
    const isTryingToSprint = keys.sprint && isMoving && !keys.crouch && this.onFloor;

    if (this.isExhausted) {
        // Blokada po wyczerpaniu staminy (3s delay)
        this.exhaustionTimer += delta;
        this.canSprint = false;

        // Start regeneracji po 3s od wyczerpania
        if (this.exhaustionTimer >= EXHAUSTION_COOLDOWN) {
            this.stamina = Math.min(MAX_STAMINA, this.stamina + RECOVERY_RATE_BASE * delta);
            
            // Włączenie sprintu przy 50% staminy
            if (this.stamina >= UNLOCK_THRESHOLD) {
                this.isExhausted = false;
                this.canSprint = true;
            }
        }
    } else {
        // Normalny stan
        if (isTryingToSprint) {
            // Używanie staminy
            this.stamina = Math.max(0, this.stamina - STAMINA_DEPLETION_RATE * delta);
            this.recoveryDelayTimer = 0; // Resetowanie timera regeneracji

            if (this.stamina <= 0) {
                this.isExhausted = true;
                this.exhaustionTimer = 0;
                this.canSprint = false;
            }
        } else {
            // Normalne regenerowanie staminy
            this.recoveryDelayTimer += delta;
            if (this.recoveryDelayTimer >= NORMAL_RECOVERY_DELAY) {
                this.stamina = Math.min(MAX_STAMINA, this.stamina + RECOVERY_RATE_FAST * delta);
            }
            this.canSprint = true;
        }
    }

    // Update UI
    if (this.staminaBarElement) {
        this.staminaBarElement.style.width = `${this.stamina}%`;
        if (this.isExhausted) {
            this.staminaBarElement.classList.add('exhausted');
        } else {
            this.staminaBarElement.classList.remove('exhausted');
        }
    }
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    // --- 1. WYSOKOŚĆ (Logika ze starej wersji zaadaptowana do Kapsuły) ---
    let speed = 100.0;
    const targetHeight = keys.crouch ? this.crouchHeight : this.standingHeight;

    // Płynne przejście (Lerp ze starej wersji)
    this.currentHeight = THREE.MathUtils.lerp(
      this.currentHeight,
      targetHeight,
      delta * 10
    );

    // Aktualizacja wysokości kapsuły fizycznej (zamiast obj.position.y)
    this.collider.end.y = this.collider.start.y + this.currentHeight;

    // Ustawienie prędkości (ze starej wersji + logika sprintu)
    if (keys.sprint && !keys.crouch && this.canSprint) speed = 180.0;
    if (keys.crouch) speed = 50.0;

    // --- 2. FIZYKA BAZOWA (Matematyka ruchu ze starej wersji) ---
    // Damping (opór)
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    // Grawitacja
    this.velocity.y -= 30.0 * delta;

    // Obliczanie kierunku z klawiszy
    this.direction.z = Number(keys.forward) - Number(keys.backward);
    this.direction.x = Number(keys.right) - Number(keys.left);
    this.direction.normalize();

    // Aplikowanie przyspieszenia (ze starej wersji)
    if (keys.forward || keys.backward)
      this.velocity.z -= this.direction.z * speed * delta;
    if (keys.left || keys.right)
      this.velocity.x -= this.direction.x * speed * delta;

    // Skok (Siła 10 ze starej wersji, ale warunek onFloor z nowej dla Octree)
    if (keys.jump && this.onFloor) {
      this.velocity.y = 10.0;
      this.onFloor = false;
    }

    // --- 3. KONWERSJA RUCHU NA KAPSUŁĘ ---
    // Stara wersja używała controls.moveRight/Forward (lokalny układ kamery).
    // Musimy to przeliczyć na wektor świata, aby przesunąć kapsułę.

    // Pobierz wektory kierunkowe kamery (zignoruj pochylenie Y dla ruchu pieszego)
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

    // W starej wersji: moveRight(-velocity.x), moveForward(-velocity.z)
    const vecX = rightVec.multiplyScalar(-this.velocity.x * delta);
    const vecZ = forwardVec.multiplyScalar(-this.velocity.z * delta);
    const vecY = new THREE.Vector3(0, this.velocity.y * delta, 0);

    // Sumaryczne przesunięcie
    const deltaPosition = vecX.add(vecZ).add(vecY);

    // Przesuń kapsułę
    this.collider.translate(deltaPosition);

    // --- 4. KOLIZJE I SYNC (z nowej wersji) ---
    this.checkCollisions();

    // Kamera podąża za kapsułą (oczy gracza)
    this.camera.position
      .copy(this.collider.end)
      .sub(new THREE.Vector3(0, 0.1, 0));

    // Respawn (Mechanika z nowej wersji dla kapsuły)
    if (this.camera.position.y < -15) {
      this.collider.start.set(0, 0.35, 0);
      this.collider.end.set(0, 1.6, 0); // Reset do stania
      this.velocity.set(0, 0, 0);
      this.currentHeight = 1.6;
      this.camera.position.set(0, 1.6, 0);
    }

    // 5. Logika staminy
    this.updateStamina(delta);
  }

  checkCollisions() {
    // Logika kolizji Octree (z nowej wersji - bez zmian)
    const result = worldOctree.capsuleIntersect(this.collider);

    this.onFloor = false;

    if (result) {
      this.onFloor = result.normal.y > 0;

      if (!this.onFloor) {
        // Wall Slide
        this.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(this.velocity)
        );
      } else {
        // Lądowanie
        if (this.velocity.y < 0) this.velocity.y = 0;
      }

      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}
