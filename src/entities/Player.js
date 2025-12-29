import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { obstacleColliders, mapSize } from "../scenes/MainScene.js";

export class Player {
  constructor(camera, domElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Parametry wysokości
    this.standingHeight = 1.6;
    this.crouchHeight = 0.8;
    this.currentHeight = 1.6;

    this.canJump = false;
    this.playerBB = new THREE.Box3();
  }

  // Pomocnicza funkcja do sprawdzania kolizji w danej pozycji (dla ruchu poziomego)
  checkCollision(pos) {
    const colliderHeight = this.currentHeight + 0.2;
    const footLevel = pos.y - this.currentHeight;
    const centerPos = new THREE.Vector3(
      pos.x,
      footLevel + colliderHeight / 2,
      pos.z
    );

    this.playerBB.setFromCenterAndSize(
      centerPos,
      new THREE.Vector3(0.6, colliderHeight, 0.6)
    );

    for (let box of obstacleColliders) {
      if (this.playerBB.intersectsBox(box)) {
        // Blokujemy ruch tylko jeśli to "ściana"
        // Czyli jeśli nasze stopy są głębiej niż "margines wchodzenia" (0.1) poniżej szczytu kostki
        if (footLevel < box.max.y - 0.1) {
          return true;
        }
      }
    }
    return false;
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    const obj = this.controls.object;

    // 1. Wysokość i Prędkość
    let speed = 100.0;
    this.targetHeight = keys.crouch ? this.crouchHeight : this.standingHeight;

    // płynne przejście z pozycji kucania do stania i odwrotnie
    const prevHeight = this.currentHeight;
    this.currentHeight = THREE.MathUtils.lerp(
      this.currentHeight,
      this.targetHeight,
      delta * 10
    );

    // korekta pozycji Y tak, aby stopy zostały na tej samej wysokości
    obj.position.y += this.currentHeight - prevHeight;
    this.targetHeight = this.standingHeight;

    if (keys.sprint && !keys.crouch) speed = 180.0;
    if (keys.crouch) speed = 50.0;

    // 2. Fizyka bazowa
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.velocity.y -= 30.0 * delta;

    this.direction.z = Number(keys.forward) - Number(keys.backward);
    this.direction.x = Number(keys.right) - Number(keys.left);
    this.direction.normalize();

    if (keys.forward || keys.backward)
      this.velocity.z -= this.direction.z * speed * delta;
    if (keys.left || keys.right)
      this.velocity.x -= this.direction.x * speed * delta;

    if (keys.jump && this.canJump) {
      this.velocity.y += 10;
      this.canJump = false;
    }

    // 3. RUCH POZIOMY (SLIDING)
    // To działa dobrze: próba ruchu, sprawdzenie kolizji, cofnięcie jeśli ściana.
    const oldPos = obj.position.clone();

    const rightAmount = -this.velocity.x * delta;
    this.controls.moveRight(rightAmount);

    if (this.checkCollision(obj.position)) {
      obj.position.copy(oldPos);
    }

    const oldPos2 = obj.position.clone();

    const forwardAmount = -this.velocity.z * delta;
    this.controls.moveForward(forwardAmount);

    if (this.checkCollision(obj.position)) {
      obj.position.copy(oldPos2);
    }

    // 4. RUCH PIONOWY I STANIE NA KOSTKACH
    obj.position.y += this.velocity.y * delta;

    let onObject = false;
    const footLevel = obj.position.y - this.currentHeight;

    this.playerBB.setFromCenterAndSize(
      new THREE.Vector3(
        obj.position.x,
        footLevel + (this.currentHeight + 0.2) / 2,
        obj.position.z
      ),
      new THREE.Vector3(0.6, this.currentHeight + 0.2, 0.6)
    );

    // Maksymalna wysokość, na jaką gracz wejdzie automatycznie (bez skoku)
    // Jeśli kostka jest wyższa (np. 1.0) niż ten próg względem stóp, traktujemy ją jak ścianę.
    const maxStepHeight = 0.5;

    for (let box of obstacleColliders) {
      if (this.playerBB.intersectsBox(box)) {
        // FIX: Sprawdzamy czy lądujemy NA GÓRZE
        // Warunek: Spadamy (velocity <= 0) ORAZ nasze stopy są blisko szczytu kostki.
        // Wcześniej sprawdzałeś box.min.y (dół kostki), co powodowało wciąganie gracza na górę.
        if (this.velocity.y <= 0 && footLevel >= box.max.y - maxStepHeight) {
          obj.position.y = box.max.y + this.currentHeight;
          this.velocity.y = 0;
          this.canJump = true;
          onObject = true;
          break;
        }
        // Opcjonalnie: uderzenie głową w sufit (jeśli skaczemy w górę)
        else if (this.velocity.y > 0 && footLevel < box.min.y) {
          this.velocity.y = 0;
        }
      }
    }

    // 5. PODŁOGA MAPY
    const halfMap = mapSize / 2;
    if (
      !onObject &&
      Math.abs(obj.position.x) < halfMap &&
      Math.abs(obj.position.z) < halfMap
    ) {
      if (obj.position.y < this.currentHeight) {
        this.velocity.y = 0;
        obj.position.y = this.currentHeight;
        this.canJump = true;
      }
    }

    // Respawn
    if (obj.position.y < -15) {
      obj.position.set(0, this.standingHeight, 0);
      this.velocity.y = 0;
    }
  }
}

