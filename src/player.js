import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { keys } from "./input.js";
import { obstacleColliders, mapSize } from "./world.js";

export class Player {
    constructor(camera, domElement) {
        this.controls = new PointerLockControls(camera, domElement);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.height = 1.6;
        this.canJump = false;
    }

    update(delta) {
        if (!this.controls.isLocked) return;

        const obj = this.controls.object;

        // Opór i grawitacja
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 30.0 * delta;

        // Kierunek
        this.direction.z = Number(keys.forward) - Number(keys.backward);
        this.direction.x = Number(keys.right) - Number(keys.left);
        this.direction.normalize();

        if (keys.forward || keys.backward) this.velocity.z -= this.direction.z * 100.0 * delta;
        if (keys.left || keys.right) this.velocity.x -= this.direction.x * 100.0 * delta;

        if (keys.jump && this.canJump) {
            this.velocity.y += 10;
            this.canJump = false;
        }

        // Ruch i Kolizje (X/Z)
        const oldX = obj.position.x;
        const oldZ = obj.position.z;

        this.controls.moveForward(-this.velocity.z * delta);
        this.controls.moveRight(-this.velocity.x * delta);

        const playerBB = new THREE.Box3().setFromCenterAndSize(
            obj.position, new THREE.Vector3(0.6, 1.8, 0.6)
        );

        for (let box of obstacleColliders) {
            if (playerBB.intersectsBox(box)) {
                obj.position.x = oldX;
                obj.position.z = oldZ;
            }
        }

        // Pion (Y) i spadanie
        obj.position.y += this.velocity.y * delta;
        const halfMap = mapSize / 2;

        if (Math.abs(obj.position.x) < halfMap && Math.abs(obj.position.z) < halfMap) {
            if (obj.position.y < this.height) {
                this.velocity.y = 0;
                obj.position.y = this.height;
                this.canJump = true;
            }
        }

        if (obj.position.y < -15) {
            obj.position.set(0, this.height, 0);
            this.velocity.y = 0;
        }
    }
}