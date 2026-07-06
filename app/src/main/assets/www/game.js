// Safe error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('JS Error: ' + msg + ' at ' + lineNo + ':' + columnNo);
    return false;
};

// Game State
let state = {
    bestScore: 0,
    coins: 0,
    selectedSkin: 'skin-default',
    unlockedSkins: ['skin-default'],
    sound: true,
    vibration: true,
    missions: {
        taps: 0,
        maxCombo: 0,
        gamesPlayed: 0
    }
};

// Gameplay Variables
let score = 0;
let combo = 0;
let energy = 100;
let gameLoop;
let energyDrainRate = 15;
let buttonMoveInterval;
let isPlaying = false;
let fakeButtons = [];

// DOM Elements
const screens = {
    home: document.getElementById('screen-home'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
    shop: document.getElementById('screen-shop'),
    missions: document.getElementById('screen-missions'),
    settings: document.getElementById('screen-settings')
};

const playArea = document.getElementById('play-area');
const targetBtn = document.getElementById('target-button');
const energyBar = document.getElementById('energy-bar');
const toast = document.getElementById('message-toast');

// Messages
const funnyMessages = [
    "Don't tap me!", "I told you not to tap!", "Why are you like this?",
    "Nice tap, silly human.", "The button is scared.", "Too slow!",
    "Wrong button, genius.", "You fell for it.", "Tap harder. Just kidding.",
    "The button has trust issues.", "Congratulations, you tapped a circle.",
    "This is peak gaming.", "You are now officially a tap master.",
    "Stop bullying the button."
];

// Load State
function loadData() {
    const saved = localStorage.getItem('dontTapItSave');
    if (saved) {
        state = { ...state, ...JSON.parse(saved) };
    }
    updateHomeStats();
}

function saveData() {
    localStorage.setItem('dontTapItSave', JSON.stringify(state));
}

// Navigation
function showScreen(id) {
    Object.values(screens).forEach(s => {
        if (s) s.classList.remove('active');
    });
    if (screens[id]) {
        screens[id].classList.add('active');
    } else {
        console.error('Screen not found: ' + id);
    }
}

function initApp() {
    loadData();
    showScreen('home');
    
    function safeBind(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.style.pointerEvents = 'auto'; // Ensure pointer events are enabled
            el.style.cursor = 'pointer';
            el.addEventListener('click', handler);
            el.addEventListener('touchstart', (e) => {
                e.preventDefault(); // prevent double click
                handler();
            }, { passive: false });
        } else {
            console.error(`Button ${id} not found.`);
        }
    }

    // Bind buttons
    safeBind('btn-start', startGame);
    safeBind('btn-shop', openShop);
    safeBind('btn-missions', openMissions);
    safeBind('btn-settings', () => showScreen('settings'));
    
    safeBind('btn-restart', startGame);
    safeBind('btn-ad-continue', () => { showToast('Ads not loaded'); showScreen('home'); });
    safeBind('btn-home-from-end', () => showScreen('home'));
    safeBind('btn-home-from-shop', () => showScreen('home'));
    safeBind('btn-home-from-missions', () => showScreen('home'));
    safeBind('btn-home-from-settings', () => showScreen('home'));
    
    const toggleSound = document.getElementById('toggle-sound');
    if (toggleSound) toggleSound.onchange = (e) => { state.sound = e.target.checked; saveData(); };
    
    const toggleVib = document.getElementById('toggle-vibration');
    if (toggleVib) toggleVib.onchange = (e) => { state.vibration = e.target.checked; saveData(); };
    
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) btnReset.onclick = () => { localStorage.clear(); location.reload(); };

    if (targetBtn) {
        targetBtn.ontouchstart = (e) => { e.preventDefault(); handleTap(true); };
        targetBtn.onmousedown = (e) => { e.preventDefault(); handleTap(true); };
    }
}

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function updateHomeStats() {
    const elScore = document.getElementById('home-best-score');
    if (elScore) elScore.innerText = state.bestScore;
    
    const elCoins = document.getElementById('home-coins');
    if (elCoins) elCoins.innerText = state.coins;
    
    const elSound = document.getElementById('toggle-sound');
    if (elSound) elSound.checked = state.sound;
    
    const elVib = document.getElementById('toggle-vibration');
    if (elVib) elVib.checked = state.vibration;
}

// Game Logic
function startGame() {
    score = 0;
    combo = 0;
    energy = 100;
    energyDrainRate = 15;
    isPlaying = true;
    
    // Cleanup fake buttons
    fakeButtons.forEach(b => b.remove());
    fakeButtons = [];

    document.getElementById('game-score').innerText = score;
    document.getElementById('game-combo').innerText = combo;
    
    targetBtn.className = 'game-object ' + state.selectedSkin;
    targetBtn.innerText = 'TAP';
    
    showScreen('game');
    moveButton(targetBtn);
    
    state.missions.gamesPlayed++;
    saveData();

    clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, 100);
}

