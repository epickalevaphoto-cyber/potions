const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// ========== ДАННЫЕ О ЗЕЛЬЯХ ==========

const ALL_INGREDIENTS = [
    { id: 'aconite', name: 'Аконит', category: 'plant', emoji: '🌿' },
    { id: 'asphodel_root', name: 'Корень асфоделя', category: 'plant', emoji: '🌱' },
    { id: 'star_anise', name: 'Бадьян', category: 'plant', emoji: '⭐' },
    { id: 'belladonna', name: 'Экстракт белладонны', category: 'plant', emoji: '🫐' },
    { id: 'bubotuber_pus', name: 'Гной бубонтюбера', category: 'plant', emoji: '💧' },
    { id: 'valerian', name: 'Валериана', category: 'plant', emoji: '🌺' },
    { id: 'seaweed', name: 'Водоросли', category: 'plant', emoji: '🌊' },
    { id: 'rowan_bark', name: 'Кора волшебной рябины', category: 'plant', emoji: '🌳' },
    { id: 'wormwood', name: 'Настойка горькой полыни', category: 'plant', emoji: '🍃' },
    { id: 'acromantula_venom', name: 'Яд акромантула', category: 'animal', emoji: '🕷️' },
    { id: 'bundle_grass', name: 'Перья болтрушайки', category: 'animal', emoji: '🪶' },
    { id: 'toad_wart', name: 'Бородавки большой пурпурной жабы', category: 'animal', emoji: '🐸' },
    { id: 'buckslang_skin', name: 'Шкура бумсланга', category: 'animal', emoji: '🐍' },
    { id: 'bundimun_slime', name: 'Слизь бундимуна', category: 'animal', emoji: '🟢' },
    { id: 'griffon_claw', name: 'Когти грифона', category: 'animal', emoji: '🦅' },
    { id: 'caterpillar', name: 'Сушёная волосатая гусеница', category: 'animal', emoji: '🐛' },
    { id: 'bezoar', name: 'Безоаровый камень', category: 'mineral', emoji: '💎' },
    { id: 'moonstone', name: 'Лунный камень', category: 'mineral', emoji: '🌙' },
    { id: 'opal', name: 'Опал', category: 'mineral', emoji: '✨' },
    { id: 'ruby', name: 'Рубин', category: 'mineral', emoji: '🔴' },
    { id: 'lethe_water', name: 'Речная вода Леты', category: 'other', emoji: '🌊' },
    { id: 'moon_dew', name: 'Лунная роса', category: 'other', emoji: '🌙' },
    { id: 'honey_water', name: 'Медовая вода', category: 'other', emoji: '🍯' },
    { id: 'phoenix_tear', name: 'Слеза феникса', category: 'other', emoji: '🔥' },
    { id: 'unicorn_blood', name: 'Кровь единорога', category: 'other', emoji: '🦄' }
];

const POTION_RECIPES = [
    {
        name: 'Мазь для мётел',
        description: 'Мазь для ухода за мётлами',
        ingredients: ['Аконит', 'Экстракт белладонны'],
        actions: ['Измельчить ингредиенты', 'Перетереть в ступке', 'Довести до однородной массы', 'Выложить в котёл', 'Варить до жёлтого цвета'],
        cauldron: 'Алюминий',
        difficulty: 'easy'
    },
    {
        name: 'Зелье для проявки фотографий',
        description: 'Проявляет магические фотографии',
        ingredients: ['Слизь бундимуна', 'Сок мурлокомля', 'Сок пиявки'],
        actions: ['Нагреть сок пиявки', 'Довести до кипения', 'Кипятить 5 минут', 'Добавить сок мурлокомля', 'Добавить слизь бундимуна', 'Настоять до розового цвета'],
        cauldron: 'Медь',
        difficulty: 'medium'
    },
    {
        name: 'Болтушка для молчунов',
        description: 'Заставляет молчаливых говорить',
        ingredients: ['Валериана', 'Аконит', 'Бадьян'],
        actions: ['Нарезать валериану', 'Довести воду до кипения', 'Добавить валериану в 3 приёма', 'Перемешивать по часовой стрелке', 'Перетереть аконит и бадьян', 'Добавить смесь в 2 приёма', 'Перемешать 3 раза по часовой и 2 раза против'],
        cauldron: 'Чугун',
        difficulty: 'hard'
    }
];

