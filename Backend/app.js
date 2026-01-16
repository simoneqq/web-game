const express = require('express');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Ścieżka do folderu Frontend
const frontendPath = path.join(__dirname, '../Frontend');

// Middleware do debugowania - pokaż jakie pliki są żądane
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    next();
});

// WAŻNE: Serwuj node_modules z folderu Frontend (jeśli istnieje)
// lub z głównego folderu projektu
const nodeModulesPath = path.join(frontendPath, 'node_modules');
const fs = require('fs');
if (fs.existsSync(nodeModulesPath)) {
    app.use('/node_modules', express.static(nodeModulesPath));
    console.log('Serving node_modules from Frontend folder');
} else {
    // Jeśli nie ma w Frontend, spróbuj z głównego folderu
    const rootNodeModules = path.join(__dirname, '../node_modules');
    if (fs.existsSync(rootNodeModules)) {
        app.use('/node_modules', express.static(rootNodeModules));
        console.log('Serving node_modules from root folder');
    } else {
        console.error('WARNING: node_modules not found!');
    }
}

// WAŻNE: Serwuj cały folder Frontend jako statyczny
// To pozwoli na załadowanie wszystkich plików (js, css, modele, tekstury, itp.)
app.use(express.static(frontendPath));

// Główna trasa - zwraca index.html
app.get('/', function(req, res) {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Socket.io - obsługa graczy
io.sockets.on('connection', function(socket){
    socket.userData = { x:0, y:0, z:0, heading:0 }; // Domyślne wartości
 
    console.log(`${socket.id} connected`);
    socket.emit('setId', { id:socket.id });
	
    socket.on('disconnect', function(){
        socket.broadcast.emit('deletePlayer', { id: socket.id });
        console.log(`${socket.id} disconnected`);
    });	
	
    socket.on('init', function(data){
        console.log(`socket.init ${data.model}`);
        socket.userData.model = data.model;
        socket.userData.colour = data.colour;
        socket.userData.x = data.x;
        socket.userData.y = data.y;
        socket.userData.z = data.z;
        socket.userData.heading = data.h;
        socket.userData.pb = data.pb;
        socket.userData.action = "Idle";
    });
	
    socket.on('update', function(data){
        socket.userData.x = data.x;
        socket.userData.y = data.y;
        socket.userData.z = data.z;
        socket.userData.heading = data.h;
        socket.userData.pb = data.pb;
        socket.userData.action = data.action;
    });
	
    socket.on('chat message', function(data){
        console.log(`chat message:${data.id} ${data.message}`);
        io.to(data.id).emit('chat message', { id: socket.id, message: data.message });
    });
});

// Uruchom serwer
const PORT = process.env.PORT || 2002;
http.listen(PORT, function(){
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Frontend path: ${frontendPath}`);
});

// Wysyłaj dane o graczach co 40ms (25 razy na sekundę)
setInterval(function(){
    const nsp = io.of('/');
    let pack = [];
	
    for(let id in io.sockets.sockets){
        const socket = nsp.connected[id];
        // Wysyłaj tylko zainicjalizowane sockety
        if (socket && socket.userData && socket.userData.model !== undefined){
            pack.push({
                id: socket.id,
                model: socket.userData.model,
                colour: socket.userData.colour,
                x: socket.userData.x,
                y: socket.userData.y,
                z: socket.userData.z,
                heading: socket.userData.heading,
                pb: socket.userData.pb,
                action: socket.userData.action
            });    
        }
    }
    if (pack.length > 0) io.emit('remoteData', pack);
}, 40);