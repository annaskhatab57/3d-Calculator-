// Elements - Calculator Core
const powerBtn = document.getElementById('power-btn');
const ledIndicator = document.getElementById('led-indicator');
const screenContainer = document.getElementById('screen-container');
const expressionDisplay = document.getElementById('expression-display');
const resultDisplay = document.getElementById('result-display');
const degIndicator = document.getElementById('deg-indicator');
const radIndicator = document.getElementById('rad-indicator');
const clickSound = document.getElementById('click-sound');
const calc = document.getElementById('calc');
const buttons = document.querySelectorAll('button');

// Elements - Settings & Drawer
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const rgbToggleBtn = document.getElementById('rgb-toggle-btn');
const drawerToggleBtn = document.getElementById('drawer-toggle-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawer = document.getElementById('drawer');

const tabHistory = document.getElementById('tab-history');
const tabConstants = document.getElementById('tab-constants');
const panelHistory = document.getElementById('panel-history');
const panelConstants = document.getElementById('panel-constants');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// States
let isPowerOn = true;
let isDegree = true;
let currentExpression = "";
let lastAnswer = "0";
let isResultDisplayed = false;

// Persistent Settings States
let isSoundEnabled = localStorage.getItem('calc_sound') !== 'false';
let isDarkMode = localStorage.getItem('calc_dark') === 'true';
let isRgbMode = localStorage.getItem('calc_rgb') === 'true';
let historyLog = JSON.parse(localStorage.getItem('calc_history')) || [];

// Initialize Settings UI
function initSettings() {
    // Sound
    updateSoundUI();
    
    // Theme (Dark Mode)
    document.body.classList.toggle('dark-theme', isDarkMode);
    themeToggleBtn.innerText = isDarkMode ? '☀️' : '🌙';
    themeToggleBtn.classList.toggle('active', isDarkMode);

    // RGB Mode
    calc.classList.toggle('rgb-active', isRgbMode);
    rgbToggleBtn.classList.toggle('active', isRgbMode);

    // History list rendering
    renderHistory();
}

function updateSoundUI() {
    soundToggleBtn.innerText = isSoundEnabled ? '🔊' : '🔇';
    soundToggleBtn.classList.toggle('active', isSoundEnabled);
}

// Render History Log
function renderHistory() {
    historyList.innerHTML = "";
    if (historyLog.length === 0) {
        historyList.innerHTML = '<div class="empty-msg">No calculations yet.</div>';
        return;
    }

    // Render items (newest first)
    historyLog.slice().reverse().forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.innerHTML = `
            <div class="history-expr">${item.expr}</div>
            <div class="history-res">${item.result}</div>
        `;
        
        // Clicking a history item loads its expression back
        itemDiv.addEventListener('click', () => {
            if (!isPowerOn) return;
            
            // Play physical button sound if allowed
            playClickSound();

            currentExpression = item.expr;
            expressionDisplay.innerText = currentExpression;
            resultDisplay.innerText = item.result;
            isResultDisplayed = false;
        });

        historyList.appendChild(itemDiv);
    });
}

// Save log
function addToHistory(expr, result) {
    // Check if result is error before saving
    if (result === 'Error') return;

    historyLog.push({ expr, result });
    // Keep max 20 logs
    if (historyLog.length > 20) {
        historyLog.shift();
    }
    localStorage.setItem('calc_history', JSON.stringify(historyLog));
    renderHistory();
}

// Sound Playback Wrapper
function playClickSound() {
    if (isSoundEnabled && clickSound) {
        try {
            clickSound.currentTime = 0;
            clickSound.play();
        } catch (err) { /* ignore play errors */ }
    }
}

