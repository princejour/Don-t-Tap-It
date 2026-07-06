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

// Audio Manager - lazy Web Audio initialization for Android WebView
let audioCtx = null;
let audioUnlocked = false;
let lastMoveSoundAt = 0;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('Web Audio API is not supported on this device.');
            return null;
        }
        audioCtx = new AudioContextClass();
        console.log('AudioContext created');
    }
    return audioCtx;
}

function unlockAudio() {
    if (!state.sound) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const markUnlocked = () => {
        audioUnlocked = true;
        console.log('Audio unlocked');
    };

    try {
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
                markUnlocked();
                console.log('AudioContext resumed');
            }).catch((err) => console.warn('AudioContext resume failed:', err));
        } else {
            markUnlocked();
        }
    } catch (err) {
        console.warn('Audio unlock error:', err);
    }
}

function playTone(frequencies, duration = 0.12, type = 'sine', volume = 0.45) {
    if (!state.sound) {
        console.log('Sound disabled');
        return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        if (ctx.state === 'suspended') {
            ctx.resume().catch((err) => console.warn('AudioContext resume failed:', err));
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        const freqList = Array.isArray(frequencies) ? frequencies : [frequencies];
        osc.frequency.setValueAtTime(freqList[0], now);
        freqList.forEach((freq, index) => {
            osc.frequency.setValueAtTime(freq, now + index * (duration / Math.max(freqList.length, 1)));
        });

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.02);
    } catch (err) {
        console.error('Audio error:', err);
    }
}

function playSound(type) {
    if (!state.sound) return;
    unlockAudio();

    if (type === 'tap') {
        playTone([780, 1120], 0.10, 'sine', 0.55);
        console.log('Tap sound played');
    } else if (type === 'combo') {
        playTone([660, 880, 1320], 0.20, 'square', 0.35);
    } else if (type === 'gameover') {
        playTone([340, 220, 120], 0.45, 'sawtooth', 0.35);
    } else if (type === 'buy') {
        playTone([740, 980, 1480], 0.28, 'sine', 0.45);
    } else if (type === 'move') {
        const now = Date.now();
        if (now - lastMoveSoundAt > 250) {
            lastMoveSoundAt = now;
            playTone([220, 170], 0.08, 'triangle', 0.16);
        }
    } else if (type === 'wrong') {
        playTone([180, 90], 0.25, 'square', 0.35);
    } else if (type === 'test') {
        playTone([880, 1320], 0.18, 'sine', 0.55);
    }
}

['pointerdown', 'touchstart', 'click'].forEach((eventName) => {
    document.addEventListener(eventName, unlockAudio, { passive: true });
});

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

            const runHandler = (e) => {
                unlockAudio();
                handler(e);
            };

            el.addEventListener('pointerdown', runHandler);
            el.addEventListener('click', runHandler);
            el.addEventListener('touchstart', (e) => {
                e.preventDefault(); // prevent double click
                runHandler(e);
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
    if (toggleSound) toggleSound.onchange = (e) => { 
        state.sound = e.target.checked; 
        saveData(); 
        if (state.sound) {
            unlockAudio();
            playSound('test');
        } else {
            console.log('Sound disabled');
        }
    };
    
    const toggleVib = document.getElementById('toggle-vibration');
    if (toggleVib) toggleVib.onchange = (e) => { state.vibration = e.target.checked; saveData(); };
    
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) btnReset.onclick = () => { localStorage.clear(); location.reload(); };

    if (targetBtn) {
        targetBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); handleTap(true); });
        targetBtn.ontouchstart = (e) => { e.preventDefault(); unlockAudio(); handleTap(true); };
        targetBtn.onmousedown = (e) => { e.preventDefault(); unlockAudio(); handleTap(true); };
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
    unlockAudio();
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
    playSound('test');
    
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
    unlockAudio();
    
    if (state.vibration && navigator.vibrate) navigator.vibrate(20);
    
    if (isCorrect) {
        score++;
        combo++;
        energy = Math.min(100, energy + 20);
        state.coins += 1;
        state.missions.taps++;
        
        playSound('tap');
        if (combo > 1 && combo % 5 === 0) playSound('combo');
        
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
        playSound('wrong');
        gameOver();
    }
}

function moveButton(btn) {
    playSound('move');
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
    
    fake.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); handleTap(false); });
    fake.ontouchstart = (e) => { e.preventDefault(); unlockAudio(); handleTap(false); };
    fake.onmousedown = (e) => { e.preventDefault(); unlockAudio(); handleTap(false); };
    
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
    playSound('gameover');
    
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
            unlockAudio();
            if (isUnlocked) {
                state.selectedSkin = item.id;
                saveData();
                openShop(); // refresh
            } else if (state.coins >= item.price) {
                playSound('buy');
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
