const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

let players = { white: null, black: null }; // Track connected players

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Assign player role
    if (!players.white) {
        players.white = socket.id;
        socket.emit('playerRole', 'w');
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit('playerRole', 'b');
    } else {
        socket.emit('spectatorRole');
    }

    // Notify existing players
    io.emit('connectionStatus', 'A new player has joined.');

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (players.white === socket.id) {
            players.white = null;
        } else if (players.black === socket.id) {
            players.black = null;
        }
        io.emit('connectionStatus', 'A player has left.');
    });

    socket.on('move', (move) => {
        io.emit('move', move); // Broadcast move to all clients
    });

    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', data);
    });
});

server.listen(3000, function () {
    console.log('Server is running on port 3000...');
});
