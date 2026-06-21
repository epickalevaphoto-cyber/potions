const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const POTIONS_DATABASE = [
    {
        id: "potion_1",
        name: "Мазь для мётел",
        requiredCauldron: "Медь",
        steps: [
            { type: "inventory", text: "Подберите инвентарь: Медный котёл" },
            { type: "slice", target: 4, ingredient: "аконит", text: "Нарезка: Нарежьте аконит на 4 равные части" },
            { type: "grind", target: 100, ingredient: "белладонна", text: "Ступка: Перетрите ягоды белладонны с аконитом в пыль" },
            { type: "pour", target: 100, mix: { "порошок": 100 }, text: "Миксер: Пересыпьте готовую массу в котёл" },
            { type: "balance", duration: 8, minZone: 70, maxZone: 90, text: "Варка: Удерживайте пламя в зоне 70-90% в течение 8 секунд" }
        ]
    },
    {
        id: "potion_2",
        name: "Зелье для проявки фотографий",
        requiredCauldron: "Серебро",
        steps: [
            { type: "inventory", text: "Подберите инвентарь: Серебряный котёл" },
            { type: "pour", target: 150, mix: { "сок пиявки": 150 }, text: "Основа: Отмерьте ровно 150 мл сока пиявки" },
            { type: "balance", duration: 10, minZone: 80, maxZone: 95, text: "Кипячение: Доведите до бурного кипения (80-95%) на 10 секунд" },
            { type: "pour", target: 250, mix: { "сок пиявки": 150, "сок мурлокомля": 100 }, text: "Смешивание: Долейте сок мурлокомля, чтобы общий объём стал 250 мл" },
            { type: "pour", target: 300, mix: { "сок пиявки": 150, "сок мурлокомля": 100, "слизь бундимуна": 50 }, text: "Финал: Добавьте 50 мл слизи бундимуна. Не перелейте!" },
            { type: "balance", duration: 6, minZone: 30, maxZone: 50, text: "Настаивание: Остудите котёл и держите тепло в зоне 30-50%" }
        ]
    },
    {
        id: "potion_3",
        name: "Болтушка для молчунов",
        requiredCauldron: "Чугун",
        steps: [
            { type: "inventory", text: "Подберите инвентарь: Чугунный котёл" },
            { type: "pour", target: 200, mix: { "речная вода": 200 }, text: "Основа: Налейте ровно 200 мл речной воды Леты" },
            { type: "balance", duration: 5, minZone: 60, maxZone: 80, text: "Подогрев: Держите температуру воды в районе 60-80%" },
            { type: "slice", target: 6, ingredient: "валериана", text: "Нарезка: Разделите веточку валерианы на 6 долек" },
            { type: "pour", target: 250, mix: { "речная вода": 200, "валериана": 50 }, text: "Добавление: Всыпьте нарезанную валериану (до отметки 250 мл)" },
            { type: "stir", target: 8, text: "Перемешивание: Сделайте ложкой 8 идеальных круговых оборотов" },
            { type: "grind", target: 100, ingredient: "бадьян", text: "Ступка: Разотрите аконит и бадьян 1:1 до состояния пудры" },
            { type: "pour", target: 300, mix: { "речная вода": 200, "валериана": 50, "пудра": 50 }, text: "Завершение: Всыпьте пудру в котёл (итоговый объём 300 мл)" }
        ]
    }
];

const rooms = {};

io.on('connection', (socket) => {
    socket.on('createRoom', ({ name, faculty }) => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomId] = { id: roomId, players: [], potion: null, status: 'waiting' };
        socket.emit('roomCreated', roomId);
    });

    socket.on('checkRoom', (roomId) => {
        socket.emit('roomExists', !!(rooms[roomId] && rooms[roomId].status === 'waiting'));
    });

    socket.on('joinRole', ({ roomId, name, faculty }) => {
        const room = rooms[roomId];
        if (!room) return;

        if (!room.players.some(p => p.id === socket.id)) {
            room.players.push({ id: socket.id, name, faculty, currentStep: 0, progress: 0 });
            socket.join(roomId);
        }

        if (room.players.length === 2 && room.status === 'waiting') {
            room.status = 'playing';
            room.potion = POTIONS_DATABASE[Math.floor(Math.random() * POTIONS_DATABASE.length)];
            io.to(roomId).emit('gameStart', { players: room.players });
            room.players.forEach(p => io.to(p.id).emit('yourPotionData', room.potion));
        }
    });

    socket.on('nextStepReady', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        player.currentStep++;
        const totalSteps = room.potion.steps.length;
        player.progress = Math.min(Math.round((player.currentStep / totalSteps) * 100), 100);

        io.to(roomId).emit('roomUpdate', room);

        if (player.currentStep >= totalSteps) {
            room.status = 'finished';
            io.to(roomId).emit('gameOver', { winner: `${player.name} (${player.faculty})` });
            delete rooms[roomId];
        }
    });

    socket.on('disconnect', () => {
        for (const id in rooms) {
            if (rooms[id].players.some(p => p.id === socket.id)) {
                io.to(id).emit('gameOver', { winner: "Соперник покинул рабочее место" });
                delete rooms[id];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
