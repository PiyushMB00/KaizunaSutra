let vocabData = [];

async function loadVocabulary() {
    const container = document.getElementById('vocab-list');
    if (!container) return;

    try {
        const response = await fetch('/static/data/vocabulary.json');
        vocabData = await response.json();
        renderVocabulary(vocabData);
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        container.innerHTML = '<p>Error loading vocabulary data.</p>';
    }
}

function renderVocabulary(data) {
    const container = document.getElementById('vocab-list');
    container.innerHTML = '';

    data.forEach((item, index) => {
        const card = document.createElement('div');
        const isItemLearned = isLearned('vocabulary', item.romaji);
        card.className = `vocab-card ${isItemLearned ? 'learned' : ''}`;
        
        card.innerHTML = `
                <div class="kanji-tags">
                    <span class="jlpt-tag ${item.level}">${item.level}</span>
                </div>
                <i class="fa-solid fa-volume-high audio-btn vocab-audio" title="Play Pronunciation"></i>
                <div class="vocab-kana">${item.kanji}</div>
                <div class="vocab-kanji">${item.romaji}</div>
                <div class="vocab-content">
                    <div class="vocab-meaning">${item.meaning}</div>
                </div>
                <div class="vocab-action">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
            `;
        
        // Audio click
        const audioBtn = card.querySelector('.audio-btn');
        audioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const utterance = new SpeechSynthesisUtterance(item.kanji);
            utterance.lang = 'ja-JP';
            speechSynthesis.speak(utterance);
        });

        card.addEventListener('click', (e) => {
            if(e.target.closest('.audio-btn')) return;
            startPracticeSession(data, index, 'vocabulary');
        });

        container.appendChild(card);
        
        // Removed entrance animation for visibility
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('vocab-list')) {
        loadVocabulary();
        
        const searchInput = document.getElementById('vocab-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filteredData = vocabData.filter(item => 
                    item.romaji.toLowerCase().includes(query) || 
                    item.meaning.toLowerCase().includes(query) ||
                    item.kanji.includes(query)
                );
                renderVocabulary(filteredData);
            });
        }
    }
});
