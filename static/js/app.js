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

// Load Kana Data
async function loadKana(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(`/static/data/${type}.json`);
        const data = await response.json();
        
        container.innerHTML = '';
        data.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `kana-card ${isLearned(type, item.romaji) ? 'learned' : ''}`;
            card.innerHTML = `
                <div class="kana-char">${item.kana}</div>
                <div class="kana-romaji">${item.romaji}</div>
            `;
            
            // Toggle learned state on click
            card.addEventListener('click', () => {
                const learned = toggleLearned(type, item.romaji);
                if (learned) {
                    card.classList.add('learned');
                    gsap.from(card, {
                        scale: 1.1,
                        boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)",
                        duration: 0.3
                    });
                } else {
                    card.classList.remove('learned');
                }
            });

            // Removed entrance animation for visibility


            container.appendChild(card);
        });
    } catch (error) {
        console.error(`Error loading ${type}:`, error);
        container.innerHTML = '<p>Error loading character data.</p>';
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
