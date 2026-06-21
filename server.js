const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// База комнат
const rooms = {};

io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);

    // Создание комнаты
    socket.on('createRoom', ({ name, faculty }) => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString(); // Код из 4 цифр
        rooms[roomId] = {
            id: roomId,
            players: [],
            observers: [],
            status: 'waiting'
        };
        
        socket.emit('roomCreated', roomId);
    });

    // Проверка существования комнаты при присоединении
    socket.on('checkRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('roomExists', true);
        } else {
            socket.emit('roomExists', false);
        }
    });

    // Вход в роль
    socket.on('joinRole', ({ roomId, name, faculty, role }) => {
        if (!rooms[roomId]) return;

        socket.join(roomId);
        const user = { id: socket.id, name, faculty, role };

        if (role === 'player' && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(user);
        } else {
            rooms[roomId].observers.push(user);
        }

        io.to(roomId).emit('roomUpdate', rooms[roomId]);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
    });
});

http.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
