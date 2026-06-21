const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const potionsData = require('./public/potions-data.js');

// Для импорта из JS файла
const fs = require('fs');
const scriptContent = fs.readFileSync('./public/potions-data.js', 'utf8');
eval(scriptContent);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Хранилище в памяти
const rooms = {};
const players = {};

// Генерация случайного рецепта для раундов 1-3
function generateRecipe() {
    const recipe = getRandomPotion();
    return {
        name: recipe.name,
        ingredients: recipe.ingredients,
        actions: recipe.actions,
        cauldron: recipe.cauldron
    };
}

// Генерация порядка действий для раундов 4-6
function generateActionOrder() {
    return getRandomActions();
}

// Генерация случайного события для раунда 7
function generateRandomEvent() {
    return createRandomEvent();
}

// Создание новой комнаты
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
        recipe: generateRecipe(),
        actionOrder: generateActionOrder(),
        randomEvent: generateRandomEvent(),
        startTime: null,
        endTime: null,
        playerStates: {}
    };
    return roomId;
}

// Сброс состояния игрока в комнате
function resetPlayerState(roomId, playerId) {
    if (rooms[roomId] && rooms[roomId].playerStates[playerId]) {
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

// Инициализация состояния игрока
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

// Запуск игры
function startGame(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'waiting') return;
    
    room.gameState = 'playing';
    room.currentRound = 0;
    room.startTime = Date.now();
    
    // Инициализируем состояния игроков
    room.players.forEach(p => {
        initPlayerState(roomId, p.id);
        room.playerStates[p.id].ready = false;
    });
    
    startRound(roomId);
}

// Запуск раунда
function startRound(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing') return;
    
    room.currentRound++;
    
    // Проверка на завершение игры
    if (room.currentRound > 8) {
        endGame(roomId);
        return;
    }
    
    // Определяем тип раунда
    let roundType;
    let roundData = null;
    
    if (room.currentRound <= 3) {
        roundType = 'ingredients';
        // Получаем ингредиенты для выбора
        const allIngredients = getRandomIngredients(6);
        roundData = {
            ingredients: allIngredients,
            correct: room.recipe.ingredients,
            potionName: room.recipe.name
        };
        // Сбрасываем шаги игроков
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
            correct: room.actionOrder,
            currentAction: 0
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
        roundType = 'final';
        endGame(roomId);
        return;
    }
    
    room.roundType = roundType;
    room.roundData = roundData;
    room.roundStartTime = Date.now();
    
    // Отправляем данные о раунде всем в комнате
    io.to(roomId).emit('roundStart', {
        roundNumber: room.currentRound,
        roundType: roundType,
        roundData: roundData,
        timeLimit: 45
    });
    
    // Запускаем таймер на 45 секунд
    setTimeout(() => {
        endRound(roomId);
    }, 45000);
}

// Завершение раунда
function endRound(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing') return;
    
    // Проверяем, ответили ли все игроки
    const allAnswered = room.players.every(p => 
        room.playerStates[p.id]?.answered === true
    );
    
    // Если не все ответили, начисляем штраф
    if (!allAnswered) {
        room.players.forEach(p => {
            if (!room.playerStates[p.id]?.answered) {
                room.playerStates[p.id].errors += 1;
                room.playerStates[p.id].roundErrors += 1;
            }
        });
    }
    
    // Отправляем результаты раунда
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
    
    // Запускаем следующий раунд через 3 секунды
    setTimeout(() => {
        startRound(roomId);
    }, 3000);
}

// Завершение игры
function endGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    
    room.gameState = 'finished';
    room.endTime = Date.now();
    
    // Определяем победителя
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
    
    // Отправляем результаты
    const results = room.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        house: p.house,
        errors: room.playerStates[p.id]?.errors || 0,
        totalTime: room.endTime - room.startTime,
        selectedIngredients: room.playerStates[p.id]?.selectedIngredients || []
    }));
    
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

