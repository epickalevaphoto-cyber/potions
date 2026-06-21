const socket = io();

let currentAction = 'create'; // 'create' или 'join'
let selectedFaculty = '';
let myRoomId = '';

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
    event.target.classList.add('selected');
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

// При создании комнаты сервером получаем код и идем на Экран 3
socket.on('roomCreated', (roomId) => {
    myRoomId = roomId;
    showRoleScreen();
});

// Ответ сервера на проверку существования комнаты
socket.on('roomExists', (exists) => {
    if (exists) {
        myRoomId = document.getElementById('room-code').value.trim();
        showRoleScreen();
    } else {
        alert('Комната не найдена!');
    }
});

function showRoleScreen() {
    document.getElementById('screen-profile').classList.remove('active');
    document.getElementById('screen-role').classList.add('active');
    document.getElementById('display-room-code').innerText = myRoomId;
}

function chooseRole(role) {
    const name = document.getElementById('username').value.trim();
    socket.emit('joinRole', { roomId: myRoomId, name, faculty: selectedFaculty, role });
    
    // Переход на экран дуэли
    document.getElementById('screen-role').classList.remove('active');
    document.getElementById('screen-duel').classList.add('active');
}

socket.on('roomUpdate', (roomData) => {
    console.log('Данные комнаты обновлены:', roomData);
    // Тут в будущем будет обновляться список игроков и запускаться игра
});
