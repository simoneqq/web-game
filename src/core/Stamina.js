const MAX_STAMINA = 100;
const STAMINA_DEPLETION_RATE = 35; // Zużycie na sekundę
const RECOVERY_RATE_BASE = 15;     // Regeneracja po wyczerpaniu
const RECOVERY_RATE_FAST = 30;     // Regeneracja normalna
const EXHAUSTION_COOLDOWN = 3.0;   // Czas kary po wyczerpaniu
const NORMAL_RECOVERY_DELAY = 1.0; // Opóźnienie regeneracji
const UNLOCK_THRESHOLD = 50.0;     // Próg odblokowania biegu

export class StaminaSystem {
    constructor() {
        this.value = MAX_STAMINA;
        this.isExhausted = false;
        this.canSprint = true;

        this.exhaustionTimer = 0;
        this.recoveryDelayTimer = 0;

        this.barElement = document.getElementById('stamina-bar');
    }
    
    update(delta, isSprinting) {
        if (this.isExhausted) {
            this.handleExhaustion(delta);
        } else {
            this.handleNormalState(delta, isSprinting);
        }

        this.updateUI();
    }

    handleExhaustion(delta) {
        // Blokada po wyczerpaniu staminy
        this.exhaustionTimer += delta;
        this.canSprint = false;

        // Start regeneracji po upływie Cooldownu
        if (this.exhaustionTimer >= EXHAUSTION_COOLDOWN) {
            this.value = Math.min(MAX_STAMINA, this.value + RECOVERY_RATE_BASE * delta);
            
            // Odblokowanie sprintu przy 50%
            if (this.value >= UNLOCK_THRESHOLD) {
                this.isExhausted = false;
                this.canSprint = true;
            }
        }
    }

    handleNormalState(delta, isSprinting) {
        if (isSprinting) {
            // Zużywanie staminy
            this.value = Math.max(0, this.value - STAMINA_DEPLETION_RATE * delta);
            this.recoveryDelayTimer = 0; // Reset timera regeneracji

            if (this.value <= 0) {
                this.isExhausted = true;
                this.exhaustionTimer = 0;
                this.canSprint = false;
            }
        } else {
            // Regeneracja
            this.recoveryDelayTimer += delta;
            if (this.recoveryDelayTimer >= NORMAL_RECOVERY_DELAY) {
                this.value = Math.min(MAX_STAMINA, this.value + RECOVERY_RATE_FAST * delta);
            }
            this.canSprint = true; // Jeśli nie biegniemy, teoretycznie możemy (chyba że exhausted)
        }
    }

    updateUI() {
        if (this.barElement) {
            this.barElement.style.width = `${this.value}%`;
            if (this.isExhausted) {
                this.barElement.classList.add('exhausted');
            } else {
                this.barElement.classList.remove('exhausted');
            }
        }
    }
}