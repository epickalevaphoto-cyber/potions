const socket = io();

let currentAction = 'create';
let selectedFaculty = '';
let myRoomId = '';
let myPotion = null;
let currentStepIdx = 0;

// Игровые переменные для симулятора
let balanceProgress = 0;
let pointerPos = 50;
let pointerVelocity = 0;
let isSpacePressed = false;
let balanceLoopId = null;

let currentLiquidLevel = 0;
let pourInterval = null;

let slicePoints = [];
let currentStirAngle = 0;
let totalStirRotations = 0;
let lastStirAngle = null;

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
    if (!name || !selectedFaculty) return alert('Заполните данные!');
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
    } else { alert('Комната не существует!'); }
});

function showRoleScreen() {
    document.getElementById('screen-profile').classList.remove('active');
    document.getElementById('screen-role').classList.add('active');
    document.getElementById('display-room-code').innerText = myRoomId;
}

function chooseRole() {
    const name = document.getElementById('username').value.trim();
    socket.emit('joinRole', { roomId: myRoomId, name, faculty: selectedFaculty });
    document.getElementById('player-role-btn').disabled = true;
    document.getElementById('player-role-btn').innerText = 'Готовность записана...';
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
    document.getElementById('my-potion-title').innerText = myPotion.name;
    loadStep();
});