// Power Toggle handler
function togglePower() {
    isPowerOn = !isPowerOn;
    if (isPowerOn) {
        screenContainer.classList.remove('off');
        ledIndicator.classList.add('active');
        currentExpression = "";
        expressionDisplay.innerText = "";
        resultDisplay.innerText = "0";
    } else {
        screenContainer.classList.add('off');
        ledIndicator.classList.remove('active');
        expressionDisplay.innerText = "";
        resultDisplay.innerText = "";
        currentExpression = "";
    }
}

// Factorial Parsing Helper
function parseFactorials(expr) {
    let s = expr;
    while (true) {
        let idx = s.indexOf('!');
        if (idx === -1) break;
        
        let end = idx;
        let start = -1;
        
        if (end > 0 && s[end - 1] === ')') {
            let depth = 0;
            for (let i = end - 1; i >= 0; i--) {
                if (s[i] === ')') depth++;
                else if (s[i] === '(') depth--;
                
                if (depth === 0) {
                    start = i;
                    // Scan backward for function name letters
                    let j = start - 1;
                    const letterRegex = /[a-zA-Z]/;
                    while (j >= 0 && letterRegex.test(s[j])) {
                        j--;
                    }
                    start = j + 1;
                    break;
                }
            }
        } else {
            let i = end - 1;
            const allowed = /[a-zA-Z0-9.π]/;
            while (i >= 0 && allowed.test(s[i])) {
                i--;
            }
            start = i + 1;
        }
        
        if (start !== -1 && start < end) {
            let operand = s.substring(start, end);
            s = s.substring(0, start) + `fact(${operand})` + s.substring(end + 1);
        } else {
            s = s.substring(0, idx) + 'NaN' + s.substring(idx + 1);
        }
    }
    return s;
}

