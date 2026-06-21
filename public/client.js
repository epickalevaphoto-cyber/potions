const socket = io();

let currentAction = 'create';
let selectedFaculty = '';
let myRoomId = '';
let myRole = '';
let myPotion = null;
let currentStepIdx = 0;

// Игровые счетчики манипуляций
let grindCount = 0;
let cutCount = 0;
let stirRotationCount = 0;
window.heatTimeout = null;

function navigate(action) {
    currentAction = action;
    document.getElementById('screen-main').classList.remove('active');
    document.getElementById('screen-profile').classList.add('active');
    if (action === 'create') {
        document.getElementById('profile-title').innerText = 'Создание комнаты';
        document.getElementById('room-code-input-group').style.display = 'none';
    } else {
        document.getElementById('profile-title').innerText = 'Присоединение к комнате';
        document.getElementById('room-code-input-group').style.display = 'block';
    }
}

function goBack() {
    document.getElementById('screen-profile').classList.remove('active');
    document.getElementById('screen-main').classList.add('active');
}

function selectFaculty(fac) {
    selectedFaculty = fac;
    document.querySelectorAll('.fac-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
}

function submitProfile() {
    const name = document.getElementById('username').value.trim();
    if (!name || !selectedFaculty) return alert('Заполните имя и выберите факультет!');
    if (currentAction === 'create') {
        socket.emit('createRoom', { name, faculty: selectedFaculty });
    } else {
        const code = document.getElementById('room-code').value.trim();
        socket.emit('checkRoom', code);
    }
}

socket.on('roomCreated', (roomId) => { myRoomId = roomId; showRoleScreen(); });
socket.on('roomExists', (exists) => {
    if (exists) {
        myRoomId = document.getElementById('room-code').value.trim();
        showRoleScreen();
    } else { alert('Комната не найдена или уже занята!'); }
});

function showRoleScreen() {
    document.getElementById('screen-profile').classList.remove('active');
    document.getElementById('screen-role').classList.add('active');
    document.getElementById('display-room-code').innerText = myRoomId;
}

function chooseRole(role) {
    myRole = role;
    const name = document.getElementById('username').value.trim();
    socket.emit('joinRole', { roomId: myRoomId, name, faculty: selectedFaculty, role });
    document.getElementById('player-role-btn').disabled = true;
    document.getElementById('player-role-btn').innerText = 'Ожидание соперника...';
}

socket.on('gameStart', ({ players }) => {
    document.getElementById('screen-role').classList.remove('active');
    document.getElementById('screen-duel').classList.add('active');
    
    const me = players.find(p => p.id === socket.id);
    const enemy = players.find(p => p.id !== socket.id);

    if (me) document.getElementById('my-stat-name').innerText = `${me.name} (${me.faculty})`;
    if (enemy) document.getElementById('enemy-stat-name').innerText = `${enemy.name} (${enemy.faculty})`;
});

socket.on('yourPotionData', (potionData) => {
    myPotion = potionData;
    currentStepIdx = 0;
    document.getElementById('my-potion-title').innerText = `Приготовление: ${myPotion.name}`;
    loadStep();
});

// Генерация интерфейсов под типы механик
function loadStep() {
    if (!myPotion || currentStepIdx >= myPotion.steps.length) return;
    
    const step = myPotion.steps[currentStepIdx];
    document.getElementById('step-instruction').innerText = step.text;
    const zone = document.getElementById('mechanic-zone');
    zone.innerHTML = ''; 

    // Механика 1: Обычный клик (Вливание жидкостей из колбы)
    if (step.type === 'click') {
        zone.innerHTML = `
            <div style="cursor:pointer; text-align:center;" onclick="completeCurrentStep()">
                <svg width="120" height="150" viewBox="0 0 100 120">
                    <path d="M40,20 L60,20 L60,35 L75,50 A25,25 0 0,1 75,90 L25,90 A25,25 0 0,1 25,50 L40,35 Z" fill="#b58263" stroke="#5c4033" stroke-width="3"/>
                    <rect x="35" y="10" width="30" height="10" rx="3" fill="#8b5e3c" stroke="#5c4033" stroke-width="2"/>
                    <circle cx="50" cy="70" r="15" fill="#e6ccb2" opacity="0.6"/>
                    <path d="M30,75 Q50,60 70,75 L70,85 L30,85 Z" fill="#a98467"/>
                </svg>
                <p class="gold-text" style="margin-top:10px;">Нажмите на склянку, чтобы добавить ингредиент</p>
            </div>`;
    } 
    
    // Механика 2: Нарезка (Рубящие движения ножом)
    else if (step.type === 'cut') {
        cutCount = 0;
        zone.innerHTML = `
            <div style="text-align:center; position:relative; width:200px; height:200px; cursor:pointer;" onclick="triggerCut(${step.target})">
                <svg width="200" height="200" viewBox="0 0 200 200">
                    <ellipse cx="100" cy="130" rx="80" ry="30" fill="#ddbca3" stroke="#8b5e3c" stroke-width="3"/>
                    <path d="M50,120 Q100,105 150,125 Q130,140 60,135 Z" fill="#7f5539" id="root-ingredient"/>
                    <g id="svg-knife" style="transform-origin: 140px 110px; transition: transform 0.1s;">
                        <path d="M60,100 L140,110 L135,118 L70,115 Z" fill="#d6c5b3" stroke="#5c4033" stroke-width="2"/>
                        <rect x="140" y="105" width="35" height="10" rx="3" fill="#5c4033"/>
                    </g>
                </svg>
                <div style="font-weight:bold; margin-top:-20px;" id="cut-counter">Нарезано: 0 / ${step.target}</div>
            </div>`;
    } 
    
    // Механика 3: Растирание в ступке (Вращение пестика)
    else if (step.type === 'grind') {
        grindCount = 0;
        zone.innerHTML = `
            <div style="text-align:center; width:200px; height:200px; cursor:pointer;" onclick="triggerGrind(${step.target})">
                <svg width="180" height="160" viewBox="0 0 100 90">
                    <path d="M10,30 L90,30 C90,70 10,70 10,30 Z" fill="#fffdf9" stroke="#b58263" stroke-width="3"/>
                    <ellipse cx="50" cy="30" rx="40" ry="10" fill="#e6ccb2" stroke="#b58263" stroke-width="2"/>
                    <ellipse cx="50" cy="40" rx="25" ry="8" fill="#7f5539" opacity="0.3" id="grind-pile"/>
                    <g id="svg-pestle" style="transform-origin: 50px 30px; transition: transform 0.1s;">
                        <path d="M44,10 L56,10 L52,40 L48,40 Z" fill="#8b5e3c" stroke="#5c4033" stroke-width="2"/>
                        <circle cx="50" cy="42" r="6" fill="#5c4033"/>
                    </g>
                </svg>
                <div style="font-weight:bold; margin-top:10px;" id="grind-counter">Перетёрто: 0%</div>
            </div>`;
    }
    
    // Механика 4: Нагрев (Интерактивный ползунок температуры)
    else if (step.type === 'heat') {
        if (window.heatTimeout) { clearTimeout(window.heatTimeout); window.heatTimeout = null; }
        zone.innerHTML = `
            <div class="cauldron-wrapper">
                <div class="cauldron-liquid" id="liquid-element"></div>
                <svg style="position:absolute; width:70px; height:70px;" viewBox="0 0 100 100">
                    <circle cx="30" cy="40" r="6" fill="#fff" opacity="0.3"/>
                    <circle cx="70" cy="50" r="4" fill="#fff" opacity="0.4"/>
                    <circle cx="50" cy="65" r="8" fill="#fff" opacity="0.2"/>
                </svg>
            </div>
            <div class="slider-container">
                <label>Регулировка огня под котлом:</label>
                <input type="range" min="0" max="100" value="10" class="fire-slider" oninput="checkHeat(this.value)">
            </div>
            <p id="heat-status" style="margin-top:10px;">Разведите огонь под котлом (передвиньте ползунок вправо > 80)</p>`;
    }
    
    // Механика 5: Помешивание (Вращение ложки в котле)
    else if (step.type === 'stir') {
        stirRotationCount = 0;
        zone.innerHTML = `
            <div class="cauldron-wrapper" onclick="triggerStir(${step.target})">
                <div class="cauldron-liquid" style="background:#a98467;"></div>
                <svg style="position:absolute; width:100%; height:100%;" viewBox="0 0 140 140">
                    <g id="svg-spoon" style="transform-origin: 70px 70px; transition: transform 0.2s;">
                        <line x1="70" y1="70" x2="110" y2="30" stroke="#5c4033" stroke-width="5" stroke-linecap="round"/>
                        <circle cx="70" cy="70" r="10" fill="none" stroke="#5c4033" stroke-width="3"/>
                    </g>
                </svg>
            </div>
            <p id="stir-counter" style="margin-top:15px; font-weight:bold;">Круговых движений ложкой: 0 / ${step.target}</p>`;
    }
    
    // Механика 6: Песочные часы (Автоматический таймер ожидания)
    else if (step.type === 'timer') {
        let timeLeft = step.duration;
        zone.innerHTML = `
            <div style="text-align:center;">
                <svg width="80" height="110" viewBox="0 0 60 90">
                    <path d="M10,10 L50,10 L45,40 L15,40 Z" fill="#fffdf9" stroke="#5c4033" stroke-width="2"/>
                    <path d="M15,50 L45,50 L50,80 L10,80 Z" fill="#fffdf9" stroke="#5c4033" stroke-width="2"/>
                    <rect x="5" y="5" width="50" height="8" rx="2" fill="#b58263"/>
                    <rect x="5" y="77" width="50" height="8" rx="2" fill="#b58263"/>
                    <polygon points="18,15 42,15 33,38 27,38" fill="#e6ccb2"/>
                    <polygon points="28,52 32,52 45,75 15,75" fill="#e6ccb2"/>
                    <line x1="30" y1="40" x2="30" y2="52" stroke="#e6ccb2" stroke-width="2" stroke-dasharray="3,3"/>
                </svg>
                <h3 id="timer-display" style="margin-top:15px; font-family:'Lora', serif;">Настаивание: ${timeLeft} сек.</h3>
            </div>`;
            
        const interval = setInterval(() => {
            timeLeft--;
            if (document.getElementById('timer-display')) {
                document.getElementById('timer-display').innerText = `Настаивание: ${timeLeft} сек.`;
            }
            if (timeLeft <= 0) {
                clearInterval(interval);
                completeCurrentStep();
            }
        }, 1000);
    }
}

function triggerCut(target) {
    cutCount++;
    const knife = document.getElementById('svg-knife');
    if (knife) {
        knife.style.transform = "rotate(-25deg)";
        setTimeout(() => knife.style.transform = "rotate(0deg)", 70);
    }
    document.getElementById('cut-counter').innerText = `Нарезано: ${cutCount} / ${target}`;
    if (cutCount >= target) setTimeout(completeCurrentStep, 250);
}

function triggerGrind(target) {
    grindCount += 10;
    if (grindCount > 100) grindCount = 100;
    const pestle = document.getElementById('svg-pestle');
    const pile = document.getElementById('grind-pile');
    if (pestle) pestle.style.transform = `rotate(${grindCount * 3.6}deg)`;
    if (pile) pile.style.opacity = 0.3 + (grindCount / 150);
    document.getElementById('grind-counter').innerText = `Перетёрто: ${grindCount}%`;
    if (grindCount >= target) setTimeout(completeCurrentStep, 250);
}

function triggerStir(target) {
    stirRotationCount++;
    const spoon = document.getElementById('svg-spoon');
    if (spoon) spoon.style.transform = `rotate(${stirRotationCount * 60}deg)`;
    document.getElementById('stir-counter').innerText = `Круговых движений ложкой: ${stirRotationCount} / ${target}`;
    if (stirRotationCount >= target) setTimeout(completeCurrentStep, 250);
}

function checkHeat(val) {
    const liquid = document.getElementById('liquid-element');
    const status = document.getElementById('heat-status');
    if (val > 80) {
        if (liquid) {
            liquid.style.background = '#d96b43'; 
            liquid.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.3), 0 0 20px rgba(217, 107, 67, 0.6)';
        }
        if (status) status.innerText = 'Жидкость закипает... Поддерживайте огонь!';
        
        if (!window.heatTimeout) {
            window.heatTimeout = setTimeout(() => {
                window.heatTimeout = null;
                completeCurrentStep();
            }, 3000);
        }
    } else {
        if (window.heatTimeout) { clearTimeout(window.heatTimeout); window.heatTimeout = null; }
        if (liquid) { liquid.style.background = '#ccd5ae'; liquid.style.boxShadow = 'inset 0 0 15px rgba(0,0,0,0.15)'; }
        if (status) status.innerText = 'Огонь слишком слабый! Передвиньте ползунок вправо.';
    }
}

function completeCurrentStep() {
    currentStepIdx++;
    socket.emit('nextStepReady', { roomId: myRoomId });
    if (currentStepIdx < myPotion.steps.length) {
        loadStep();
    } else {
        document.getElementById('step-instruction').innerText = "Ожидайте завершения варки соперником...";
        document.getElementById('mechanic-zone').innerHTML = "<h3>Ваше зелье успешно сварено! 🧪✨</h3>";
    }
}

socket.on('roomUpdate', (room) => {
    const me = room.players.find(p => p.id === socket.id);
    const enemy = room.players.find(p => p.id !== socket.id);
    if (me) document.getElementById('my-progress-bar').style.width = `${me.progress}%`;
    if (enemy) document.getElementById('enemy-progress-bar').style.width = `${enemy.progress}%`;
});

socket.on('gameOver', ({ winner }) => {
    document.getElementById('duel-status-title').innerText = "Дуэль Завершена!";
    document.getElementById('step-instruction').innerText = `Победитель: ${winner}`;
    document.getElementById('mechanic-zone').innerHTML = `<button onclick="window.location.reload()">Вернуться в главное меню</button>`;
});
