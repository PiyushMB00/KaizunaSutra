// Initialize tracking state
function initProgress() {
    // Migration from KaizunaSutra to KizunaSutra
    let progress = JSON.parse(localStorage.getItem('kizuna_progress'));
    if (!progress) {
        const oldProgress = localStorage.getItem('kaizuna_progress');
        if (oldProgress) {
            progress = JSON.parse(oldProgress);
        } else {
            progress = {
                hiragana: {}, katakana: {}, kanji: {}, vocabulary: {},
                streak: 0, lastStudyDate: null, quizCount: 0, correctAnswers: 0
            };
        }
        localStorage.setItem('kizuna_progress', JSON.stringify(progress));
    }
}

// Mark item as learned
function toggleLearned(type, itemKey) {
    const progress = JSON.parse(localStorage.getItem('kizuna_progress')) || {};
    if (!progress[type]) progress[type] = {};
    if (progress[type][itemKey]) {
        delete progress[type][itemKey];
    } else {
        progress[type][itemKey] = true;
    }
    localStorage.setItem('kizuna_progress', JSON.stringify(progress));
    return !!progress[type][itemKey];
}

// Check if learned
function isLearned(type, itemKey) {
    const progress = JSON.parse(localStorage.getItem('kizuna_progress')) || {};
    if (!progress[type]) progress[type] = {};
    return !!progress[type][itemKey];
}

let sessionLearnedCount = 0;
let recentLearnedItems = [];
let currentKanaData = [];