// Math Scope Evaluator
function evaluateExpression(expr) {
    // Math functions in scope for eval
    const sin = (x) => isDegree ? Math.sin(x * Math.PI / 180) : Math.sin(x);
    const cos = (x) => isDegree ? Math.cos(x * Math.PI / 180) : Math.cos(x);
    const tan = (x) => {
        if (isDegree && Math.abs(x % 180) === 90) return Infinity;
        return isDegree ? Math.tan(x * Math.PI / 180) : Math.tan(x);
    };
    const log = (x) => Math.log10(x);
    const ln = (x) => Math.log(x);
    const sqrt = (x) => Math.sqrt(x);
    const fact = (n) => {
        if (n < 0) return NaN;
        if (!Number.isInteger(n)) return NaN;
        if (n === 0 || n === 1) return 1;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    };

    let safeExpression = expr;

    // 1. Implicit Multiplication (e.g., 2π -> 2*π, 2(3) -> 2*(3), e2 -> e*2)
    safeExpression = safeExpression.replace(/(\)|π|e|Ans)(?=\d)/g, '$1*');
    safeExpression = safeExpression.replace(/(\d|\)|π|e|Ans)(?=sin\(|cos\(|tan\(|log\(|ln\(|√\(|π|e|Ans|\()/g, '$1*');

    // 2. Translation replacements
    safeExpression = safeExpression.replace(/x/g, '*').replace(/×/g, '*');
    safeExpression = safeExpression.replace(/%/g, '/100');
    safeExpression = safeExpression.replace(/√/g, 'sqrt');
    safeExpression = safeExpression.replace(/\^/g, '**');
    
    // 3. Factorials (nested parentheses and constants supported via custom parser)
    safeExpression = parseFactorials(safeExpression);

    // 4. Constants
    safeExpression = safeExpression.replace(/π/g, 'Math.PI');
    safeExpression = safeExpression.replace(/\be\b/g, 'Math.E');
    
    // 5. Exponents
    safeExpression = safeExpression.replace(/E/g, '*10**');
    
    // 6. Previous Answer recall replacement
    safeExpression = safeExpression.replace(/Ans/g, `(${lastAnswer})`);

    // Evaluate
    const evalResult = eval(safeExpression);
    return evalResult;
}

/* ----------------------------------------------------
   CORE CALCULATOR INTERACTIONS
---------------------------------------------------- */

function handleInput(appendValue) {
    playClickSound();

    // Check if operator is being typed
    const isOperator = ['+', '-', 'x', '/', '^', '%', '!'].includes(appendValue);

    // Handle chaining vs starting fresh after an evaluation
    if (isResultDisplayed) {
        if (isOperator) {
            isResultDisplayed = false;
        } else {
            currentExpression = "";
            isResultDisplayed = false;
        }
    }

    currentExpression += appendValue;
    expressionDisplay.innerText = currentExpression;
}

function handleClear() {
    playClickSound();
    currentExpression = "";
    expressionDisplay.innerText = "";
    resultDisplay.innerText = "0";
    isResultDisplayed = false;
}

function handleBackspace() {
    playClickSound();
    if (isResultDisplayed) {
        currentExpression = "";
        expressionDisplay.innerText = "";
        resultDisplay.innerText = "0";
        isResultDisplayed = false;
    } else {
        currentExpression = currentExpression.substring(0, currentExpression.length - 1);
        expressionDisplay.innerText = currentExpression;
        if (currentExpression === "") {
            resultDisplay.innerText = "0";
        }
    }
}

function handleEquals() {
    playClickSound();
    if (currentExpression === "") return;
    try {
        const originalExpr = currentExpression;
        let result = evaluateExpression(currentExpression);

        if (typeof result === 'number') {
            if (isNaN(result)) {
                result = 'Error';
            } else if (!isFinite(result)) {
                result = 'Error';
            } else {
                // Rounded to 10 decimal digits to escape float precision anomalies
                result = parseFloat(result.toFixed(10));
            }
        }

        resultDisplay.innerText = result;
        expressionDisplay.innerText = originalExpr;

        // Add to drawer history log
        if (result !== 'Error') {
            addToHistory(originalExpr, String(result));
            lastAnswer = String(result);
            currentExpression = String(result);
        } else {
            currentExpression = "";
        }
        isResultDisplayed = true;
    } catch (err) {
        resultDisplay.innerText = 'Error';
        currentExpression = "";
        isResultDisplayed = true;
    }
}

function handleButton(btnValue) {
    if (btnValue === 'AC') {
        handleClear();
        return;
    }
    if (btnValue === 'DEL') {
        handleBackspace();
        return;
    }
    if (btnValue === '=') {
        handleEquals();
        return;
    }
    if (btnValue === 'D/R') {
        isDegree = !isDegree;
        if (isDegree) {
            degIndicator.classList.add('active');
            radIndicator.classList.remove('active');
        } else {
            degIndicator.classList.remove('active');
            radIndicator.classList.add('active');
        }
        return;
    }

    // Key conversions
    let appendValue = btnValue;
    if (btnValue === 'sin') appendValue = 'sin(';
    else if (btnValue === 'cos') appendValue = 'cos(';
    else if (btnValue === 'tan') appendValue = 'tan(';
    else if (btnValue === 'log') appendValue = 'log(';
    else if (btnValue === 'ln') appendValue = 'ln(';
    else if (btnValue === '√') appendValue = '√(';
    else if (btnValue === 'x!') appendValue = '!';
    else if (btnValue === 'EXP') appendValue = 'E';

    handleInput(appendValue);
}

/* ----------------------------------------------------
   EVENT LISTENERS
---------------------------------------------------- */

// Sound Toggle
soundToggleBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('calc_sound', isSoundEnabled);
    updateSoundUI();
    playClickSound(); // Play test sound on toggle
});

// Dark Theme Toggle
themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('calc_dark', isDarkMode);
    document.body.classList.toggle('dark-theme', isDarkMode);
    themeToggleBtn.innerText = isDarkMode ? '☀️' : '🌙';
    themeToggleBtn.classList.toggle('active', isDarkMode);
    playClickSound();
});

// RGB Toggle
rgbToggleBtn.addEventListener('click', () => {
    isRgbMode = !isRgbMode;
    localStorage.setItem('calc_rgb', isRgbMode);
    calc.classList.toggle('rgb-active', isRgbMode);
    rgbToggleBtn.classList.toggle('active', isRgbMode);
    playClickSound();
});

// Drawer Toggler
drawerToggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
    drawerToggleBtn.classList.toggle('active', drawer.classList.contains('open'));
    playClickSound();
});

closeDrawerBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
    drawerToggleBtn.classList.remove('active');
    playClickSound();
});

// Tab Switcher inside Drawer
tabHistory.addEventListener('click', () => {
    tabHistory.classList.add('active');
    tabConstants.classList.remove('active');
    panelHistory.classList.add('active');
    panelConstants.classList.remove('active');
    playClickSound();
});

tabConstants.addEventListener('click', () => {
    tabConstants.classList.add('active');
    tabHistory.classList.remove('active');
    panelConstants.classList.add('active');
    panelHistory.classList.remove('active');
    playClickSound();
});

// Clear History Log
clearHistoryBtn.addEventListener('click', () => {
    historyLog = [];
    localStorage.removeItem('calc_history');
    renderHistory();
    playClickSound();
});

// Constant Click Events
document.querySelectorAll('.constant-item').forEach(item => {
    item.addEventListener('click', () => {
        if (!isPowerOn) return;
        playClickSound();

        const val = item.getAttribute('data-val');
        
        // Handle starting fresh vs chaining
        if (isResultDisplayed) {
            currentExpression = "";
            isResultDisplayed = false;
        }

        currentExpression += val;
        expressionDisplay.innerText = currentExpression;
        
        // Close drawer on mobile for user convenience
        if (window.innerWidth <= 640) {
            drawer.classList.remove('open');
            drawerToggleBtn.classList.remove('active');
        }
    });
});

// Calculator Keypad Events
if (buttons.length) {
    Array.from(buttons).forEach(button => {
        // Skip settings dock buttons to prevent redundant handler calls
        if (button.classList.contains('dock-btn') || button.classList.contains('close-drawer-btn') || button.classList.contains('tab-btn') || button.classList.contains('clear-history-btn')) {
            return;
        }

        button.addEventListener('click', () => {
            const btnValue = button.innerText.trim();

            // Power key check (needs to be checked before power lock)
            if (button.classList.contains('power') || button.id === 'power-btn') {
                playClickSound();
                togglePower();
                return;
            }

            // Lock input if powered OFF
            if (!isPowerOn) return;

            handleButton(btnValue);
        });
    });
}

// Keyboard Support
window.addEventListener('keydown', (e) => {
    // If power is OFF, ignore all key presses
    if (!isPowerOn) return;

    const key = e.key;

    // Prevent default actions for keys that scroll/refresh
    if ([' ', 'Enter', 'Backspace', '/', '*'].includes(key)) {
        e.preventDefault();
    }

    if (/[0-9]/.test(key)) {
        handleInput(key);
    } else if (key === '.') {
        handleInput('.');
    } else if (key === '+') {
        handleInput('+');
    } else if (key === '-') {
        handleInput('-');
    } else if (key === '*') {
        handleInput('x');
    } else if (key === '/') {
        handleInput('/');
    } else if (key === '%') {
        handleInput('%');
    } else if (key === '^') {
        handleInput('^');
    } else if (key === '(') {
        handleInput('(');
    } else if (key === ')') {
        handleInput(')');
    } else if (key === '!') {
        handleInput('!');
    } else if (key.toLowerCase() === 'p') {
        handleInput('π');
    } else if (key === 'e') {
        handleInput('e');
    } else if (key === 'Enter' || key === '=') {
        handleEquals();
    } else if (key === 'Backspace') {
        handleBackspace();
    } else if (key === 'Escape' || key === 'Delete') {
        handleClear();
    }
});

// Initial fire
initSettings();