/*
import * as THREE from "three";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "../core/Controls.js";
import { worldOctree } from "../core/Physics.js"; // Upewnij się, że ścieżka jest poprawna

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    
    // Fizyka
    this.velocity = new THREE.Vector3();
    this.onFloor = false;

    // Kapsuła kolizji (zamiast Box3)
    // start: dół kapsuły, end: góra kapsuły, radius: promień
    this.collider = new Capsule(
        new THREE.Vector3(0, 0.35, 0), 
        new THREE.Vector3(0, 1.6, 0), 
        0.35
    );

    // Parametry wysokości (zachowane z Twojego kodu)
    this.standingHeight = 1.6;
    this.crouchHeight = 0.8;
    this.currentHeight = 1.6;
    
    // Parametry ruchu (zachowane z Twojego kodu)
    this.speed = 100.0;
    this.runSpeed = 180.0;
    this.crouchSpeed = 50.0;
    this.jumpForce = 15.0; // Lekka korekta dla fizyki wektorowej
    this.damping = 10.0;   // Siła hamowania
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    // 1. Obsługa Kucania (Wysokość Kapsuły)
    const targetHeight = keys.crouch ? this.crouchHeight : this.standingHeight;
    
    // Płynna zmiana wysokości (Lerp)
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, delta * 10);
    
    // Aktualizacja wysokości kapsuły fizycznej
    // Dół jest zawsze na 0.35 (promień), góra się zmienia
    this.collider.end.y = this.collider.start.y + this.currentHeight;

    // 2. Logika Prędkości (Input)
    let moveSpeed = this.speed;
    if (keys.sprint && !keys.crouch) moveSpeed = this.runSpeed;
    if (keys.crouch) moveSpeed = this.crouchSpeed;

    // Hamowanie (Damping) - tak jak w Twoim kodzie
    // Aplikujemy opór powietrza dla osi X i Z
    this.velocity.x -= this.velocity.x * this.damping * delta;
    this.velocity.z -= this.velocity.z * this.damping * delta;

    // Grawitacja
    if (!this.onFloor) {
        this.velocity.y -= 30.0 * delta;
    }

    // 3. Obliczanie wektora ruchu na podstawie patrzenia kamery
    // To zastępuje controls.moveForward/moveRight
    if (this.onFloor) {
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.camera.rotation);
        right.y = 0;
        right.normalize();

        const inputVector = new THREE.Vector3();
        
        if (keys.forward) inputVector.add(forward);
        if (keys.backward) inputVector.sub(forward);
        if (keys.right) inputVector.add(right);
        if (keys.left) inputVector.sub(right);
        
        // Jeśli jest input, dodajemy przyspieszenie
        if (inputVector.lengthSq() > 0) {
            inputVector.normalize();
            this.velocity.add(inputVector.multiplyScalar(moveSpeed * delta));
        }
        
        // Skok
        if (keys.jump) {
            this.velocity.y = this.jumpForce;
            this.onFloor = false; // Odrywamy się od ziemi
        }
    }

    // 4. Aplikowanie ruchu do Kapsuły
    const deltaPosition = this.velocity.clone().multiplyScalar(delta);
    this.collider.translate(deltaPosition);

    // 5. Sprawdzanie Kolizji (Octree)
    this.checkCollisions();

    // 6. Synchronizacja Kamery z Kapsułą
    // Kamera jest "oczami", więc ustawiamy ją na górze kapsuły minus mały margines
    this.camera.position.copy(this.collider.end).sub(new THREE.Vector3(0, 0.1, 0));

    // Respawn (Teleportacja jak spadniesz)
    if (this.camera.position.y < -15) {
        this.collider.start.set(0, 0.35, 0);
        this.collider.end.set(0, this.standingHeight, 0);
        this.velocity.set(0, 0, 0);
        this.camera.position.set(0, this.standingHeight, 0);
    }
  }

  checkCollisions() {
    // To jest serce nowego systemu - jedna linijka zamiast pętli po boxach
    const result = worldOctree.capsuleIntersect(this.collider);
    
    this.onFloor = false;

    if (result) {
        // Czy to, w co uderzyliśmy, jest podłogą? (normalna skierowana w górę)
        this.onFloor = result.normal.y > 0;

        if (!this.onFloor) {
            // Ślizganie po ścianach (Wall Slide)
            // Usuwamy część prędkości skierowaną w ścianę
            this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
        } else {
            // Lądowanie na ziemi
            // Jeśli spadaliśmy, zerujemy prędkość pionową
            if (this.velocity.y < 0) this.velocity.y = 0;
        }

        // Wypchnięcie gracza z obiektu o głębokość kolizji
        this.collider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
}
*/
