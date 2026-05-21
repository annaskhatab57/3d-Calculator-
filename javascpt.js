const input = document.getElementById('inputbox');
const buttons = document.querySelectorAll('button');
// optional click sound element (place your audio at assets/click.mp3)
const clickSound = document.getElementById('click-sound');

let string = "";

if (input && buttons.length) {
    const arr = Array.from(buttons);
    arr.forEach(button => {
        button.addEventListener('click', (e) => {
            const btnValue = (e.target && e.target.innerText) ? e.target.innerText.trim() : '';

            // Play click sound (guarded). reset to start so rapid clicks replay.
            if (clickSound) {
                try { clickSound.currentTime = 0; clickSound.play(); } catch (err) { /* ignore play errors */ }
            }

            if (btnValue === '=') {
                try {
                    const safeExpression = string.replace(/x/g, '*').replace(/×/g, '*').replace(/%/g, '/100');
                
                    const result = eval(safeExpression);
                    string = (result === undefined || result === null) ? '' : String(result);
                    input.value = string;
                } catch (err) {
                    input.value = 'Error';
                    string = '';
                }

            } else if (btnValue === 'AC') {
                string = '';
                input.value = '';

            } else if (btnValue === 'DEL') {
                string = string.substring(0, string.length - 1);
                input.value = string;

            } else {
                string += btnValue;
                input.value = string;
            }
        });
    });
} else {
    // Optional: log to console for debugging during development
    console.warn('Calculator input or buttons not found in DOM');
}