export class Scoreboard {
  constructor(engine) {
    this.engine = engine;
    this.container = document.getElementById("scoreboard");
    this.listElement = document.getElementById("scoreboard-list");
  }

  update() {
    const allPlayers = [];

    allPlayers.push({
      nick: this.engine.playerNick,
      kills: this.engine.myKills || 0,
      color: this.engine.playerColor,
      isMe: true,
    });

    Object.values(this.engine.remotePlayers).forEach((p) => {
      allPlayers.push({
        nick: p.nick || "Gracz",
        kills: p.kills || 0,
        color: p.color,
        isMe: false,
      });
    });

    allPlayers.sort((a, b) => b.kills - a.kills);

    this.listElement.innerHTML = "";
    allPlayers.slice(0, 10).forEach((player, index) => {
      const row = document.createElement("div");
      row.className = `score-row ${player.isMe ? "is-me" : ""}`;
      row.innerHTML = `
                <span style="opacity: 0.6">#${index + 1}</span>
                <span class="scoreboard-entry">
                    ${player.nick}
                </span>
                <span style="text-align: right;">${player.kills}</span>
            `;
      this.listElement.appendChild(row);
    });
  }
}