// Слушатели клавиатуры для удержания огня пробелом
window.addEventListener('keydown', (e) => { if (e.code === 'Space') { isSpacePressed = true; e.preventDefault(); } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') isSpacePressed = false; });

function loadStep() {
    if (balanceLoopId) { cancelAnimationFrame(balanceLoopId); balanceLoopId = null; }
    if (!myPotion || currentStepIdx >= myPotion.steps.length) return;

    const step = myPotion.steps[currentStepIdx];
    document.getElementById('step-instruction').innerText = step.text;
    const zone = document.getElementById('mechanic-zone');
    zone.innerHTML = '';

    // МЕХАНИКА 1: Выбор инвентаря (Геншин-стиль)
    if (step.type === 'inventory') {
        zone.innerHTML = `
            <div class="inventory-grid">
                <div class="inv-item" onclick="selectCauldron('Алюминий')"><svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="20" fill="#b0bec5"/><rect x="15" y="10" width="30" height="5" fill="#78909c"/></svg><span>Алюминий</span></div>
                <div class="inv-item" onclick="selectCauldron('Медь')"><svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="20" fill="#d84315"/><rect x="15" y="10" width="30" height="5" fill="#bf360c"/></svg><span>Медь</span></div>
                <div class="inv-item" onclick="selectCauldron('Чугун')"><svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="20" fill="#37474f"/><rect x="15" y="10" width="30" height="5" fill="#212121"/></svg><span>Чугун</span></div>
                <div class="inv-item" onclick="selectCauldron('Серебро')"><svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="20" fill="#e0e0e0"/><rect x="15" y="10" width="30" height="5" fill="#bdbdbd"/></svg><span>Серебро</span></div>
            </div>`;
    }

    // МЕХАНИКА 2: Нарезка ингредиентов по координатам клика (Геншин-стиль)
    else if (step.type === 'slice') {
        slicePoints = [];
        zone.innerHTML = `
            <div class="slice-board" onclick="handleSlice(event, ${step.target})">
                <svg width="100%" height="100%" viewBox="0 0 300 180" id="board-svg">
                    <rect x="10" y="10" width="280" height="160" rx="10" fill="#d7ccc8" stroke="#8d6e63" stroke-width="4"/>
                    <rect x="60" y="80" width="180" height="30" rx="5" fill="#a1887f" id="ing-body"/>
                </svg>
                <div id="slice-counter" style="position:absolute; bottom:10px; font-weight:bold;">Нарезов: 0 / ${step.target}</div>
            </div>`;
    }

    // МЕХАНИКА 3: Измельчение в ступке (Зажатие и трение)
    else if (step.type === 'grind') {
        let isGrinding = false;
        grindCount = 0;
        zone.innerHTML = `
            <div class="mortar-zone" onmousedown="isGrinding=true" onmouseup="isGrinding=false" onmouseleave="isGrinding=false" onmousemove="handleGrind(event, isGrinding, ${step.target})">
                <svg width="160" height="160" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="#cfd8dc" stroke="#90a4ae" stroke-width="4"/>
                    <circle cx="50" cy="50" r="30" fill="#b0bec5"/>
                    <circle cx="50" cy="50" r="10" fill="#546e7a" id="pestle-node"/>
                </svg>
                <div style="font-weight:bold; margin-top:10px;" id="grind-progress">Растирание: 0%</div>
            </div>`;
    }

    // МЕХАНИКА 4: Наполнение мензурки (Игра "Бармен")
    else if (step.type === 'pour') {
        currentLiquidLevel = 0;
        zone.innerHTML = `
            <div class="pour-container">
                <div class="beaker">
                    <div class="beaker-liquid" id="beaker-liquid-fill"></div>
                    <div class="target-line" style="bottom: ${ (step.target / 400) * 100 }%;"></div>
                </div>
                <button class="pour-btn" onmousedown="startPourING()" onmouseup="stopPourING(${step.target})" onmouseleave="stopPourING(${step.target})">НАЛИВАТЬ</button>
                <div style="margin-top:10px; font-weight:bold;" id="pour-debug">Объём: 0 мл / ${step.target} мл</div>
            </div>`;
    }

    // МЕХАНИКА 5: Удержание баланса температуры пробелом (Рыбалка в Геншине)
    else if (step.type === 'balance') {
        balanceProgress = 0;
        pointerPos = 20;
        pointerVelocity = 0;
        zone.innerHTML = `
            <div class="fishing-bar">
                <div class="target-zone" style="left: ${step.minZone}%; width: ${step.maxZone - step.minZone}%;"></div>
                <div class="pointer" id="balance-pointer" style="left: ${pointerPos}%;"></div>
            </div>
            <div class="progress-bar-container" style="width:80%; margin-top:15px; height:10px;">
                <div class="progress-fill" id="balance-progress-fill" style="width:0%; background:#4caf50;"></div>
            </div>
            <p style="font-size:0.85rem; color:#795548; font-style:italic; margin-top:5px;">Зажмите [ПРОБЕЛ] для подъёма индикатора, отпустите для спуска</p>`;
        initBalanceLoop(step.minZone, step.maxZone, step.duration);
    }

    // МЕХАНИКА 6: Круговое перемешивание ложкой
    else if (step.type === 'stir') {
        totalStirRotations = 0;
        currentStirAngle = 0;
        lastStirAngle = null;
        zone.innerHTML = `
            <div class="stir-zone" onmousedown="initStirTrack(event)" onmousemove="trackStir(event, ${step.target})">
                <div class="cauldron-liquid" style="width:140px; height:140px; background:#8d6e63; position:relative; border-radius:50%;">
                    <div id="spoon-handle" style="position:absolute; width:6px; height:60px; background:#5d4037; top:10px; left:67px; transform-origin: 3px 60px;"></div>
                </div>
                <div style="font-weight:bold; margin-top:15px;" id="stir-info">Обороты ложки: 0 / ${step.target}</div>
            </div>`;
    }
}

function selectCauldron(name) {
    if (myPotion && myPotion.requiredCauldron === name) {
        completeCurrentStep();
    } else {
        alert("Неверный тип котла! Зелье будет испорчено. Сверьтесь со справочником.");
    }
}

function handleSlice(e, target) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svg = document.getElementById('board-svg');
    
    slicePoints.push(x);
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x); line.setAttribute("y1", "20");
    line.setAttribute("x2", x); line.setAttribute("y2", "160");
    line.setAttribute("stroke", "#3e2723"); line.setAttribute("stroke-width", "3");
    svg.appendChild(line);

    document.getElementById('slice-counter').innerText = `Нарезов: ${slicePoints.length} / ${target}`;
    if (slicePoints.length >= target) setTimeout(completeCurrentStep, 300);
}

