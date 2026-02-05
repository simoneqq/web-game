export class Chat {
    constructor(engine) {
        this.engine = engine;
        this.container = document.getElementById("chat-container");
        this.messagesEnd = document.getElementById("chat-messages");
        this.input = document.getElementById("chat-input");
        this.isActive = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener("keydown", (e) => {
            if (e.code === "Enter") {
                this.toggleChat();
            }
        });
    }

    initNetwork(socket) {
        this.socket = socket;
        this.socket.on("chatMessage", (data) => {
            this.addMessage(data.author, data.text, data.color);
        });
    }

    toggleChat() {
        if (!this.engine.isGameActive) return;

        if (!this.isActive) {
            this.isActive = true;
            this.input.style.display = "block";
            this.input.focus();
            this.engine.player.controls.unlock();
        } else {
            const msg = this.input.value.trim();
            if (msg && this.socket) {
                this.socket.emit("chatMessage", msg);
            }

            this.input.value = "";
            this.input.style.display = "none";
            this.input.blur();
            this.isActive = false;
            this.engine.player.controls.lock();
        }
    }

    addMessage(author, text, color) {
        const msgEl = document.createElement("div");
        msgEl.className = "chat-message";
        msgEl.innerHTML = `<span style="color: ${color}">${author}:</span> ${text}`;
        
        this.messagesEnd.appendChild(msgEl);
        
        this.messagesEnd.scrollTop = this.messagesEnd.scrollHeight;

        if (this.messagesEnd.childNodes.length > 50) {
            this.messagesEnd.removeChild(this.messagesEnd.firstChild);
        }
    }
}