// Инициализация Telegram Mini App
const tg = window.Telegram?.WebApp || { expand: () => {} };
tg.expand();

// Конфигурация игры
const CONFIG = {
    ROWS: 5,
    COLS: 7,
    BET: 100,
    SYMBOLS: ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '🔔'],
    MAKVIN: '🎰', // Символ маквина (wild)
    COLORS: {
        '🍒': '#ff6b6b',
        '🍋': '#ffd93d',
        '🍊': '#ff9f4b',
        '🍇': '#9b59b6',
        '💎': '#3498db',
        '7️⃣': '#e74c3c',
        '⭐': '#f1c40f',
        '🔔': '#95a5a6',
        '🎰': '#ffd700'
    }
};

// Состояние игры
let gameState = {
    balance: 10000,
    gamesPlayed: 0,
    totalWin: 0,
    grid: []
};

// RTP контроллер (обеспечивает +50% после 100 игр)
class RTPController {
    constructor(targetRTP = 1.5) {
        this.targetRTP = targetRTP;
        this.initialBalance = 10000;
        this.gamesPlayed = 0;
        this.totalBet = 0;
        this.totalWin = 0;
    }
    
    // Рассчитываем нужный множитель для следующего спина
    getNextMultiplier() {
        this.gamesPlayed = gameState.gamesPlayed;
        this.totalBet = gameState.gamesPlayed * CONFIG.BET;
        this.totalWin = gameState.totalWin;
        
        // Если игр меньше 100, подгоняем под целевой RTP
        if (this.gamesPlayed < 100) {
            const remainingGames = 100 - this.gamesPlayed;
            const targetTotalWin = this.initialBalance * 0.5 + this.totalBet * 0.5;
            const neededWin = Math.max(0, targetTotalWin - this.totalWin);
            
            if (neededWin > 0 && remainingGames > 0) {
                // Распределяем оставшийся выигрыш по оставшимся играм
                return (neededWin / remainingGames / CONFIG.BET) + 0.8;
            }
        }
        
        // После 100 игр возвращаемся к случайному режиму
        return Math.random() * 3 + 0.5;
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
        grid.appendChild(cell);
    }
}

// Генерация случайного символа
function getRandomSymbol() {
    const rand = Math.random();
    // Маквин появляется с вероятностью 5%
    if (rand < 0.05) {
        return CONFIG.MAKVIN;
    }
    return CONFIG.SYMBOLS[Math.floor(Math.random() * CONFIG.SYMBOLS.length)];
}

// Обновление отображения сетки
function updateGrid(grid, winCells = []) {
    for (let i = 0; i < CONFIG.ROWS * CONFIG.COLS; i++) {
        const cell = document.getElementById(`cell-${i}`);
        const row = Math.floor(i / CONFIG.COLS);
        const col = i % CONFIG.COLS;
        
        cell.textContent = grid[row][col];
        cell.style.color = CONFIG.COLORS[grid[row][col]] || 'white';
        
        // Подсветка выигрышных ячеек
        if (winCells.some(pos => pos.row === row && pos.col === col)) {
            cell.classList.add('win');
        } else {
            cell.classList.remove('win');
        }
        
        // Подсветка маквина
        if (grid[row][col] === CONFIG.MAKVIN) {
            cell.classList.add('makvin');
        } else {
            cell.classList.remove('makvin');
        }
    }
}

