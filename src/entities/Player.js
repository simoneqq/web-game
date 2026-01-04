import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { worldOctree } from "../core/Physics.js";

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

    // Ustawienie prędkości (ze starej wersji)
    if (keys.sprint && !keys.crouch) speed = 180.0;
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
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forwardVec.y = 0;
    forwardVec.normalize();

    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
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
    this.camera.position.copy(this.collider.end).sub(new THREE.Vector3(0, 0.1, 0));

    // Respawn (Mechanika z nowej wersji dla kapsuły)
    if (this.camera.position.y < -15) {
        this.collider.start.set(0, 0.35, 0);
        this.collider.end.set(0, 1.6, 0); // Reset do stania
        this.velocity.set(0, 0, 0);
        this.currentHeight = 1.6;
        this.camera.position.set(0, 1.6, 0);
    }
  }

  checkCollisions() {
    // Logika kolizji Octree (z nowej wersji - bez zmian)
    const result = worldOctree.capsuleIntersect(this.collider);
    
    this.onFloor = false;

    if (result) {
        this.onFloor = result.normal.y > 0;

        if (!this.onFloor) {
            // Wall Slide
            this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
        } else {
            // Lądowanie
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}