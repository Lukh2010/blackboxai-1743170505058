const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');

// Sound effects
const spinSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-slot-machine-spin-1930.mp3');
const winSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');

// Create 6 segments (3 Dark, 3 Light)
const segments = [
    { text: "DARK", color: "#000000", textColor: "#ffffff" },
    { text: "LIGHT", color: "#ffffff", textColor: "#000000" },
    { text: "DARK", color: "#000000", textColor: "#ffffff" },
    { text: "LIGHT", color: "#ffffff", textColor: "#000000" },
    { text: "DARK", color: "#000000", textColor: "#ffffff" },
    { text: "LIGHT", color: "#ffffff", textColor: "#000000" }
];

// Add segments to wheel
segments.forEach((seg, i) => {
    const angle = (360 / segments.length) * i;
    const segment = document.createElement('div');
    segment.className = 'segment';
    segment.textContent = seg.text;
    segment.style.backgroundColor = seg.color;
    segment.style.color = seg.textColor;
    segment.style.transform = `rotate(${angle}deg) skewY(${90 - (360 / segments.length)}deg)`;
    wheel.appendChild(segment);
});

let currentRotation = 0;
let nextOutcome = null; // null = random, 'dark' or 'light'
let isSpinning = false;

// Create rigged spin indicator
const riggedIndicator = document.createElement('div');
riggedIndicator.className = 'rigged-indicator';
document.body.appendChild(riggedIndicator);

document.addEventListener('keydown', (e) => {
    if (isSpinning) return;
    
    if (e.key.toLowerCase() === 'n') {
        nextOutcome = 'dark';
        riggedIndicator.textContent = 'NEXT SPIN: DARK';
        riggedIndicator.style.backgroundColor = '#000000';
        riggedIndicator.style.color = '#ffffff';
        riggedIndicator.style.opacity = '1';
        setTimeout(() => { riggedIndicator.style.opacity = '0'; }, 2000);
    } else if (e.key.toLowerCase() === 'm') {
        nextOutcome = 'light';
        riggedIndicator.textContent = 'NEXT SPIN: LIGHT';
        riggedIndicator.style.backgroundColor = '#ffffff';
        riggedIndicator.style.color = '#000000';
        riggedIndicator.style.opacity = '1';
        setTimeout(() => { riggedIndicator.style.opacity = '0'; }, 2000);
    }
});

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    
    isSpinning = true;
    spinBtn.disabled = true;
    
    // Play spin sound
    spinSound.currentTime = 0; // Reset sound to start
    spinSound.play();
    
    // Fast spinning phase (3 seconds)
    const fastSpins = 20;
    const fastDuration = 3000;
    
    let startTime = Date.now();
    let fastRotation = currentRotation;
    
    const fastSpin = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fastDuration, 1);
        
        fastRotation = currentRotation + (fastSpins * 360 * progress);
        wheel.style.transform = `rotate(${fastRotation}deg)`;
        
        if (progress < 1) {
            requestAnimationFrame(fastSpin);
        } else {
            // Slow down to target segment
            let targetRotation;
            const segmentAngle = 360 / segments.length;
            
            const segmentOffset = segmentAngle * 0.8; // Slightly less than half segment to ensure landing
            if (nextOutcome === 'dark') {
                // Find all dark segments
                const darkIndices = segments.map((seg, i) => seg.text === 'DARK' ? i : -1).filter(i => i !== -1);
                const randomDarkIndex = darkIndices[Math.floor(Math.random() * darkIndices.length)];
                targetRotation = fastRotation + 1800 + (segmentAngle * randomDarkIndex) + segmentOffset;
            } else if (nextOutcome === 'light') {
                // Find all light segments
                const lightIndices = segments.map((seg, i) => seg.text === 'LIGHT' ? i : -1).filter(i => i !== -1);
                const randomLightIndex = lightIndices[Math.floor(Math.random() * lightIndices.length)];
                targetRotation = fastRotation + 1800 + (segmentAngle * randomLightIndex) + segmentOffset;
            } else {
                // Random segment if no rigging
                targetRotation = fastRotation + 1800 + (Math.floor(Math.random() * segments.length) * segmentAngle) + segmentOffset;
            }
            
            wheel.style.transition = 'transform 3s cubic-bezier(0.1, 0.4, 0.2, 1)';
            wheel.style.transform = `rotate(${targetRotation}deg)`;
            
            setTimeout(() => {
                // Calculate winning segment
                const segmentAngle = 360 / segments.length;
                const normalizedRotation = (360 - (targetRotation % 360)) % 360;
                const winningIndex = Math.floor(normalizedRotation / segmentAngle);
                const winner = segments[winningIndex];
                
                // Update UI with the correct winner
                const winnerText = nextOutcome ? nextOutcome.toUpperCase() : winner.text;
                document.getElementById('winnerName').textContent = winnerText;
                document.getElementById('winnerName').style.color = winnerText === 'DARK' ? '#ffffff' : '#000000';
                document.getElementById('winnerDisplay').style.backgroundColor = winnerText === 'DARK' ? '#000000' : '#ffffff';
                
                // Play win sound
                winSound.currentTime = 0;
                winSound.play();
                
                // Trigger confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                // Reset for next spin
                setTimeout(() => {
                    spinBtn.disabled = false;
                    currentRotation = targetRotation % 360;
                    isSpinning = false;
                    nextOutcome = null;
                    wheel.style.transition = 'none';
                    wheel.style.transform = `rotate(${currentRotation}deg)`;
                    setTimeout(() => {
                        wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
                    }, 50);
                }, 100);
                
                // Log the actual result (not the rigged outcome)
                const actualWinner = winner.text; // Get the actual segment landed on
                fetch('/log', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({result: actualWinner})
                }).then(() => {
                    // Update history display
                    fetch('/logs')
                        .then(res => res.json())
                        .then(data => {
                            const historyList = document.getElementById('historyList');
                            historyList.innerHTML = data.logs.map(result => 
                                `<div style="margin:5px 0; padding:5px; background:rgba(0,0,0,0.1); border-radius:5px;">
                                    ${result}
                                </div>`
                            ).join('');
                        });
                });
            }, 3000);
        }
    };
    
    requestAnimationFrame(fastSpin);
});