function getRandomPotion() {
    return POTION_RECIPES[Math.floor(Math.random() * POTION_RECIPES.length)];
}

function getRandomIngredients(count = 6) {
    const shuffled = [...ALL_INGREDIENTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function getRandomActions() {
    const actions = ['Нагреть', 'Добавить ингредиент', 'Перемешать', 'Остудить', 'Настоять', 'Процедить'];
    return [...actions].sort(() => Math.random() - 0.5);
}

function createRandomEvent() {
    const events = [
        {
            name: 'Перегрев котла',
            description: 'Котёл начал сильно перегреваться! Что делать?',
            options: ['Убавить огонь', 'Добавить охлаждающее зелье', 'Накрыть крышкой', 'Отойти в сторону'],
            correct: 0
        },
        {
            name: 'Странный запах',
            description: 'Из котла пошёл странный запах! Что делать?',
            options: ['Добавить мяту', 'Проверить ингредиенты', 'Выключить огонь', 'Добавить успокаивающее'],
            correct: 1
        },
        {
            name: 'Сова в окне',
            description: 'В окно влетела сова и уронила ингредиенты!',
            options: ['Напоить сову', 'Продолжить варку', 'Закрыть окно', 'Помочь сове выбраться'],
            correct: 3
        },
        {
            name: 'Зелье меняет цвет',
            description: 'Зелье внезапно изменило цвет на тёмно-зелёный!',
            options: ['Добавить краситель', 'Проверить рецепт', 'Перемешать быстрее', 'Выключить огонь'],
            correct: 1
        },
        {
            name: 'Появление пузырей',
            description: 'В котле появились большие пузыри!',
            options: ['Перемешать против часовой', 'Добавить успокаивающее', 'Уменьшить огонь', 'Добавить воды'],
            correct: 2
        }
    ];
    return events[Math.floor(Math.random() * events.length)];
}

// ========== ХРАНИЛИЩЕ ==========

const rooms = {};
const players = {};

function createRoom() {
    const roomId = uuidv4().slice(0, 8);
    rooms[roomId] = {
        id: roomId,
        players: [],
        spectators: [],
        gameState: 'waiting',
        currentRound: 0,
        roundType: null,
        roundData: null,
        roundStartTime: null,
        recipe: {
            name: getRandomPotion().name,
            ingredients: getRandomPotion().ingredients,
            actions: getRandomPotion().actions,
            cauldron: getRandomPotion().cauldron
        },
        actionOrder: getRandomActions(),
        randomEvent: createRandomEvent(),
        startTime: null,
        endTime: null,
        playerStates: {}
    };
    console.log(`✅ Комната создана: ${roomId}`);
    return roomId;
}

function initPlayerState(roomId, playerId) {
    if (!rooms[roomId]) return;
    if (!rooms[roomId].playerStates[playerId]) {
        rooms[roomId].playerStates[playerId] = {
            errors: 0,
            currentStep: 0,
            completed: false,
            roundErrors: 0,
            actionIndex: 0,
            answered: false,
            eventAnswered: false,
            selectedIngredients: [],
            actionProgress: 0
        };
    }
}

// ========== ЛОГИКА ИГРЫ ==========

function startGame(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'waiting') return;
    
    console.log(`🎮 Игра началась в комнате ${roomId}`);
    room.gameState = 'playing';
    room.currentRound = 0;
    room.startTime = Date.now();
    
    room.players.forEach(p => {
        initPlayerState(roomId, p.id);
    });
    
    startRound(roomId);
}

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing') return;
    
    room.currentRound++;
    
    if (room.currentRound > 8) {
        endGame(roomId);
        return;
    }
    
    let roundType;
    let roundData = null;
    
    if (room.currentRound <= 3) {
        roundType = 'ingredients';
        const allIngredients = getRandomIngredients(6);
        roundData = {
            ingredients: allIngredients,
            correct: room.recipe.ingredients,
            potionName: room.recipe.name
        };
        room.players.forEach(p => {
            if (room.playerStates[p.id]) {
                room.playerStates[p.id].currentStep = 0;
                room.playerStates[p.id].roundErrors = 0;
                room.playerStates[p.id].answered = false;
                room.playerStates[p.id].selectedIngredients = [];
            }
        });
    } else if (room.currentRound <= 6) {
        roundType = 'actions';
        roundData = {
            actions: ['Нагреть', 'Добавить ингредиент', 'Перемешать', 'Остудить', 'Настоять', 'Процедить'],
            correct: room.actionOrder
        };
        room.players.forEach(p => {
            if (room.playerStates[p.id]) {
                room.playerStates[p.id].actionIndex = 0;
                room.playerStates[p.id].roundErrors = 0;
                room.playerStates[p.id].answered = false;
                room.playerStates[p.id].actionProgress = 0;
            }
        });
    } else if (room.currentRound === 7) {
        roundType = 'event';
        roundData = room.randomEvent;
        room.players.forEach(p => {
            if (room.playerStates[p.id]) {
                room.playerStates[p.id].eventAnswered = false;
                room.playerStates[p.id].roundErrors = 0;
                room.playerStates[p.id].answered = false;
            }
        });
    } else if (room.currentRound === 8) {
        endGame(roomId);
        return;
    }
    
    room.roundType = roundType;
    room.roundData = roundData;
    room.roundStartTime = Date.now();
    
    console.log(`📖 Раунд ${room.currentRound} (${roundType}) в комнате ${roomId}`);
    
    io.to(roomId).emit('roundStart', {
        roundNumber: room.currentRound,
        roundType: roundType,
        roundData: roundData,
        timeLimit: 45
    });
    
    setTimeout(() => {
        endRound(roomId);
    }, 45000);
}

