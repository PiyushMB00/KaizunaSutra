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
                        <button class="mark-learned-btn">${isLearned(type, item.romaji) ? 'Learned ✓' : 'Mark Learned'}</button>
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

            // Flip click
            card.addEventListener('click', (e) => {
                if(e.target.classList.contains('mark-learned-btn') || e.target.classList.contains('audio-btn')) return;
                card.classList.toggle('flipped');
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

window.checkQuickQuizAnswer = function(selected, correct) {
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
