import * as THREE from "three";

export class SlideSystem {
    constructor() {
        this.isActive = false;
        this.isOnCooldown = false;
        this.cooldownTime = 2.0;
        this.cooldownTimer = 0;

        this.direction = new THREE.Vector3();
        this.currentSpeed = 0;
        this.distanceTraveled = 0;
        this.maxDistance = 7.5;

        this.currentFovExtra = 0;
        this.targetFovExtra = 0;

        this.uiContainer = document.getElementById('slide-cooldown-container');
        this.uiBar = document.getElementById('slide-cooldown-bar');
    }

    start(forwardDir, sprintSpeed) {
        if (this.isActive || this.isOnCooldown) return;

        this.isActive = true;
        this.direction.copy(forwardDir).setY(0).normalize();
        
        // 1. Dynamiczniejszy start: Wyższa prędkość początkowa
        this.currentSpeed = sprintSpeed * 1.5; 
        this.distanceTraveled = 0;
        this.targetFovExtra = 15;
    }

    update(delta) {
        // Logika Cooldownu
        if (this.isOnCooldown) {
            this.cooldownTimer -= delta;
            if (this.uiBar) {
                const progress = (this.cooldownTimer / this.cooldownTime) * 100;
                this.uiBar.style.width = `${Math.max(0, progress)}%`;
            }
            if (this.cooldownTimer <= 0) {
                this.isOnCooldown = false;
                if (this.uiContainer) this.uiContainer.style.display = 'none';
            }
        }

        // Powrót FOV gdy nie slajdujemy
        if (!this.isActive) {
            this.currentFovExtra = THREE.MathUtils.lerp(this.currentFovExtra, 0, delta * 8);
            return;
        }

        // 2. Płynniejszy ruch: Zamiast sztywnego dystansu, używamy tarcenia (friction)
        // To sprawia, że prędkość maleje naturalniej.
        const friction = 1.25; // Im wyższa wartość, tym szybciej gracz zatrzyma się na końcu
        this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, delta * friction);

        const moveAmount = this.currentSpeed * delta;
        this.distanceTraveled += moveAmount;

        // 3. Dynamiczne FOV: Szybsza reakcja na początku
        this.currentFovExtra = THREE.MathUtils.lerp(this.currentFovExtra, this.targetFovExtra, delta * 10);

        // Zakończ slajd jeśli prędkość spadnie poniżej progu lub przejdziemy dystans
        if (this.currentSpeed < 4.0 || this.distanceTraveled >= this.maxDistance) {
            this.stop();
        }
    }

    stop() {
        if (!this.isActive) return;
        this.isActive = false;
        this.targetFovExtra = 0;
        this.isOnCooldown = true;
        this.cooldownTimer = this.cooldownTime;
        if (this.uiContainer) this.uiContainer.style.display = 'block';
    }

    getVelocity() {
        if (!this.isActive) return new THREE.Vector3(0, 0, 0);
        return this.direction.clone().multiplyScalar(this.currentSpeed);
    }
}