function endRound(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing') return;
    
    const allAnswered = room.players.every(p => 
        room.playerStates[p.id]?.answered === true
    );
    
    if (!allAnswered) {
        room.players.forEach(p => {
            if (!room.playerStates[p.id]?.answered) {
                room.playerStates[p.id].errors += 1;
                room.playerStates[p.id].roundErrors += 1;
            }
        });
    }
    
    const results = room.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        errors: room.playerStates[p.id]?.errors || 0,
        roundErrors: room.playerStates[p.id]?.roundErrors || 0,
        selectedIngredients: room.playerStates[p.id]?.selectedIngredients || []
    }));
    
    io.to(roomId).emit('roundEnd', {
        roundNumber: room.currentRound,
        results: results,
        correctAnswer: room.roundData?.correct || []
    });
    
    setTimeout(() => {
        startRound(roomId);
    }, 3000);
}

function endGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    
    room.gameState = 'finished';
    room.endTime = Date.now();
    
    let winner = null;
    let minErrors = Infinity;
    let minTime = Infinity;
    
    room.players.forEach(p => {
        const state = room.playerStates[p.id];
        if (state) {
            const totalTime = room.endTime - room.startTime;
            if (state.errors < minErrors || (state.errors === minErrors && totalTime < minTime)) {
                minErrors = state.errors;
                minTime = totalTime;
                winner = p;
            }
        }
    });
    
    const results = room.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        house: p.house,
        errors: room.playerStates[p.id]?.errors || 0,
        totalTime: room.endTime - room.startTime
    }));
    
    console.log(`🏆 Игра завершена в комнате ${roomId}, победитель: ${winner?.name || 'Ничья'}`);
    
    io.to(roomId).emit('gameEnd', {
        winner: winner ? {
            id: winner.id,
            name: winner.name,
            house: winner.house,
            errors: room.playerStates[winner.id]?.errors || 0
        } : null,
        results: results,
        potionName: room.recipe.name
    });
}

// ========== SOCKET.IO ==========