// Load Kana Data
async function loadKana(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(`/static/data/${type}.json`);
        const data = await response.json();
        currentKanaData = data;
        
        container.innerHTML = '';
        data.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `kana-card ${isLearned(type, item.romaji) ? 'learned' : ''}`;
            
            // Remove fake examples and only show if they exist in JSON
            let exampleHTML = '';
            if (item.example) {
                exampleHTML = `
                    <div style="color:var(--accent-color); margin-bottom:0.25rem; font-size: 0.85rem; line-height: 1.2;"><b>Ex:</b> ${item.example}</div>
                    <div style="color:var(--text-muted); margin-bottom:0.8rem; font-size: 0.8rem; line-height: 1.2;"><b>Mean:</b> ${item.example_meaning}</div>
                `;
            } else {
                exampleHTML = `<div style="margin-bottom: 0.8rem;"></div>`;
            }

            card.innerHTML = `
                <div class="kana-card-inner">
                    <div class="kana-card-front">
                        <i class="fa-solid fa-volume-high audio-btn" title="Play Pronunciation"></i>
                        <div class="kana-char" style="font-size: 3.5rem;">${item.kana}</div>
                        <div class="kana-romaji" style="margin-top:0.2rem; font-size:1.3rem; font-weight:bold; color: var(--text-main)">${item.romaji.toUpperCase()}</div>
                        <i class="fa-solid fa-arrows-rotate flip-icon" title="Flip Card"></i>
                    </div>
                    <div class="kana-card-back">
                        <div style="font-size: 1.5rem; margin-bottom:0.5rem; font-weight:bold; color: var(--text-main)">${item.kana}</div>
                        <div style="font-size: 1.1rem; margin-bottom:0.5rem; color: var(--accent-color)">${item.romaji.toUpperCase()}</div>
                        ${exampleHTML}
                        <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                            <button class="mark-learned-btn" style="flex: 1;">${isLearned(type, item.romaji) ? 'Learned ✓' : 'Mark Learned'}</button>
                            <button class="writing-btn-trigger" title="Practice Writing" style="background: var(--surface-color); border: 1px solid var(--border-color); color: #fff; padding: 0.5rem; border-radius: 8px; cursor: pointer;">
                                <i class="fa-solid fa-pen-nib"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Audio click
            const audioBtn = card.querySelector('.audio-btn');
            audioBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card flip
                const utterance = new SpeechSynthesisUtterance(item.kana);
                utterance.lang = 'ja-JP';
                speechSynthesis.speak(utterance);
            });

            // Card click -> Open Practice
            card.addEventListener('click', (e) => {
                if(e.target.closest('.mark-learned-btn') || e.target.closest('.audio-btn')) return;
                startPracticeSession(data, index, type);
            });

            // Mark learned
            const markBtn = card.querySelector('.mark-learned-btn');
            markBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const learned = toggleLearned(type, item.romaji);
                if (learned) {
                    card.classList.add('learned');
                    markBtn.innerText = 'Learned ✓';
                    checkQuickQuiz(type, item);
                } else {
                    card.classList.remove('learned');
                    markBtn.innerText = 'Mark as Learned';
                }
            });

            container.appendChild(card);
        });
    } catch (error) {
        console.error(`Error loading ${type}:`, error);
        container.innerHTML = '<p>Error loading character data.</p>';
    }
}

function checkQuickQuiz(type, item) {
    sessionLearnedCount++;
    recentLearnedItems.push(item);
    if (sessionLearnedCount % 5 === 0) {
        triggerQuickQuiz(type);
    }
}

function triggerQuickQuiz(type) {
    const targetItem = recentLearnedItems[Math.floor(Math.random() * recentLearnedItems.length)];
    
    let modal = document.getElementById('quick-quiz-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quick-quiz-modal';
        document.body.appendChild(modal);
    }
    
    const options = [targetItem.romaji];
    while(options.length < 4 && currentKanaData.length >= 4) {
        const randItem = currentKanaData[Math.floor(Math.random() * currentKanaData.length)];
        if(!options.includes(randItem.romaji)) options.push(randItem.romaji);
    }
    options.sort(() => Math.random() - 0.5); // Shuffle
    
    let optionsHtml = options.map(opt => `<button class="quiz-opt-btn" onclick="checkQuickQuizAnswer('${opt}', '${targetItem.romaji}')">${opt}</button>`).join('');
    
    modal.innerHTML = `
        <div class="quiz-modal-content">
            <h2 style="color:var(--accent-color); margin-bottom:0.5rem">Quick Test Time!</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem">You learned 5 new characters. Let's practice.</p>
            <p style="font-size:1.2rem; margin-bottom:1.5rem">What is <span style="font-size:2.5rem; font-weight:bold; color:white;">${targetItem.kana}</span> ?</p>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            <p id="quick-quiz-feedback" style="margin-top:1.5rem; font-weight:bold; height:20px; font-size: 1.1rem;"></p>
        </div>
    `;
    modal.classList.add('active');
}

function checkQuickQuizAnswer(selected, correct) {
    const feedback = document.getElementById('quick-quiz-feedback');
    const buttons = document.querySelectorAll('.quiz-opt-btn');
    
    buttons.forEach(btn => {
        btn.disabled = true;
        if(btn.innerText === correct) {
            btn.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
            btn.style.borderColor = 'var(--success-color)';
        } else if (btn.innerText === selected && selected !== correct) {
            btn.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            btn.style.borderColor = '#ef4444';
        }
    });

    if(selected === correct) {
        feedback.style.color = 'var(--success-color)';
        feedback.innerText = 'Correct! Great job.';
        setTimeout(() => {
            document.getElementById('quick-quiz-modal').classList.remove('active');
            recentLearnedItems = []; // Reset for next batch
        }, 1500);
    } else {
        feedback.style.color = '#ef4444';
        feedback.innerText = 'Oops! Try again next time.';
        setTimeout(() => {
            document.getElementById('quick-quiz-modal').classList.remove('active');
        }, 2000);
    }
}

// Highlight active navigation link
function setActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Match exact path or if current path is '/' and link is '/'
        if (linkHref === currentPath || (currentPath === '/' && linkHref === '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Entry point
document.addEventListener('DOMContentLoaded', () => {
    initProgress();
    setActiveNav();
    
    // Page specific initializations
    if (document.getElementById('hiragana-grid')) {
        loadKana('hiragana', 'hiragana-grid');
    }
    
    if (document.getElementById('katakana-grid')) {
        loadKana('katakana', 'katakana-grid');
    }

    // Generic animations for elements (removed opacity for visibility)
    gsap.from(".hero h1", { y: -30, duration: 0.8, ease: "power3.out" });
    gsap.from(".hero p", { y: 20, duration: 0.8, delay: 0.2, ease: "power3.out" });
    gsap.from(".hero-buttons", { y: 20, duration: 0.8, delay: 0.4, ease: "power3.out" });
    gsap.from(".feature-card", { 
        y: 30, 
        duration: 0.6, 
        stagger: 0.1, 
        delay: 0.3,
        ease: "power2.out",
        scrollTrigger: {
            trigger: ".features",
            start: "top 80%"
        }
    });
});

// Practice Session System
let writingCanvas, ctx;
let isDrawing = false;
let currentWritingChar = '';
let globalPracticeData = [];
let globalPracticeIndex = 0;
let globalPracticeType = '';

// XP System State
let userXP = parseInt(localStorage.getItem('kizuna_xp') || '0');
let userLevel = Math.floor(userXP / 100) + 1;

function updateXPDisplay() {
    const xpEl = document.getElementById('user-xp');
    const lvlEl = document.getElementById('user-level');
    if (xpEl) xpEl.textContent = `${userXP} XP`;
    if (lvlEl) lvlEl.textContent = `Lvl ${Math.floor(userXP / 100) + 1}`;
}

function addXP(amount) {
    userXP += amount;
    localStorage.setItem('kizuna_xp', userXP.toString());
    updateXPDisplay();
}

function playSound(type) {
    const sounds = {
        success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
        reward: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        trace: 'https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.3;
    audio.play().catch(e => console.log("Audio play blocked"));
}

function startPracticeSession(data, index, type) {
    globalPracticeData = data;
    globalPracticeIndex = index;
    globalPracticeType = type;
    playSound('click');
    
    const item = data[index];
    const char = (type === 'vocabulary') ? item.kanji : (item.kana || item.kanji);
    openWritingModal(char);
}

function openNextWritingItem() {
    if (globalPracticeIndex + 1 < globalPracticeData.length) {
        globalPracticeIndex++;
        const item = globalPracticeData[globalPracticeIndex];
        const char = (globalPracticeType === 'vocabulary') ? item.kanji : (item.kana || item.kanji);
        openWritingModal(char);
        playSound('click');
    } else {
        alert("You've reached the end of this list!");
        document.getElementById('writing-modal').classList.remove('active');
    }
}

function openWritingModal(char) {
    currentWritingChar = char;
    const modal = document.getElementById('writing-modal');
    document.getElementById('large-kana-preview').textContent = char;
    document.getElementById('simulated-kana').textContent = char;
    document.getElementById('canvas-guide').textContent = char;
    
    modal.classList.add('active');
    goToStep(1);
    initCanvas();
    updateXPDisplay();
}

function goToStep(stepNum) {
    document.querySelectorAll('.writing-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`writing-step-${stepNum}`).classList.add('active');
    playSound('click');
    
    if (stepNum === 2) {
        startStrokeAnimation();
    } else if (stepNum === 3) {
        clearCanvas();
    }
}

function initCanvas() {
    writingCanvas = document.getElementById('writing-canvas');
    if (!writingCanvas) return;
    ctx = writingCanvas.getContext('2d');
    ctx.strokeStyle = '#f97316'; 
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    writingCanvas.addEventListener('mousedown', (e) => { startDrawing(e); playSound('trace'); });
    writingCanvas.addEventListener('mousemove', draw);
    writingCanvas.addEventListener('mouseup', stopDrawing);
    writingCanvas.addEventListener('mouseout', stopDrawing);
    
    writingCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); playSound('trace'); });
    writingCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
    writingCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    ctx.beginPath();
    const rect = writingCanvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = writingCanvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, writingCanvas.width, writingCanvas.height);
}

const strokeData = {
    // Hiragana Vowels
    "あ": ["M20 40 L80 40", "M50 15 L50 85", "M45 45 Q20 50 20 70 Q20 85 45 85 Q75 85 75 55 Q75 35 45 35"],
    "い": ["M30 20 Q20 50 30 80", "M70 30 Q80 50 70 70"],
    "う": ["M35 15 L65 25", "M30 45 Q80 45 80 75 Q80 85 50 85"],
    "え": ["M30 20 L50 20", "M25 50 L75 50 L30 85 L75 85"],
    "お": ["M20 40 L70 40", "M45 15 L45 85", "M75 15 L85 25"],
    // K-column
    "か": ["M25 35 Q65 35 65 65 Q65 85 40 85", "M50 15 L50 40", "M70 25 L80 35"],
    "き": ["M30 30 L70 30", "M30 45 L70 45", "M50 15 Q50 80 30 80", "M45 65 Q70 65 70 85"],
    "く": ["M70 20 L25 50 L70 80"],
    "け": ["M25 20 Q20 50 25 80", "M40 30 L75 30", "M60 15 L60 85"],
    "こ": ["M30 35 L70 35", "M30 75 L70 75"],
    // S-column
    "さ": ["M30 35 L70 35", "M50 15 Q50 80 30 80", "M45 65 Q70 65 70 85"],
    "し": ["M40 20 L40 60 Q40 85 80 85"],
    "す": ["M20 35 L80 35", "M50 15 Q50 60 40 60 Q30 60 30 50 Q30 40 50 40 Q50 40 50 85"],
    "せ": ["M20 40 L80 40", "M65 25 L65 70", "M35 25 Q35 75 55 75"],
    "そ": ["M25 25 L75 25 L25 75 L75 75"],
    // T-column
    "た": ["M25 40 L55 40", "M40 20 L40 60", "M65 35 L85 35", "M65 65 L85 65"],
    "ち": ["M25 35 L75 35", "M50 15 Q50 50 30 50 Q20 50 20 70 Q20 85 50 85"],
    "つ": ["M20 30 Q80 30 80 60 Q80 85 40 85"],
    "て": ["M20 30 L80 30 Q80 80 40 80"],
    "と": ["M55 20 L45 45", "M40 45 Q80 45 80 75 Q80 85 50 85"],
    // N-column
    "な": ["M25 40 L50 40", "M40 25 L40 55", "M65 25 L75 35", "M55 55 Q35 55 35 75 Q35 85 55 85 Q75 85 75 65"],
    "に": ["M25 20 Q20 50 25 80", "M45 40 L75 40", "M45 70 L75 70"],
    "ぬ": ["M30 20 L70 80", "M70 20 Q10 40 30 85 Q80 85 80 65 Q80 55 70 55 Q60 55 60 65"],
    "ね": ["M35 15 L35 85", "M20 35 L80 35 L30 80 L80 80 Q80 70 70 70 Q60 70 60 80"],
    "の": ["M50 45 Q20 45 20 70 Q20 85 50 85 Q80 85 80 50 Q80 20 40 20"],
    // H-column
    "は": ["M25 20 Q20 50 25 80", "M40 40 L75 40", "M55 25 Q55 85 35 85"],
    "ひ": ["M20 30 Q50 30 50 60 Q50 85 80 30"],
    "ふ": ["M50 15 L50 30", "M30 45 Q20 65 30 85", "M70 45 Q80 65 70 85", "M40 60 Q50 80 60 60"],
    "へ": ["M20 70 L50 30 L80 70"],
    "ほ": ["M25 20 Q20 50 25 80", "M40 35 L75 35", "M40 55 L75 55", "M55 25 Q55 85 35 85"],
    // M-column
    "ま": ["M30 35 L70 35", "M30 55 L70 55", "M50 15 Q50 85 30 85"],
    "み": ["M25 30 L75 30 Q25 60 25 80 Q25 85 45 85 Q75 85 75 55"],
    "む": ["M25 40 L75 40", "M50 15 Q50 85 30 85", "M70 25 L80 35"],
    "め": ["M30 20 L70 80", "M70 20 Q10 40 30 85 Q80 85 80 50 Q80 20 40 20"],
    "も": ["M50 15 Q50 85 30 85", "M30 40 L70 40", "M30 60 L70 60"],
    // Y-column
    "や": ["M25 45 Q75 45 75 85", "M45 25 L45 45", "M65 25 L75 35"],
    "ゆ": ["M50 20 Q20 40 30 85 Q80 85 80 50 Q80 20 40 20", "M40 15 L40 85"],
    "よ": ["M30 40 L50 40", "M60 15 Q60 85 30 85"],
    // R-column
    "ら": ["M35 15 L65 25", "M40 45 Q80 45 80 75 Q80 85 50 85"],
    "り": ["M30 20 Q20 50 25 80", "M70 20 Q80 50 70 85"],
    "る": ["M25 25 L75 25 L30 80 Q80 80 80 65 Q80 55 70 55 Q60 55 60 65"],
    "れ": ["M35 15 L35 85", "M20 35 L80 35 L30 80 Q80 80 80 40"],
    "ろ": ["M25 25 L75 25 L30 80 Q80 80 80 65"],
    // W-column
    "わ": ["M35 15 L35 85", "M20 35 L80 35 L30 85 Q80 85 80 50 Q80 20 40 20"],
    "を": ["M20 35 L80 35", "M45 15 L35 85", "M45 60 Q80 60 80 85"],
    "ん": ["M30 20 L25 80 Q60 15 80 80"]
};

let strokeAnimationIntervals = [];

function startStrokeAnimation() {
    const container = document.getElementById('stroke-animation-container');
    const char = currentWritingChar;
    
    // Clear any existing intervals
    strokeAnimationIntervals.forEach(clearInterval);
    strokeAnimationIntervals.forEach(clearTimeout);
    strokeAnimationIntervals = [];
    
    if (strokeData[char]) {
        renderStrokeSVG(char, container);
    } else {
        container.innerHTML = `<div id="simulated-kana" class="large-kana-preview">${char}</div>`;
        const el = document.getElementById('simulated-kana');
        el.style.opacity = '0';
        el.style.filter = 'blur(10px)';
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.1;
            el.style.opacity = progress;
            el.style.filter = `blur(${10 - progress * 10}px)`;
            if (progress >= 1) clearInterval(interval);
        }, 100);
        strokeAnimationIntervals.push(interval);
    }
}

function renderStrokeSVG(char, container) {
    const paths = strokeData[char];
    container.innerHTML = '';
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.style.width = "250px";
    svg.style.height = "250px";
    
    const strokeNumbers = ["①", "②", "③", "④", "⑤"];
    
    paths.forEach((d, i) => {
        // Create path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("stroke", "rgba(255,255,255,0.2)"); // Background stroke
        path.setAttribute("stroke-width", "8");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        svg.appendChild(path);
        
        // Create animated path
        const animatedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        animatedPath.setAttribute("d", d);
        animatedPath.setAttribute("stroke", "white");
        animatedPath.setAttribute("stroke-width", "8");
        animatedPath.setAttribute("fill", "none");
        animatedPath.setAttribute("stroke-linecap", "round");
        animatedPath.classList.add('stroke-path');
        svg.appendChild(animatedPath);
        
        // Add number indicator
        const startPoint = d.split(' ')[0].substring(1).split(' '); // Rough M x y
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", parseInt(startPoint[0]) - 8);
        text.setAttribute("y", parseInt(startPoint[1]) - 8);
        text.setAttribute("class", "stroke-number");
        text.style.opacity = "0";
        text.textContent = strokeNumbers[i] || (i + 1);
        svg.appendChild(text);
        
        // Animate sequentially
        setTimeout(() => {
            animatedPath.style.strokeDashoffset = "0";
            text.style.opacity = "1";
            playSound('trace');
        }, i * 1200);
    });
    
    container.appendChild(svg);
}

function checkTracingAccuracy() {
    const refCanvas = document.createElement('canvas');
    refCanvas.width = 300;
    refCanvas.height = 300;
    const refCtx = refCanvas.getContext('2d');
    
    const fontSize = currentWritingChar.length > 2 ? '5rem' : '10rem';
    refCtx.font = `${fontSize} "Hiragino Kaku Gothic Pro", "Meiryo", sans-serif`;
    refCtx.fillStyle = 'white';
    refCtx.textAlign = 'center';
    refCtx.textBaseline = 'middle';
    refCtx.fillText(currentWritingChar, 150, 150);
    
    const refData = refCtx.getImageData(0, 0, 300, 300).data;
    const userData = ctx.getImageData(0, 0, 300, 300).data;
    
    let totalRefPixels = 0;
    let matchingPixels = 0;
    
    for (let i = 0; i < refData.length; i += 4) {
        if (refData[i] > 0) { 
            totalRefPixels++;
            if (userData[i + 3] > 0) { 
                matchingPixels++;
            }
        }
    }
    
    const accuracy = Math.round((matchingPixels / (totalRefPixels || 1)) * 100);
    showWritingResults(accuracy);
}

function showWritingResults(accuracy) {
    goToStep(4);
    const feedbackEl = document.getElementById('accuracy-feedback');
    const messageEl = document.getElementById('feedback-message');
    
    feedbackEl.textContent = `Accuracy: ${accuracy}%`;
    
    let tier = "";
    let color = "";
    
    if (accuracy >= 95) {
        tier = "Perfect!";
        color = "var(--success-color)";
        playSound('success');
    } else if (accuracy >= 80) {
        tier = "Excellent!";
        color = "#10b981";
        playSound('success');
    } else if (accuracy >= 65) {
        tier = "Good!";
        color = "var(--accent-color)";
        playSound('success');
    } else {
        tier = "Practice More";
        color = "var(--text-muted)";
    }
    
    feedbackEl.textContent = `${tier} (${accuracy}%)`;
    feedbackEl.style.color = color;
    messageEl.textContent = accuracy >= 65 ? "Great job! You've mastered the form." : "Focus on following the guide more closely.";
}

function closeWritingModal() {
    document.getElementById('writing-modal').classList.remove('active');
    resetWritingState();
}

function resetWritingState() {
    isDrawing = false;
    strokeAnimationIntervals.forEach(clearInterval);
    strokeAnimationIntervals.forEach(clearTimeout);
    strokeAnimationIntervals = [];
    if (ctx) clearCanvas();
}

document.getElementById('close-writing-modal')?.addEventListener('click', closeWritingModal);
document.getElementById('finish-writing-btn')?.addEventListener('click', closeWritingModal);

document.getElementById('next-writing-btn')?.addEventListener('click', () => {
    addXP(5);
    playSound('reward');
    showReward("Stroke Master", "+5 XP");
    setTimeout(openNextWritingItem, 600);
});

function showReward(title, xp) {
    const reward = document.createElement('div');
    reward.className = 'reward-popup';
    reward.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🏆</div>
        <h2 style="margin-bottom: 0.5rem;">${title}</h2>
        <div style="font-size: 1.5rem; font-weight: bold; color: #fff;">${xp}</div>
    `;
    document.body.appendChild(reward);
    
    setTimeout(() => {
        gsap.to(reward, { y: -50, opacity: 0, duration: 0.5, onComplete: () => reward.remove() });
    }, 1500);
}

// Initial XP Update
document.addEventListener('DOMContentLoaded', updateXPDisplay);

window.goToStep = goToStep;
window.clearCanvas = clearCanvas;
window.checkTracingAccuracy = checkTracingAccuracy;
window.openWritingModal = openWritingModal;
window.startPracticeSession = startPracticeSession;
