// Инициализация Telegram Web App
const tg = window.Telegram?.WebApp || { expand: () => {}, ready: () => {} };
tg.expand();
tg.ready();

// Конфигурация игры
const CONFIG = {
    ROWS: 5,
    COLS: 7,
    BET: 100,
    INITIAL_BALANCE: 5000,
    
    // Красивые изображения из интернета
    IMAGES: [
        { id: 'cat', url: 'https://images.unsplash.com/photo-1514888286974-6c353e2b7b4c?w=150&h=150&fit=crop', name: '🐱 Кот' },
        { id: 'dog', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop', name: '🐶 Собака' },
        { id: 'nature', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=150&h=150&fit=crop', name: '🌲 Природа' },
        { id: 'food', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&h=150&fit=crop', name: '🍕 Еда' },
        { id: 'travel', url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=150&h=150&fit=crop', name: '✈️ Путешествия' },
        { id: 'tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop', name: '💻 Технологии' },
        { id: 'sports', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&h=150&fit=crop', name: '⚽ Спорт' },
        { id: 'space', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=150&h=150&fit=crop', name: '🚀 Космос' },
        { id: 'gold', url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&h=150&fit=crop', name: '🏆 Джекпот' }
    ],
    
    // Множители выигрыша (Сбалансированный RTP 95%)
    MULTIPLIERS: {
        7: 2,    // 7 одинаковых: x2
        8: 5,    // 8 одинаковых: x5
        9: 10,   // 9 одинаковых: x10
        10: 20,  // 10 одинаковых: x20
        11: 30,  // 11 одинаковых: x30
        12: 50,  // 12 одинаковых: x50
        13: 75,  // 13 одинаковых: x75
        14: 100, // 14+ одинаковых: x100 (Джекпот)
        15: 100,
        16: 100,
        17: 100,
        18: 100,
        19: 100,
        20: 100
    }
};

// Состояние игры
let gameState = {
    balance: CONFIG.INITIAL_BALANCE,
    gamesPlayed: 0,
    totalWon: 0,
    totalBet: 0,
    grid: []
};

// RTP Контроллер (Казино имеет преимущество)
class RTPController {
    constructor(targetRTP = 0.95) { // 95% RTP (5% преимущество казино)
        this.targetRTP = targetRTP;
        this.initialBalance = CONFIG.INITIAL_BALANCE;
    }
    
    // Рассчитываем справедливый выигрыш
    calculateWin(actualCount) {
        const baseMultiplier = CONFIG.MULTIPLIERS[actualCount] || 0;
        
        if (baseMultiplier === 0) return 0;
        
        // Базовая сумма выигрыша
        let winAmount = CONFIG.BET * baseMultiplier;
        
        // Корректировка для точного RTP
        if (gameState.gamesPlayed > 0) {
            const currentRTP = gameState.totalWon / Math.max(1, gameState.totalBet);
            const rtpDiff = this.targetRTP - currentRTP;
            
            // Тонкая настройка для достижения целевого RTP
            if (Math.abs(rtpDiff) > 0.05) {
                winAmount *= (1 + rtpDiff);
            }
        }
        
        return Math.floor(winAmount);
    }
}

const rtpController = new RTPController();

// Создание сетки
function createGrid() {
    const grid = document.getElementById('slot-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < CONFIG.ROWS * CONFIG.COLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.id = `cell-${i}`;
        
        const img = document.createElement('img');
        img.src = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=50&h=50&fit=crop'; // Заглушка
        img.alt = 'slot';
        img.loading = 'lazy';
        
        cell.appendChild(img);
        grid.appendChild(cell);
    }
}

// Получение случайного изображения
function getRandomImage() {
    const randomIndex = Math.floor(Math.random() * CONFIG.IMAGES.length);
    return CONFIG.IMAGES[randomIndex];
}

// Анимация вращения
async function spinAnimation() {
    const cells = document.querySelectorAll('.cell');
    const spinsPerCell = 10;
    const animationDelay = 50; // мс
    
    // Запускаем анимацию для всех ячеек
    cells.forEach(cell => cell.classList.add('spinning'));
    
    // Меняем изображения во время анимации
    for (let step = 0; step < spinsPerCell; step++) {
        await new Promise(resolve => setTimeout(resolve, animationDelay));
        
        cells.forEach(cell => {
            const img = cell.querySelector('img');
            const randomImg = getRandomImage();
            img.src = randomImg.url;
            img.alt = randomImg.name;
        });
    }
    
    // Останавливаем анимацию
    cells.forEach(cell => cell.classList.remove('spinning'));
}

// Проверка выигрыша
function checkWin(grid) {
    const symbolCounts = new Map();
    const positions = new Map();
    
    // Подсчет каждого символа
    for (let row = 0; row < CONFIG.ROWS; row++) {
        for (let col = 0; col < CONFIG.COLS; col++) {
            const symbol = grid[row][col].id;
            const count = (symbolCounts.get(symbol) || 0) + 1;
            symbolCounts.set(symbol, count);
            
            if (!positions.has(symbol)) positions.set(symbol, []);
            positions.get(symbol).push({ row, col });
        }
    }
    
    // Поиск максимальной комбинации
    let maxCount = 0;
    let winSymbol = null;
    
    for (let [symbol, count] of symbolCounts) {
        if (count >= 7 && count > maxCount) {
            maxCount = count;
            winSymbol = symbol;
        }
    }
    
    if (maxCount >= 7) {
        const winAmount = rtpController.calculateWin(maxCount);
        return {
            win: winAmount,
            symbol: winSymbol,
            positions: positions.get(winSymbol) || [],
            count: maxCount
        };
    }
    
    return { win: 0, positions: [], count: 0 };
}

// Обновление отображения сетки
function updateGrid(grid, winPositions = []) {
    for (let i = 0; i < CONFIG.ROWS * CONFIG.COLS; i++) {
        const cell = document.getElementById(`cell-${i}`);
        const img = cell.querySelector('img');
        const row = Math.floor(i / CONFIG.COLS);
        const col = i % CONFIG.COLS;
        
        // Обновляем изображение
        img.src = grid[row][col].url;
        img.alt = grid[row][col].name;
        
        // Подсветка выигрышных ячеек
        const isWin = winPositions.some(pos => pos.row === row && pos.col === col);
        if (isWin) {
            cell.classList.add('win');
        } else {
            cell.classList.remove('win');
        }
    }
}

// Основная функция спина
async function spin() {
    if (gameState.balance < CONFIG.BET) {
        document.getElementById('win-message').textContent = '❌ Недостаточно средств!';
        return;
    }
    
    // Блокируем кнопку
    document.getElementById('spin-btn').disabled = true;
    document.getElementById('win-message').textContent = '🎰 ВРАЩЕНИЕ...';
    
    // Запускаем анимацию
    await spinAnimation();
    
    // Списываем ставку
    gameState.balance -= CONFIG.BET;
    gameState.gamesPlayed++;
    gameState.totalBet += CONFIG.BET;
    
    // Генерируем новую сетку
    const newGrid = [];
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const row_symbols = [];
        for (let col = 0; col < CONFIG.COLS; col++) {
            row_symbols.push(getRandomImage());
        }
        newGrid.push(row_symbols);
    }
    
    // Проверяем выигрыш
    const result = checkWin(newGrid);
    
    // Обновляем сетку с подсветкой выигрыша
    updateGrid(newGrid, result.positions);
    gameState.grid = newGrid;
    
    // Обрабатываем выигрыш
    if (result.win > 0) {
        gameState.balance += result.win;
        gameState.totalWon += result.win;
        
        document.getElementById('win-message').innerHTML = `
            🎉 ВЫИГРЫШ: +${result.win} 🎉<br>
            <small>${result.count} одинаковых фото</small>
        `;
    } else {
        document.getElementById('win-message').textContent = '😢 Попробуйте еще раз';
    }
    
    // Обновляем статистику
    updateStats();
    
    // Разблокируем кнопку
    document.getElementById('spin-btn').disabled = false;
}

// Обновление статистики
function updateStats() {
    document.getElementById('balance').textContent = gameState.balance;
    document.getElementById('games').textContent = gameState.gamesPlayed;
    document.getElementById('totalWin').textContent = gameState.totalWon;
    
    const rtp = gameState.totalBet > 0 
        ? ((gameState.totalWon / gameState.totalBet) * 100).toFixed(1)
        : 0;
    document.getElementById('rtp').textContent = rtp + '%';
    
    const profit = gameState.balance - CONFIG.INITIAL_BALANCE;
    const profitElement = document.getElementById('profitDisplay');
    profitElement.textContent = (profit >= 0 ? '+' : '') + profit;
    profitElement.className = profit >= 0 ? 'profit' : 'loss';
}

// Сброс игры
function resetGame() {
    gameState = {
        balance: CONFIG.INITIAL_BALANCE,
        gamesPlayed: 0,
        totalWon: 0,
        totalBet: 0,
        grid: []
    };
    
    // Создаем пустую сетку с плейсхолдерами
    const emptyGrid = [];
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const row_symbols = [];
        for (let col = 0; col < CONFIG.COLS; col++) {
            row_symbols.push({
                id: 'placeholder',
                url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&h=150&fit=crop',
                name: '⚡'
            });
        }
        emptyGrid.push(row_symbols);
    }
    
    updateGrid(emptyGrid, []);
    document.getElementById('win-message').textContent = '⚡ Spin to win ⚡';
    updateStats();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    createGrid();
    resetGame();
    
    document.getElementById('spin-btn').addEventListener('click', spin);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
});
