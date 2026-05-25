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

    // Sanitize leading zeros to prevent JS eval from interpreting them as octal literals
    safeExpression = safeExpression.replace(/(?<=^|[+\-*/(^eE%])0+(?=\d)/g, '');

    // 1. Implicit Multiplication (e.g., 2π -> 2*π, 2(3) -> 2*(3), e2 -> e*2, 5%2 -> 5%*2)
    safeExpression = safeExpression.replace(/(\)|π|e|Ans|%)(?=\d)/g, '$1*');
    safeExpression = safeExpression.replace(/(\d|\)|π|e|Ans|%)(?=sin\(|cos\(|tan\(|log\(|ln\(|√\(|π|e|Ans|\()/g, '$1*');

    // 2. Translation replacements
    safeExpression = safeExpression.replace(/×/g, '*');
    safeExpression = safeExpression.replace(/%/g, '/100');
    safeExpression = safeExpression.replace(/√/g, 'sqrt');
    safeExpression = safeExpression.replace(/\^/g, '**');
    
    // 3. Factorials (nested parentheses and constants supported via custom parser)
    safeExpression = parseFactorials(safeExpression);

    // 4. Exponents (E replacement must happen BEFORE constant 'e' replacement so Math.E is not corrupted)
    safeExpression = safeExpression.replace(/E/g, '*10**');

    // 5. Constants
    safeExpression = safeExpression.replace(/π/g, 'Math.PI');
    safeExpression = safeExpression.replace(/\be\b/g, 'Math.E');
    
    // 6. Previous Answer recall replacement
    safeExpression = safeExpression.replace(/Ans/g, `(${lastAnswer})`);

    // Automatically balance unclosed parentheses
    let openParentheses = (safeExpression.match(/\(/g) || []).length;
    let closeParentheses = (safeExpression.match(/\)/g) || []).length;
    if (openParentheses > closeParentheses) {
        safeExpression += ')'.repeat(openParentheses - closeParentheses);
    }

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
    const isOperator = ['+', '-', '×', '/', '^', '%', '!'].includes(appendValue);

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
    if (currentExpression === "" || isResultDisplayed) return;
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

// Elements - Drawer Tabs (New)
const tabGrapher = document.getElementById('tab-grapher');
const tabConverter = document.getElementById('tab-converter');
const panelGrapher = document.getElementById('panel-grapher');
const panelConverter = document.getElementById('panel-converter');

function switchTab(activeTabId, activePanelId) {
    const tabs = [tabHistory, tabConstants, tabGrapher, tabConverter];
    const panels = [panelHistory, panelConstants, panelGrapher, panelConverter];
    
    tabs.forEach(tab => {
        if (tab) tab.classList.toggle('active', tab.id === activeTabId);
    });
    panels.forEach(panel => {
        if (panel) panel.classList.toggle('active', panel.id === activePanelId);
    });
}

tabHistory.addEventListener('click', () => {
    switchTab('tab-history', 'panel-history');
    playClickSound();
});

tabConstants.addEventListener('click', () => {
    switchTab('tab-constants', 'panel-constants');
    playClickSound();
});

if (tabGrapher) {
    tabGrapher.addEventListener('click', () => {
        switchTab('tab-grapher', 'panel-grapher');
        playClickSound();
        // Redraw canvas with short delay to ensure rendering container is displayed
        setTimeout(drawGraph, 50);
    });
}

if (tabConverter) {
    tabConverter.addEventListener('click', () => {
        switchTab('tab-converter', 'panel-converter');
        playClickSound();
    });
}

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
        handleInput('×');
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

/* ----------------------------------------------------
   UTILITY DRAWER FEATURES: FUNCTION GRAPHER & CONVERTER
   ---------------------------------------------------- */

// 1. INTERACTIVE 2D GRAPH PLOTTER (NEON-STYLE)
let xMin = -10, xMax = 10;
let yMin = -10, yMax = 10;
let isPanning = false;
let startPanMouse = { x: 0, y: 0 };
let startPanCoords = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function drawGraph() {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);
    
    const toScreenX = (mx) => (mx - xMin) / (xMax - xMin) * width;
    const toScreenY = (my) => (yMax - my) / (yMax - yMin) * height;
    const toMathX = (sx) => xMin + (sx / width) * (xMax - xMin);
    const toMathY = (sy) => yMax - (sy / height) * (yMax - yMin);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '9px Share Tech Mono, monospace';
    ctx.fillStyle = '#64748b';
    
    const xRange = xMax - xMin;
    let gridSpacing = 1;
    if (xRange > 1000) gridSpacing = 100;
    else if (xRange > 200) gridSpacing = 50;
    else if (xRange > 50) gridSpacing = 10;
    else if (xRange > 15) gridSpacing = 5;
    else if (xRange < 1.5) gridSpacing = 0.1;
    else if (xRange < 0.3) gridSpacing = 0.02;
    
    let firstX = Math.ceil(xMin / gridSpacing) * gridSpacing;
    for (let mx = firstX; mx <= xMax; mx += gridSpacing) {
        let sx = toScreenX(mx);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
        
        let labelY = toScreenY(0);
        if (labelY < 12) labelY = 12;
        if (labelY > height - 6) labelY = height - 6;
        ctx.fillText(Number(mx.toFixed(3)), sx + 2, labelY - 2);
    }
    
    let firstY = Math.ceil(yMin / gridSpacing) * gridSpacing;
    for (let my = firstY; my <= yMax; my += gridSpacing) {
        let sy = toScreenY(my);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
        
        let labelX = toScreenX(0);
        if (labelX < 2) labelX = 2;
        if (labelX > width - 25) labelX = width - 25;
        if (Math.abs(my) > 1e-9) {
            ctx.fillText(Number(my.toFixed(3)), labelX + 2, sy - 2);
        }
    }
    
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    
    let zeroY = toScreenY(0);
    if (zeroY >= 0 && zeroY <= height) {
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(width, zeroY);
        ctx.stroke();
    }
    
    let zeroX = toScreenX(0);
    if (zeroX >= 0 && zeroX <= width) {
        ctx.beginPath();
        ctx.moveTo(zeroX, 0);
        ctx.lineTo(zeroX, height);
        ctx.stroke();
    }
    
    const exprInput = document.getElementById('graph-expr-input');
    const rawExpr = exprInput ? exprInput.value.trim() : "sin(x)";
    if (!rawExpr) return;
    
    ctx.beginPath();
    let isFirstPoint = true;
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00f2fe';
    
    for (let sx = 0; sx < width; sx++) {
        let mx = toMathX(sx);
        let my;
        try {
            my = evaluateGraphExpression(rawExpr, mx);
        } catch (e) {
            my = NaN;
        }
        
        if (typeof my === 'number' && !isNaN(my) && isFinite(my)) {
            let sy = toScreenY(my);
            if (sy >= -height && sy <= height * 2) {
                if (isFirstPoint) {
                    ctx.moveTo(sx, sy);
                    isFirstPoint = false;
                } else {
                    ctx.lineTo(sx, sy);
                }
            } else {
                isFirstPoint = true;
            }
        } else {
            isFirstPoint = true;
        }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function evaluateGraphExpression(rawExpr, mx) {
    let processed = rawExpr;
    // Implicit multiplication: x followed by digit (x2 -> x*2)
    processed = processed.replace(/(\bx\b)(?=\d)/g, '$1*');
    // Implicit multiplication: digit/parenthesis followed by x (2x -> 2*x, (x+1)x -> (x+1)*x)
    processed = processed.replace(/(\d|\)|π|e|Ans|%)(?=\bx\b)/g, '$1*');
    // Implicit multiplication: x followed by parenthesis/function (x(x+1) -> x*(x+1))
    processed = processed.replace(/(\bx\b)(?=sin\(|cos\(|tan\(|log\(|ln\(|√\(|π|e|Ans|\()/g, '$1*');
    
    // Replace x with the numeric value
    processed = processed.replace(/\bx\b/g, `(${mx})`);
    
    return evaluateExpression(processed);
}

function zoom(factor) {
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const xHalfRange = ((xMax - xMin) * factor) / 2;
    const yHalfRange = ((yMax - yMin) * factor) / 2;
    
    xMin = xCenter - xHalfRange;
    xMax = xCenter + xHalfRange;
    yMin = yCenter - yHalfRange;
    yMax = yCenter + yHalfRange;
    
    drawGraph();
}

function zoomAt(sx, sy, factor) {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const mx = xMin + (sx / width) * (xMax - xMin);
    const my = yMax - (sy / height) * (yMax - yMin);
    
    xMin = mx - (mx - xMin) * factor;
    xMax = mx + (xMax - mx) * factor;
    yMin = my - (my - yMin) * factor;
    yMax = my + (yMax - my) * factor;
    
    drawGraph();
}

function initGrapherEvents() {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;

    const exprInput = document.getElementById('graph-expr-input');
    if (exprInput) {
        exprInput.addEventListener('input', drawGraph);
    }

    const insertXBtn = document.getElementById('grapher-insert-x');
    if (insertXBtn && exprInput) {
        insertXBtn.addEventListener('click', () => {
            playClickSound();
            const start = exprInput.selectionStart || 0;
            const end = exprInput.selectionEnd || 0;
            const val = exprInput.value;
            exprInput.value = val.substring(0, start) + 'x' + val.substring(end);
            exprInput.focus();
            exprInput.selectionStart = exprInput.selectionEnd = start + 1;
            drawGraph();
        });
    }

    const zoomIn = document.getElementById('graph-zoom-in');
    const zoomOut = document.getElementById('graph-zoom-out');
    const zoomReset = document.getElementById('graph-zoom-reset');

    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            playClickSound();
            zoom(0.7);
        });
    }
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            playClickSound();
            zoom(1.4);
        });
    }
    if (zoomReset) {
        zoomReset.addEventListener('click', () => {
            playClickSound();
            xMin = -10; xMax = 10;
            yMin = -10; yMax = 10;
            drawGraph();
        });
    }

    canvas.addEventListener('mousedown', (e) => {
        isPanning = true;
        canvas.style.cursor = 'grabbing';
        startPanMouse.x = e.clientX;
        startPanMouse.y = e.clientY;
        startPanCoords.xMin = xMin;
        startPanCoords.xMax = xMax;
        startPanCoords.yMin = yMin;
        startPanCoords.yMax = yMax;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        const dx = e.clientX - startPanMouse.x;
        const dy = e.clientY - startPanMouse.y;
        
        const width = canvas.width;
        const height = canvas.height;
        
        const scaleX = (startPanCoords.xMax - startPanCoords.xMin) / width;
        const scaleY = (startPanCoords.yMax - startPanCoords.yMin) / height;
        
        xMin = startPanCoords.xMin - dx * scaleX;
        xMax = startPanCoords.xMax - dx * scaleX;
        yMin = startPanCoords.yMin + dy * scaleY;
        yMax = startPanCoords.yMax + dy * scaleY;
        
        drawGraph();
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'crosshair';
        }
    });

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isPanning = true;
            startPanMouse.x = e.touches[0].clientX;
            startPanMouse.y = e.touches[0].clientY;
            startPanCoords.xMin = xMin;
            startPanCoords.xMax = xMax;
            startPanCoords.yMin = yMin;
            startPanCoords.yMax = yMax;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!isPanning || e.touches.length !== 1) return;
        e.preventDefault();
        
        const dx = e.touches[0].clientX - startPanMouse.x;
        const dy = e.touches[0].clientY - startPanMouse.y;
        
        const width = canvas.width;
        const height = canvas.height;
        
        const scaleX = (startPanCoords.xMax - startPanCoords.xMin) / width;
        const scaleY = (startPanCoords.yMax - startPanCoords.yMin) / height;
        
        xMin = startPanCoords.xMin - dx * scaleX;
        xMax = startPanCoords.xMax - dx * scaleX;
        yMin = startPanCoords.yMin + dy * scaleY;
        yMax = startPanCoords.yMax + dy * scaleY;
        
        drawGraph();
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        isPanning = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
        zoomAt(mouseX, mouseY, zoomFactor);
    }, { passive: false });
}

// 2. OFFLINE UNIT CONVERTER
const conversionFactors = {
    length: {
        m: 1,
        km: 1000,
        cm: 0.01,
        mm: 0.001,
        mi: 1609.344,
        yd: 0.9144,
        ft: 0.3048,
        in: 0.0254
    },
    weight: {
        kg: 1,
        g: 0.001,
        lb: 0.45359237,
        oz: 0.028349523
    },
    area: {
        m2: 1,
        km2: 1000000,
        acre: 4046.85642,
        hectare: 10000
    },
    speed: {
        'm/s': 1,
        'km/h': 0.277777778,
        'mph': 0.44704
    }
};

const unitLabels = {
    length: { m: 'Meter (m)', km: 'Kilometer (km)', cm: 'Centimeter (cm)', mm: 'Millimeter (mm)', mi: 'Mile (mi)', yd: 'Yard (yd)', ft: 'Foot (ft)', in: 'Inch (in)' },
    weight: { kg: 'Kilogram (kg)', g: 'Gram (g)', lb: 'Pound (lb)', oz: 'Ounce (oz)' },
    temperature: { C: 'Celsius (°C)', F: 'Fahrenheit (°F)', K: 'Kelvin (K)' },
    area: { m2: 'Square Meter (m²)', km2: 'Square Kilometer (km²)', acre: 'Acre (ac)', hectare: 'Hectare (ha)' },
    speed: { 'm/s': 'Meter/Second (m/s)', 'km/h': 'Kilometer/Hour (km/h)', 'mph': 'Miles/Hour (mph)' }
};

function initConverter() {
    const categorySelect = document.getElementById('converter-category');
    const fromSelect = document.getElementById('converter-from-unit');
    const toSelect = document.getElementById('converter-to-unit');
    const fromValueInput = document.getElementById('converter-from-value');
    const toValueDisplay = document.getElementById('converter-to-value');
    const insertBtn = document.getElementById('converter-insert-btn');

    if (!categorySelect) return;

    function loadUnits() {
        const category = categorySelect.value;
        if (!category || !unitLabels[category]) return;
        const units = Object.keys(unitLabels[category]);
        
        fromSelect.innerHTML = "";
        toSelect.innerHTML = "";
        
        units.forEach((unit, idx) => {
            const opt1 = document.createElement('option');
            opt1.value = unit;
            opt1.innerText = unitLabels[category][unit];
            fromSelect.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = unit;
            opt2.innerText = unitLabels[category][unit];
            if (idx === 1 || (units.length === 1 && idx === 0)) {
                opt2.selected = true;
            }
            toSelect.appendChild(opt2);
        });
        
        recalculate();
    }

    function recalculate() {
        const category = categorySelect.value;
        if (!category || !unitLabels[category]) return;
        const fromUnit = fromSelect.value;
        const toUnit = toSelect.value;
        if (!fromUnit || !toUnit) return;
        const fromVal = parseFloat(fromValueInput.value);

        if (isNaN(fromVal)) {
            toValueDisplay.innerText = "0";
            return;
        }

        if (fromUnit === toUnit) {
            toValueDisplay.innerText = String(fromVal);
            return;
        }

        let result;
        if (category === 'temperature') {
            let tempInC;
            if (fromUnit === 'C') tempInC = fromVal;
            else if (fromUnit === 'F') tempInC = (fromVal - 32) * 5/9;
            else if (fromUnit === 'K') tempInC = fromVal - 273.15;

            if (toUnit === 'C') result = tempInC;
            else if (toUnit === 'F') result = (tempInC * 9/5) + 32;
            else if (toUnit === 'K') result = tempInC + 273.15;
        } else {
            const fromFactor = conversionFactors[category][fromUnit];
            const toFactor = conversionFactors[category][toUnit];
            const valInBase = fromVal * fromFactor;
            result = valInBase / toFactor;
        }

        if (typeof result === 'number') {
            result = parseFloat(result.toFixed(6));
        }
        toValueDisplay.innerText = String(result);
    }

    categorySelect.addEventListener('change', loadUnits);
    fromSelect.addEventListener('change', recalculate);
    toSelect.addEventListener('change', recalculate);
    fromValueInput.addEventListener('input', recalculate);

    if (insertBtn) {
        insertBtn.addEventListener('click', () => {
            if (!isPowerOn) return;
            playClickSound();
            const val = toValueDisplay.innerText;
            
            if (isResultDisplayed) {
                currentExpression = val;
                isResultDisplayed = false;
            } else {
                currentExpression += val;
            }
            expressionDisplay.innerText = currentExpression;

            if (window.innerWidth <= 640) {
                drawer.classList.remove('open');
                drawerToggleBtn.classList.remove('active');
            }
        });
    }

    loadUnits();
}

// Initial fire
initSettings();
initGrapherEvents();
initConverter();