function updateGame() {
    if (!isPlaying) return;
    
    energy -= energyDrainRate * 0.1;
    energyBar.style.width = Math.max(0, energy) + '%';
    
    if (energy <= 30) energyBar.style.backgroundColor = '#FF2A5F';
    else energyBar.style.backgroundColor = '#00E5FF';

    if (energy <= 0) gameOver();
}

function handleTap(isCorrect) {
    if (!isPlaying) return;
    
    if (state.vibration && navigator.vibrate) navigator.vibrate(20);
    
    if (isCorrect) {
        score++;
        combo++;
        energy = Math.min(100, energy + 20);
        state.coins += 1;
        state.missions.taps++;
        
        if (combo > state.missions.maxCombo) state.missions.maxCombo = combo;
        
        document.getElementById('game-score').innerText = score;
        document.getElementById('game-combo').innerText = combo;
        
        // Increase difficulty
        energyDrainRate = 15 + (score * 0.5);
        
        moveButton(targetBtn);
        
        // Random effects
        if (score % 5 === 0) showToast(funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);
        if (score > 10 && Math.random() > 0.7) spawnFakeButton();
    } else {
        gameOver();
    }
}

function moveButton(btn) {
    const rect = playArea.getBoundingClientRect();
    const maxX = rect.width - 80;
    const maxY = rect.height - 80;
    
    let x = Math.random() * maxX + 40;
    let y = Math.random() * maxY + 40;
    
    btn.style.left = x + 'px';
    btn.style.top = y + 'px';
    
    // Scale down slightly as score increases
    let scale = Math.max(0.5, 1 - (score * 0.005));
    btn.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function spawnFakeButton() {
    const fake = document.createElement('div');
    const isBomb = score > 50 && Math.random() > 0.5;
    
    fake.className = 'game-object ' + (isBomb ? 'skin-bomb' : 'skin-fake');
    fake.innerText = isBomb ? 'BOMB' : 'TAP';
    
    moveButton(fake);
    
    fake.ontouchstart = (e) => { e.preventDefault(); handleTap(false); };
    fake.onmousedown = (e) => { e.preventDefault(); handleTap(false); };
    
    playArea.appendChild(fake);
    fakeButtons.push(fake);
    
    setTimeout(() => {
        if (fake.parentNode) fake.remove();
    }, 2000 - (score * 5));
}

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 1500);
}

function gameOver() {
    isPlaying = false;
    clearInterval(gameLoop);
    
    if (state.vibration && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    if (score > state.bestScore) state.bestScore = score;
    
    document.getElementById('end-score').innerText = score;
    document.getElementById('end-best').innerText = state.bestScore;
    document.getElementById('end-coins').innerText = score; // Earned coins
    
    saveData();
    updateHomeStats();
    showScreen('gameover');
}

// Shop Logic
const shopItems = [
    { id: 'skin-default', name: 'Red Button', price: 0, color: '#FF5252' },
    { id: 'skin-blue', name: 'Neon Blue', price: 100, color: '#00E5FF' },
    { id: 'skin-gold', name: 'Gold VIP', price: 500, color: '#FFD600' },
    { id: 'skin-dark', name: 'Evil Dark', price: 1000, color: '#424242' }
];

function openShop() {
    document.getElementById('shop-coins').innerText = state.coins;
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    
    shopItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item ' + (state.selectedSkin === item.id ? 'selected' : '');
        
        const isUnlocked = state.unlockedSkins.includes(item.id);
        
        div.innerHTML = `
            <div class="shop-icon" style="background:${item.color}"></div>
            <div>${item.name}</div>
            <button class="btn btn-primary mt-1" style="font-size:0.9rem; padding: 5px 10px;">
                ${isUnlocked ? (state.selectedSkin === item.id ? 'Equipped' : 'Select') : 'Buy ' + item.price}
            </button>
        `;
        
        div.querySelector('button').onclick = () => {
            if (isUnlocked) {
                state.selectedSkin = item.id;
                saveData();
                openShop(); // refresh
            } else if (state.coins >= item.price) {
                state.coins -= item.price;
                state.unlockedSkins.push(item.id);
                state.selectedSkin = item.id;
                saveData();
                openShop();
            } else {
                alert("Not enough coins!");
            }
        };
        
        grid.appendChild(div);
    });
    
    showScreen('shop');
}

// Missions Logic
function openMissions() {
    const list = document.getElementById('missions-list');
    list.innerHTML = `
        <div class="mission-item">
            <span>Tap 50 Times (${state.missions.taps}/50)</span>
            <span>${state.missions.taps >= 50 ? '✅' : '⏳'}</span>
        </div>
        <div class="mission-item">
            <span>Reach 20 Combo (${state.missions.maxCombo}/20)</span>
            <span>${state.missions.maxCombo >= 20 ? '✅' : '⏳'}</span>
        </div>
        <div class="mission-item">
            <span>Play 5 Games (${state.missions.gamesPlayed}/5)</span>
            <span>${state.missions.gamesPlayed >= 5 ? '✅' : '⏳'}</span>
        </div>
    `;
    showScreen('missions');
}
