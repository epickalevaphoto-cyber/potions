// Данные о зельях, ингредиентах и инвентаре для игры

// Все доступные ингредиенты
export const ALL_INGREDIENTS = [
    // Растительные
    { id: 'aconite', name: 'Аконит', category: 'plant', emoji: '🌿' },
    { id: 'asphodel_root', name: 'Корень асфоделя', category: 'plant', emoji: '🌱' },
    { id: 'star_anise', name: 'Бадьян', category: 'plant', emoji: '⭐' },
    { id: 'belladonna', name: 'Экстракт белладонны', category: 'plant', emoji: '🫐' },
    { id: 'bubotuber_pus', name: 'Гной бубонтюбера', category: 'plant', emoji: '💧' },
    { id: 'valerian', name: 'Валериана', category: 'plant', emoji: '🌺' },
    { id: 'seaweed', name: 'Водоросли', category: 'plant', emoji: '🌊' },
    { id: 'rowan_bark', name: 'Кора волшебной рябины', category: 'plant', emoji: '🌳' },
    { id: 'wormwood', name: 'Настойка горькой полыни', category: 'plant', emoji: '🍃' },
    
    // Животные
    { id: 'acromantula_venom', name: 'Яд акромантула', category: 'animal', emoji: '🕷️' },
    { id: 'bundle_grass', name: 'Перья болтрушайки', category: 'animal', emoji: '🪶' },
    { id: 'toad_wart', name: 'Бородавки большой пурпурной жабы', category: 'animal', emoji: '🐸' },
    { id: 'buckslang_skin', name: 'Шкура бумсланга', category: 'animal', emoji: '🐍' },
    { id: 'bundimun_slime', name: 'Слизь бундимуна', category: 'animal', emoji: '🟢' },
    { id: 'griffon_claw', name: 'Когти грифона', category: 'animal', emoji: '🦅' },
    { id: 'caterpillar', name: 'Сушёная волосатая гусеница', category: 'animal', emoji: '🐛' },
    
    // Минеральные
    { id: 'bezoar', name: 'Безоаровый камень', category: 'mineral', emoji: '💎' },
    { id: 'moonstone', name: 'Лунный камень', category: 'mineral', emoji: '🌙' },
    { id: 'opal', name: 'Опал', category: 'mineral', emoji: '✨' },
    { id: 'ruby', name: 'Рубин', category: 'mineral', emoji: '🔴' },
    
    // Другие
    { id: 'lethe_water', name: 'Речная вода Леты', category: 'other', emoji: '🌊' },
    { id: 'moon_dew', name: 'Лунная роса', category: 'other', emoji: '🌙' },
    { id: 'honey_water', name: 'Медовая вода', category: 'other', emoji: '🍯' },
    { id: 'phoenix_tear', name: 'Слеза феникса', category: 'other', emoji: '🔥' },
    { id: 'unicorn_blood', name: 'Кровь единорога', category: 'other', emoji: '🦄' }
];

// Рецепты зелий
export const POTION_RECIPES = [
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

// Инвентарь
export const INVENTORY = {
    cauldrons: ['Алюминий', 'Медь', 'Чугун', 'Серебро'],
    tools: ['Колбы', 'Пробирки', 'Ступка и пестик', 'Нож', 'Весы', 'Мерные колбы', 'Цилиндры', 'Бюретки', 'Пипетки']
};

// Получить случайный рецепт
export function getRandomPotion() {
    return POTION_RECIPES[Math.floor(Math.random() * POTION_RECIPES.length)];
}

// Получить случайный набор ингредиентов для раунда
export function getRandomIngredients(count = 6) {
    const shuffled = [...ALL_INGREDIENTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Получить случайный порядок действий
export function getRandomActions() {
    const actions = ['Нагреть', 'Добавить ингредиент', 'Перемешать', 'Остудить', 'Настоять', 'Процедить'];
    return [...actions].sort(() => Math.random() - 0.5);
}

// Создать событие для раунда 7
export function createRandomEvent() {
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