io.on('connection', (socket) => {
    console.log(`🔌 Новое подключение: ${socket.id}`);
    
    socket.on('createRoom', () => {
        const roomId = createRoom();
        rooms[roomId].hostId = socket.id;
        socket.join(roomId);
        socket.emit('roomCreated', { roomId });
        console.log(`📦 Комната ${roomId} создана пользователем ${socket.id}`);
    });
    
    socket.on('joinRoom', (data) => {
        const { roomId, playerName, house, role } = data;
        console.log(`🚪 Попытка входа в комнату ${roomId}: ${playerName} (${role})`);
        
        if (!rooms[roomId]) {
            socket.emit('error', 'Комната не найдена');
            return;
        }
        
        const room = rooms[roomId];
        
        // Проверяем, не находится ли уже игрок с таким именем в комнате
        const existingPlayer = room.players.find(p => p.name === playerName);
        if (existingPlayer) {
            socket.emit('error', 'Игрок с таким именем уже есть в комнате');
            return;
        }
        
        if (role === 'player' && room.players.length >= 2) {
            socket.emit('error', 'Места для игроков заняты');
            return;
        }
        
        if (role === 'spectator' && room.spectators.length >= 3) {
            socket.emit('error', 'Места для наблюдателей заняты');
            return;
        }
        
        const player = {
            id: socket.id,
            name: playerName,
            house: house,
            role: role
        };
        
        if (role === 'player') {
            room.players.push(player);
            initPlayerState(roomId, socket.id);
        } else {
            room.spectators.push(player);
        }
        
        players[socket.id] = {
            roomId: roomId,
            player: player
        };
        
        socket.join(roomId);
        
        socket.emit('joined', {
            roomId: roomId,
            player: player,
            gameState: room.gameState
        });
        
        // Обновляем всех в комнате
        io.to(roomId).emit('playerList', {
            players: room.players,
            spectators: room.spectators
        });
        
        console.log(`✅ ${playerName} присоединился к комнате ${roomId} (${room.players.length}/2 игроков)`);
        
        // Если оба игрока готовы, запускаем игру
        if (role === 'player' && room.players.length === 2) {
            console.log(`🎯 Оба игрока в комнате ${roomId}, запускаем игру через 2 секунды`);
            setTimeout(() => {
                if (room.gameState === 'waiting') {
                    startGame(roomId);
                }
            }, 2000);
        }
    });
    
    socket.on('gameAction', (data) => {
        const { roomId, action, step } = data;
        const room = rooms[roomId];
        
        if (!room || room.gameState !== 'playing') return;
        
        const playerState = room.playerStates[socket.id];
        if (!playerState || playerState.answered) return;
        
        if (room.roundType === 'ingredients') {
            const correctRecipe = room.recipe.ingredients;
            const currentStep = playerState.currentStep;
            
            if (currentStep >= correctRecipe.length) {
                playerState.answered = true;
                return;
            }
            
            if (playerState.selectedIngredients.includes(action)) {
                return;
            }
            
            if (action === correctRecipe[currentStep]) {
                playerState.currentStep++;
                playerState.selectedIngredients.push(action);
                if (playerState.currentStep >= correctRecipe.length) {
                    playerState.answered = true;
                }
            } else {
                playerState.errors++;
                playerState.roundErrors++;
                playerState.selectedIngredients.push(action + ' (неверно)');
            }
            
            io.to(roomId).emit('playerUpdate', {
                playerId: socket.id,
                progress: playerState.currentStep / correctRecipe.length,
                errors: playerState.errors,
                completed: playerState.answered,
                selectedIngredients: playerState.selectedIngredients
            });
        } else if (room.roundType === 'actions') {
            const correctOrder = room.actionOrder;
            const currentIndex = playerState.actionIndex;
            
            if (currentIndex >= correctOrder.length) {
                playerState.answered = true;
                return;
            }
            
            if (action === correctOrder[currentIndex]) {
                playerState.actionIndex++;
                playerState.actionProgress = playerState.actionIndex / correctOrder.length;
                if (playerState.actionIndex >= correctOrder.length) {
                    playerState.answered = true;
                }
            } else {
                playerState.errors++;
                playerState.roundErrors++;
            }
            
            io.to(roomId).emit('playerUpdate', {
                playerId: socket.id,
                progress: playerState.actionProgress || 0,
                errors: playerState.errors,
                completed: playerState.answered,
                actionIndex: playerState.actionIndex
            });
        } else if (room.roundType === 'event') {
            const eventData = room.roundData;
            
            if (playerState.eventAnswered) return;
            
            if (action === eventData.correct) {
                playerState.errors = Math.max(0, playerState.errors - 1);
                playerState.roundErrors = Math.max(0, playerState.roundErrors - 1);
            } else {
                playerState.errors++;
                playerState.roundErrors++;
            }
            
            playerState.eventAnswered = true;
            playerState.answered = true;
            
            io.to(roomId).emit('playerUpdate', {
                playerId: socket.id,
                progress: 1,
                errors: playerState.errors,
                completed: true,
                eventAnswered: true
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Отключение: ${socket.id}`);
        const playerData = players[socket.id];
        if (playerData) {
            const roomId = playerData.roomId;
            const room = rooms[roomId];
            
            if (room) {
                const playerName = playerData.player.name;
                room.players = room.players.filter(p => p.id !== socket.id);
                room.spectators = room.spectators.filter(p => p.id !== socket.id);
                delete room.playerStates[socket.id];
                
                io.to(roomId).emit('playerList', {
                    players: room.players,
                    spectators: room.spectators
                });
                
                if (room.gameState === 'playing') {
                    room.gameState = 'finished';
                    io.to(roomId).emit('gameEnd', {
                        winner: null,
                        results: room.players.map(p => ({
                            playerId: p.id,
                            playerName: p.name,
                            house: p.house,
                            errors: room.playerStates[p.id]?.errors || 0,
                            totalTime: Date.now() - room.startTime
                        }))
                    });
                }
                
                console.log(`👋 ${playerName} покинул комнату ${roomId}`);
                
                if (room.players.length === 0 && room.spectators.length === 0) {
                    delete rooms[roomId];
                    console.log(`🗑️ Комната ${roomId} удалена`);
                }
            }
            
            delete players[socket.id];
        }
    });
});

// ========== API МАРШРУТЫ ==========

app.post('/create-room', (req, res) => {
    const roomId = createRoom();
    res.json({ roomId });
});

app.get('/check-room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const exists = !!rooms[roomId];
    console.log(`🔍 Проверка комнаты ${roomId}: ${exists}`);
    res.json({ exists });
});

app.post('/join-room', (req, res) => {
    const { roomId, playerName, house, role } = req.body;
    console.log(`📝 API вход в комнату ${roomId}: ${playerName}`);
    
    if (!rooms[roomId]) {
        return res.json({ success: false, message: 'Комната не найдена' });
    }
    
    const room = rooms[roomId];
    
    if (role === 'player' && room.players.length >= 2) {
        return res.json({ success: false, message: 'Места для игроков заняты' });
    }
    
    if (role === 'spectator' && room.spectators.length >= 3) {
        return res.json({ success: false, message: 'Места для наблюдателей заняты' });
    }
    
    res.json({ 
        success: true, 
        message: 'Присоединение выполнено' 
    });
});

app.get('/room-info/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const room = rooms[roomId];
    
    if (!room) {
        return res.json({ exists: false });
    }
    
    const playerInfo = room.players.map(p => {
        const state = room.playerStates[p.id];
        return {
            name: p.name,
            house: p.house,
            errors: state?.errors || 0,
            progress: state?.currentStep !== undefined ? state.currentStep / 3 : 0,
            completed: state?.answered || false,
            selectedIngredients: state?.selectedIngredients || []
        };
    });
    
    res.json({
        exists: true,
        players: playerInfo,
        spectators: room.spectators.length,
        gameState: room.gameState,
        playerNames: room.players.map(p => p.name),
        currentRound: room.currentRound,
        potionName: room.recipe?.name || null
    });
});

app.get('/player-state/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const room = rooms[roomId];
    
    if (!room) {
        return res.json({ exists: false });
    }
    
    // Ищем игрока по socket.id из заголовков или используем первого
    // В реальном приложении нужно использовать сессии
    if (room.players.length > 0) {
        const player = room.players[0];
        res.json({
            exists: true,
            role: 'player',
            name: player.name,
            house: player.house,
            errors: room.playerStates[player.id]?.errors || 0
        });
    } else {
        res.json({
            exists: true,
            role: 'spectator',
            name: '',
            house: ''
        });
    }
});

// ========== ЗАПУСК СЕРВЕРА ==========

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🧪 Сервер Дуэли зельеваров запущен на порту ${PORT}`);
    console.log(`📊 Доступно зелий: ${POTION_RECIPES.length}`);
    console.log(`🌿 Доступно ингредиентов: ${ALL_INGREDIENTS.length}`);
});
