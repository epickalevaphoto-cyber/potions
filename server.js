const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// База данных магических рецептов
const POTIONS_DATABASE = [
    {
        id: "potion_1",
        name: "Мазь для мётел",
        steps: [
            { type: "grind", target: 100, text: "Шаг 1: Поместите ягоды белладонны и аконит в ступку и измельчите пестиком до однородной массы." },
            { type: "click", target: 1, text: "Шаг 2: Аккуратно переложите получившуюся массу из ступки в чистый варочный котел." },
            { type: "heat", target: 85, text: "Шаг 3: Разведите огонь под котлом. Доведите состав до высокой температуры, пока мазь не станет ярко-жёлтой." }
        ]
    },
    {
        id: "potion_2",
        name: "Зелье для проявки фотографий",
        steps: [
            { type: "click", target: 1, text: "Шаг 1: Влейте сок пиявки в котел в качестве жидкой основы." },
            { type: "heat", target: 85, text: "Шаг 2: Нагрейте котел на сильном огне и доведите сок пиявки до активного кипения." },
            { type: "timer", duration: 5, text: "Шаг 3: Поддерживайте пламя и дайте основе бурно покипеть в течение 5 секунд." },
            { type: "click", target: 1, text: "Шаг 4: Добавьте в кипящий состав сок мурлокомля." },
            { type: "timer", duration: 10, text: "Шаг 5: Сбавьте огонь, добавьте выделения бундимуна и дайте зелью настояться 10 секунд до розового цвета." }
        ]
    },
    {
        id: "potion_3",
        name: "Болтушка для молчунов",
        steps: [
            { type: "click", target: 1, text: "Шаг 1: Наполните чистый котел родниковой водой и поставьте на рабочее место." },
            { type: "heat", target: 85, text: "Шаг 2: Разогрейте котел, чтобы на поверхности воды появились первые пузыри." },
            { type: "cut", target: 9, text: "Шаг 3: Нарежьте ветви валерианы на разделочной доске (требуется сделать 9 аккуратных надрезов)." },
            { type: "click", target: 1, text: "Шаг 4: Всыпьте нарезанную валериану в закипающую воду." },
            { type: "stir", target: 6, text: "Шаг 5: Плавно помешивайте варево ложкой по часовой стрелке (сделайте 6 полных оборотов)." },
            { type: "grind", target: 100, text: "Шаг 6: Измельчите аконит и бадьян в ступке пестиком в пропорции 1:1, растерев их в мелкую пыль." },
            { type: "click", target: 1, text: "Шаг 7: Высыпьте получившийся порошок в котел для завершения алхимической реакции." }
        ]
    }
];

const rooms = {};

io.on('connection', (socket) => {
    console.log(`Маг подключился: ${socket.id}`);

    // Создание комнаты
    socket.on('createRoom', ({ name, faculty }) => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomId] = {
            id: roomId,
            players: [],
            potion: null,
            status: 'waiting'
        };
        socket.emit('roomCreated', roomId);
    });

    // Проверка существования комнаты
    socket.on('checkRoom', (roomId) => {
        if (rooms[roomId] && rooms[roomId].status === 'waiting') {
            socket.emit('roomExists', true);
        } else {
            socket.emit('roomExists', false);
        }
    });

    // Присоединение к роли дуэлянта
    socket.on('joinRole', ({ roomId, name, faculty, role }) => {
        const room = rooms[roomId];
        if (!room) return;

        // Избегаем дублирования игрока
        if (!room.players.some(p => p.id === socket.id)) {
            room.players.push({
                id: socket.id,
                name: name,
                faculty: faculty,
                currentStep: 0,
                progress: 0
            });
            socket.join(roomId);
        }

        // Если оба дуэлянта на месте — запускаем соревнование
        if (room.players.length === 2 && room.status === 'waiting') {
            room.status = 'playing';
            room.potion = POTIONS_DATABASE[Math.floor(Math.random() * POTIONS_DATABASE.length)];

            io.to(roomId).emit('gameStart', { players: room.players });
            
            // Рассылаем рецепт зелья индивидуально каждому
            room.players.forEach(p => {
                io.to(p.id).emit('yourPotionData', room.potion);
            });
        }
    });

    // Обработка выполнения шага игроком
    socket.on('nextStepReady', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        player.currentStep++;
        const totalSteps = room.potion.steps.length;
        player.progress = Math.min(Math.round((player.currentStep / totalSteps) * 100), 100);

        // Рассылаем обновление прогресса всем участникам комнаты
        io.to(roomId).emit('roomUpdate', room);

        // Проверяем, сварил ли кто-то зелье полностью
        if (player.currentStep >= totalSteps) {
            room.status = 'finished';
            io.to(roomId).emit('gameOver', { winner: `${player.name} (${player.faculty})` });
            delete rooms[roomId]; // Удаляем комнату после завершения
        }
    });

    socket.on('disconnect', () => {
        console.log(`Маг отсоединился: ${socket.id}`);
        // Очистка пустых комнат при выходе игроков
        for (const id in rooms) {
            if (rooms[id].players.some(p => p.id === socket.id)) {
                io.to(id).emit('gameOver', { winner: "Соперник покинул лабораторию" });
                delete rooms[id];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Алхимический сервер запущен на порту ${PORT}`);
});
