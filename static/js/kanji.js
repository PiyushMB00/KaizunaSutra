async function loadKanji() {
    const container = document.getElementById('kanji-list');
    if (!container) return;

    try {
        const response = await fetch('/static/data/kanji.json');
        const data = await response.json();
        
        container.innerHTML = '';
        data.forEach((item, index) => {
            const card = document.createElement('div');
            const isItemLearned = isLearned('kanji', item.kanji);
            card.className = `kanji-card ${isItemLearned ? 'learned' : ''}`;
            
            card.innerHTML = `
                <div class="kanji-tags">
                    <span class="jlpt-tag ${item.level}">${item.level}</span>
                    <span class="stroke-tag"><i class="fa-solid fa-pen"></i> ${item.strokes} strokes</span>
                </div>
                <div class="kanji-char special-kanji">${item.kanji}</div>
                <div class="kanji-category">${item.category}</div>
                <div class="kanji-details">
                    <div class="kanji-meaning">${item.meaning}</div>
                    <div class="kanji-reading">Onyomi: <span>${item.onyomi}</span></div>
                    <div class="kanji-reading">Kunyomi: <span>${item.kunyomi}</span></div>
                </div>
                <div class="kanji-action">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
            `;
            
            card.addEventListener('click', () => {
                const learned = toggleLearned('kanji', item.kanji);
                if (learned) {
                    card.classList.add('learned');
                    gsap.from(card, {
                        x: 10,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                } else {
                    card.classList.remove('learned');
                }
            });

            container.appendChild(card);
            
            // Removed entrance animation for visibility
        });
    } catch (error) {
        console.error('Error loading kanji:', error);
        container.innerHTML = '<p>Error loading kanji data.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('kanji-list')) {
        loadKanji();
    }
});