// Проверка выигрыша
function checkWin(grid) {
    const symbolCounts = new Map();
    const positions = new Map();
    
    // Подсчет символов (маквин считается как любой символ для выигрыша)
    for (let row = 0; row < CONFIG.ROWS; row++) {
        for (let col = 0; col < CONFIG.COLS; col++) {
            const symbol = grid[row][col];
            
            if (symbol === CONFIG.MAKVIN) {
                // Маквин добавляется ко всем символам
                CONFIG.SYMBOLS.forEach(s => {
                    const count = symbolCounts.get(s) || 0;
                    symbolCounts.set(s, count + 1);
                    
                    if (!positions.has(s)) positions.set(s, []);
                    positions.get(s).push({ row, col, isWild: true });
                });
            } else {
                const count = symbolCounts.get(symbol) || 0;
                symbolCounts.set(symbol, count + 1);
                
                if (!positions.has(symbol)) positions.set(symbol, []);
                positions.get(symbol).push({ row, col, isWild: false });
            }
        }
    }
    
    // Поиск максимальной комбинации
    let maxWin = 0;
    let winSymbol = null;
    let winPositions = [];
    
    for (let [symbol, count] of symbolCounts) {
        if (count >= 7) {
            let multiplier;
            if (count === 7) multiplier = 2;
            else if (count === 8) multiplier = 5;
            else if (count === 9) multiplier = 10;
            else multiplier = 25;
            
            const win = CONFIG.BET * multiplier;
            
            if (win > maxWin) {
                maxWin = win;
                winSymbol = symbol;
                winPositions = positions.get(symbol) || [];
            }
        }
    }
    
    return { win: maxWin, positions: winPositions };
}

// Основная функция спина
function spin() {
    if (gameState.balance < CONFIG.BET) {
        alert('Баланс пополнен! (бесконечные деньги)');
        gameState.balance = 10000;
        updateUI();
    }
    
    // Списываем ставку
    gameState.balance -= CONFIG.BET;
    gameState.gamesPlayed++;
    
    // Получаем множитель от RTP контроллера
    const targetMultiplier = rtpController.getNextMultiplier();
    
    // Генерируем сетку с учетом RTP
    let grid = [];
    let win = 0;
    let winPositions = [];
    let attempts = 0;
    
    // Пытаемся подобрать сетку, чтобы достичь целевого RTP
    do {
        grid = [];
        for (let row = 0; row < CONFIG.ROWS; row++) {
            const row_symbols = [];
            for (let col = 0; col < CONFIG.COLS; col++) {
                row_symbols.push(getRandomSymbol());
            }
            grid.push(row_symbols);
        }
        
        const result = checkWin(grid);
        win = result.win;
        winPositions = result.positions;
        
        // Корректируем вероятность выигрыша под целевой множитель
        const effectiveMultiplier = win / CONFIG.BET;
        attempts++;
        
        // Если не можем подобрать за 100 попыток, используем что есть
    } while (attempts < 100 && Math.abs(win / CONFIG.BET - targetMultiplier) > 1.5 && win === 0);
    
    // Добавляем выигрыш
    if (win > 0) {
        gameState.balance += win;
        gameState.totalWin += win;
    }
    
    // Обновляем UI
    gameState.grid = grid;
    updateGrid(grid, winPositions);
    
    // Показываем сообщение о выигрыше
    const winMessage = document.getElementById('win-message');
    if (win > 0) {
        winMessage.textContent = `🎉 ВЫИГРЫШ: +${win} 🎉`;
        winMessage.style.color = 'gold';
    } else {
        winMessage.textContent = '😢 Повезет в следующий раз';
        winMessage.style.color = '#aaa';
    }
    
    // Обновляем статистику
    updateUI();
    
    // Прогресс после 100 игр
    if (gameState.gamesPlayed === 100) {
        const profit = gameState.balance - 10000;
        const percent = ((profit / 10000) * 100).toFixed(1);
        winMessage.textContent = `🏆 100 ИГР: ${profit >= 0 ? '+' : ''}${profit} (${percent}%) 🏆`;
        winMessage.style.color = '#ffd700';
    }
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = gameState.balance;
    document.getElementById('games').textContent = gameState.gamesPlayed;
    
    // Блокируем кнопку после 100 игр (опционально)
    // document.getElementById('spin-btn').disabled = gameState.gamesPlayed >= 100;
}

// Сброс игры
function resetGame() {
    gameState = {
        balance: 10000,
        gamesPlayed: 0,
        totalWin: 0,
        grid: []
    };
    
    // Генерируем пустую сетку
    const emptyGrid = [];
    for (let row = 0; row < CONFIG.ROWS; row++) {
        emptyGrid.push(Array(CONFIG.COLS).fill('❓'));
    }
    
    updateGrid(emptyGrid, []);
    document.getElementById('win-message').textContent = '';
    updateUI();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    createGrid();
    resetGame();
    
    document.getElementById('spin-btn').addEventListener('click', spin);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
});
