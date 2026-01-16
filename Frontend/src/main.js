import { Game } from "./core/Game.js";

const game = new Game();

game.start();

// Wklejone ze szoponta \/
// Na początku main.js lub w odpowiednim miejscu
const socket = io();

socket.on('connect', () => {
    console.log('Połączono z serwerem:', socket.id);
});

socket.on('setId', (data) => {
    console.log('Otrzymano ID:', data.id);
});

// Wyślij inicjalizację gracza
socket.emit('init', {
    model: 'player',
    colour: 0xff0000,
    x: 0,
    y: 0,
    z: 0,
    h: 0,
    pb: 0
});

// Odbierz dane o innych graczach
socket.on('remoteData', (data) => {
    console.log('Gracze online:', data);
    // Tu aktualizuj pozycje innych graczy
});
