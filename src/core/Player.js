import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "./Controls.js";
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