function handleGrind(e, canGrind, target) {
    if (!canGrind) return;
    grindCount += 0.5;
    const node = document.getElementById('pestle-node');
    if (node) {
        node.setAttribute("cx", 50 + Math.sin(grindCount) * 15);
        node.setAttribute("cy", 50 + Math.cos(grindCount) * 15);
    }
    const pct = Math.min(Math.round((grindCount / target) * 100), 100);
    document.getElementById('grind-progress').innerText = `Растирание: ${pct}%`;
    if (pct >= 100) { canGrind = false; setTimeout(completeCurrentStep, 300); }
}

function startPourING() {
    pourInterval = setInterval(() => {
        if (currentLiquidLevel < 400) {
            currentLiquidLevel += 3;
            document.getElementById('beaker-liquid-fill').style.height = `${(currentLiquidLevel / 400) * 100}%`;
            document.getElementById('pour-debug').innerText = `Объём: ${currentLiquidLevel} мл`;
        }
    }, 30);
}

function stopPourING(target) {
    clearInterval(pourInterval);
    if (Math.abs(currentLiquidLevel - target) <= 15) {
        completeCurrentStep();
    } else {
        alert(`Ошибка дозировки! Вы налили ${currentLiquidLevel} мл вместо ${target} мл. Попробуйте аккуратнее.`);
        currentLiquidLevel = 0;
        document.getElementById('beaker-liquid-fill').style.height = `0%`;
        document.getElementById('pour-debug').innerText = `Объём: 0 мл / ${target} мл`;
    }
}

function initBalanceLoop(min, max, duration) {
    const totalFrames = duration * 60;
    let successFrames = 0;

    function update() {
        if (isSpacePressed) { pointerVelocity += 0.4; } else { pointerVelocity -= 0.3; }
        pointerVelocity *= 0.95;
        pointerPos += pointerVelocity;

        if (pointerPos < 0) { pointerPos = 0; pointerVelocity = 0; }
        if (pointerPos > 100) { pointerPos = 100; pointerVelocity = 0; }

        const ptr = document.getElementById('balance-pointer');
        if (ptr) ptr.style.left = `${pointerPos}%`;

        if (pointerPos >= min && pointerPos <= max) {
            successFrames++;
        } else {
            if (successFrames > 0) successFrames -= 0.5;
        }

        const pct = Math.min((successFrames / totalFrames) * 100, 100);
        const fill = document.getElementById('balance-progress-fill');
        if (fill) fill.style.width = `${pct}%`;

        if (pct >= 100) {
            completeCurrentStep();
        } else {
            balanceLoopId = requestAnimationFrame(update);
        }
    }
    balanceLoopId = requestAnimationFrame(update);
}

function initStirTrack(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    lastStirAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
}

function trackStir(e, target) {
    if (lastStirAngle === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);

    let delta = currentAngle - lastStirAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    if (delta > 0) {
        currentStirAngle += delta;
        document.getElementById('spoon-handle').style.transform = `rotate(${currentStirAngle * (180 / Math.PI)}deg)`;
        
        const rotations = Math.floor(currentStirAngle / (2 * Math.PI));
        if (rotations > totalStirRotations) {
            totalStirRotations = rotations;
            document.getElementById('stir-info').innerText = `Обороты ложки: ${totalStirRotations} / ${target}`;
            if (totalStirRotations >= target) {
                lastStirAngle = null;
                setTimeout(completeCurrentStep, 300);
            }
        }
    }
    lastStirAngle = currentAngle;
}

window.addEventListener('mouseup', () => lastStirAngle = null);

function completeCurrentStep() {
    currentStepIdx++;
    socket.emit('nextStepReady', { roomId: myRoomId });
    if (currentStepIdx < myPotion.steps.length) {
        loadStep();
    } else {
        document.getElementById('step-instruction').innerText = "Ожидание оппонента...";
        document.getElementById('mechanic-zone').innerHTML = "<div class='success-banner'>🧪 Концентрация завершена. Зелье стабильно!</div>";
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
    document.getElementById('mechanic-zone').innerHTML = `<button onclick="window.location.reload()" style="max-width:250px;">В главное меню</button>`;
});