// Socket.IO
io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);
    
    // Создание комнаты
    socket.on('createRoom', (data) => {
        const roomId = createRoom();
        rooms[roomId].hostId = socket.id;
        socket.join(roomId);
        socket.emit('roomCreated', { roomId });
    });
    
    // Присоединение к комнате
    socket.on('joinRoom', (data) => {
        const { roomId, playerName, house, role } = data;
        
        if (!rooms[roomId]) {
            socket.emit('error', 'Комната не найдена');
            return;
        }
        
        const room = rooms[roomId];
        
        // Проверка на количество игроков
        if (role === 'player' && room.players.length >= 2) {
            socket.emit('error', 'Места для игроков заняты');
            return;
        }
        
        if (role === 'spectator' && room.spectators.length >= 3) {
            socket.emit('error', 'Места для наблюдателей заняты');
            return;
        }
        
        // Сохраняем игрока
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
        
        // Отправляем подтверждение
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
        
        // Если оба игрока готовы, запускаем игру
        if (role === 'player' && room.players.length === 2) {
            // Ждем 2 секунды перед стартом
            setTimeout(() => {
                if (room.gameState === 'waiting') {
                    startGame(roomId);
                }
            }, 2000);
        }
    });
    
    // Отправка действия в игре
    socket.on('gameAction', (data) => {
        const { roomId, action, step } = data;
        const room = rooms[roomId];
        
        if (!room || room.gameState !== 'playing') return;
        
        const playerState = room.playerStates[socket.id];
        if (!playerState || playerState.answered) return;
        
        // Обработка разных типов раундов
        if (room.roundType === 'ingredients') {
            handleIngredientAction(roomId, socket.id, action);
        } else if (room.roundType === 'actions') {
            handleActionAction(roomId, socket.id, action);
        } else if (room.roundType === 'event') {
            handleEventAction(roomId, socket.id, action);
        }
    });
    
    // Обработка выбора ингредиента
    function handleIngredientAction(roomId, playerId, ingredient) {
        const room = rooms[roomId];
        const playerState = room.playerStates[playerId];
        const correctRecipe = room.recipe.ingredients;
        const currentStep = playerState.currentStep;
        
        if (currentStep >= correctRecipe.length) {
            playerState.answered = true;
            return;
        }
        
        // Проверяем, не выбран ли уже этот ингредиент
        if (playerState.selectedIngredients.includes(ingredient)) {
            return;
        }
        
        // Проверяем правильность
        if (ingredient === correctRecipe[currentStep]) {
            playerState.currentStep++;
            playerState.selectedIngredients.push(ingredient);
            if (playerState.currentStep >= correctRecipe.length) {
                playerState.answered = true;
            }
        } else {
            playerState.errors++;
            playerState.roundErrors++;
            // Добавляем неправильный ингредиент в список выбранных
            playerState.selectedIngredients.push(ingredient + ' (неверно)');
        }
        
        // Отправляем обновление
        io.to(roomId).emit('playerUpdate', {
            playerId: playerId,
            progress: playerState.currentStep / correctRecipe.length,
            errors: playerState.errors,
            completed: playerState.answered,
            selectedIngredients: playerState.selectedIngredients
        });
    }
    
    // Обработка действия
    function handleActionAction(roomId, playerId, action) {
        const room = rooms[roomId];
        const playerState = room.playerStates[playerId];
        const correctOrder = room.actionOrder;
        const currentIndex = playerState.actionIndex;
        
        if (currentIndex >= correctOrder.length) {
            playerState.answered = true;
            return;
        }
        
        // Проверяем правильность действия
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
        
        // Отправляем обновление
        io.to(roomId).emit('playerUpdate', {
            playerId: playerId,
            progress: playerState.actionProgress || 0,
            errors: playerState.errors,
            completed: playerState.answered,
            actionIndex: playerState.actionIndex
        });
    }
    
    // Обработка события
    function handleEventAction(roomId, playerId, optionIndex) {
        const room = rooms[roomId];
        const playerState = room.playerStates[playerId];
        const eventData = room.roundData;
        
        if (playerState.eventAnswered) return;
        
        if (optionIndex === eventData.correct) {
            // Бонус - уменьшаем ошибки
            playerState.errors = Math.max(0, playerState.errors - 1);
            playerState.roundErrors = Math.max(0, playerState.roundErrors - 1);
        } else {
            playerState.errors++;
            playerState.roundErrors++;
        }
        
        playerState.eventAnswered = true;
        playerState.answered = true;
        
        // Отправляем обновление
        io.to(roomId).emit('playerUpdate', {
            playerId: playerId,
            progress: 1,
            errors: playerState.errors,
            completed: true,
            eventAnswered: true
        });
    }
    
    // Отключение
    socket.on('disconnect', () => {
        const playerData = players[socket.id];
        if (playerData) {
            const roomId = playerData.roomId;
            const room = rooms[roomId];
            
            if (room) {
                // Удаляем игрока
                room.players = room.players.filter(p => p.id !== socket.id);
                room.spectators = room.spectators.filter(p => p.id !== socket.id);
                delete room.playerStates[socket.id];
                
                io.to(roomId).emit('playerList', {
                    players: room.players,
                    spectators: room.spectators
                });
                
                // Если игра идет, завершаем её
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
                
                // Если комната пуста, удаляем
                if (room.players.length === 0 && room.spectators.length === 0) {
                    delete rooms[roomId];
                }
            }
            
            delete players[socket.id];
        }
    });
});

// API маршруты
app.post('/create-room', (req, res) => {
    const roomId = createRoom();
    res.json({ roomId });
});

app.get('/check-room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    res.json({ exists: !!rooms[roomId] });
});

app.post('/join-room', (req, res) => {
    const { roomId, playerName, house, role } = req.body;
    
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
            ready: state?.ready || false,
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
    
    if (!room || room.players.length === 0) {
        return res.json({ exists: false });
    }
    
    const player = room.players[0];
    res.json({
        exists: true,
        role: 'player',
        name: player.name,
        house: player.house,
        errors: room.playerStates[player.id]?.errors || 0
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🧪 Сервер Дуэли зельеваров запущен на порту ${PORT}`);
    console.log(`📊 Доступно зелий: ${POTION_RECIPES.length}`);
    console.log(`🌿 Доступно ингредиентов: ${ALL_INGREDIENTS.length}`);
});
