export class HealthSystem {
    constructor(player) {
        this.player = player; // Referencja do gracza
        this.maxHealth = 5;
        this.currentHealth = 5;
        this.isDead = false;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.invulnerabilityDuration = 1.0; // 1 sekunda nieśmiertelności po trafieniu

        // Elementy UI
        this.heartsContainer = document.getElementById('hearts-container');
        this.hearts = [];
        
        this.initUI();
    }

    initUI() {
        if (!this.heartsContainer) return;

        // Tworzę 5 serc
        for (let i = 0; i < this.maxHealth; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            this.heartsContainer.appendChild(heart);
            this.hearts.push(heart);
        }

        this.updateUI();
    }

    update(delta) {
        // Licznik nieśmiertelności po trafieniu
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= delta;
            
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
    }

    takeDamage(amount = 1) {
        if (this.isDead || this.isInvulnerable) {
            console.log("Cannot take damage - isDead:", this.isDead, "isInvulnerable:", this.isInvulnerable);
            return false;
        }

        console.log("Taking damage:", amount, "Current HP:", this.currentHealth);
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.updateUI();

        // Aktywuj nieśmiertelność po trafieniu (tylko jeśli nie zginął)
        if (this.currentHealth > 0) {
            this.isInvulnerable = true;
            this.invulnerabilityTimer = this.invulnerabilityDuration;
        }

        // Efekt wizualny - czerwone miganie ekranu
        this.showDamageEffect();

        if (this.currentHealth <= 0) {
            console.log("Player died! Triggering death...");
            this.isDead = true;
            this.onDeath();
            return true; // Zwraca true jeśli gracz zginął
        }

        return false;
    }

    heal(amount = 1) {
        if (this.isDead) return;

        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        this.updateUI();
    }

    respawn() {
        console.log("Health.respawn called");
        this.currentHealth = this.maxHealth;
        this.isDead = false;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 2.0; // 2 sekundy nieśmiertelności po respie
        this.updateUI();
        this.hideDamageEffect();
        console.log("Health reset to:", this.currentHealth, "isDead:", this.isDead);
    }

    updateUI() {
        // Aktualizacja wyświetlania serc
        this.hearts.forEach((heart, index) => {
            if (index < this.currentHealth) {
                heart.classList.remove('heart-empty');
                heart.classList.add('heart-full');
            } else {
                heart.classList.remove('heart-full');
                heart.classList.add('heart-empty');
            }
        });

        // Miganie serc gdy niskie HP
        if (this.currentHealth <= 1 && this.currentHealth > 0) {
            this.heartsContainer.classList.add('low-health');
        } else {
            this.heartsContainer.classList.remove('low-health');
        }
    }

    showDamageEffect() {
        const damageOverlay = document.getElementById('damage-overlay');
        if (damageOverlay) {
            damageOverlay.classList.add('active');
            setTimeout(() => {
                damageOverlay.classList.remove('active');
            }, 300);
        }
    }

    hideDamageEffect() {
        const damageOverlay = document.getElementById('damage-overlay');
        if (damageOverlay) {
            damageOverlay.classList.remove('active');
        }
    }

    onDeath() {
        console.log('Player died! Showing death screen...');
        
        // Pokaż ekran śmierci
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) {
            console.log('Death screen found, displaying...');
            deathScreen.style.display = 'flex';
        } else {
            console.error('Death screen not found!');
        }

        // Efekt śmierci
        const damageOverlay = document.getElementById('damage-overlay');
        if (damageOverlay) {
            damageOverlay.classList.add('death');
        }

        // Ukryj UI gry
        const playerBorder = document.getElementById('player-border');
        if (playerBorder) {
            playerBorder.classList.remove('active');
        }

        // Ukryj pause screen
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.style.display = 'none';
        }
    }

    handleRespawn() {
        console.log("handleRespawn called");
        this.respawn();
        
        // Wywołaj respawn na playerze (teleportacja i reset pozycji)
        if (this.player) {
            console.log("Calling player.respawn()");
            this.player.respawn();
        } else {
            console.error("Player reference not found in HealthSystem!");
        }
        
        // Ukryj ekran śmierci
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) {
            console.log("Hiding death screen");
            deathScreen.style.display = 'none';
        }

        // Usuń efekt śmierci
        const damageOverlay = document.getElementById('damage-overlay');
        if (damageOverlay) {
            damageOverlay.classList.remove('death');
        }

        // Pokaż UI gry
        const playerBorder = document.getElementById('player-border');
        if (playerBorder) {
            playerBorder.classList.add('active');
        }

        console.log("Respawn complete, HP:", this.currentHealth);
    }

    getHealth() {
        return this.currentHealth;
    }

    isAlive() {
        return !this.isDead;
    }

    canTakeDamage() {
        return !this.isDead && !this.isInvulnerable;
    }
}