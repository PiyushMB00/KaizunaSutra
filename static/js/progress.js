document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('stat-streak')) return; // Not on dashboard
    
    const progress = JSON.parse(localStorage.getItem('kizuna_progress')) || {
        hiragana: {}, katakana: {}, kanji: {}, vocabulary: {}, streak: 0, quizCount: 0, correctAnswers: 0
    };

    // Update basic stats
    const hCount = Object.keys(progress.hiragana || {}).length;
    const kCount = Object.keys(progress.katakana || {}).length;
    const kjCount = Object.keys(progress.kanji || {}).length;
    const vCount = Object.keys(progress.vocabulary || {}).length;
    
    document.getElementById('stat-streak').textContent = progress.streak || 0;
    document.getElementById('stat-hiragana').textContent = hCount;
    document.getElementById('stat-katakana').textContent = kCount;
    document.getElementById('stat-kanji').textContent = kjCount;
    document.getElementById('stat-vocab').textContent = vCount;
    
    // Quiz Accuracy
    const accEl = document.getElementById('stat-accuracy');
    if (accEl) {
        if (progress.quizCount > 0) {
            accEl.textContent = Math.round((progress.correctAnswers / progress.quizCount) * 100) + '%';
        } else {
            accEl.textContent = '0%';
        }
    }

    // Load totals for percentage calculation
    try {
        const [hRes, kRes, kjRes, vRes] = await Promise.all([
            fetch('/static/data/hiragana.json'),
            fetch('/static/data/katakana.json'),
            fetch('/static/data/kanji.json'),
            fetch('/static/data/vocabulary.json')
        ]);
        
        const hData = await hRes.json();
        const kData = await kRes.json();
        const kjData = await kjRes.json();
        const vData = await vRes.json();
        
        const hPct = hData.length ? Math.round((hCount / hData.length) * 100) : 0;
        const kPct = kData.length ? Math.round((kCount / kData.length) * 100) : 0;
        const kjPct = kjData.length ? Math.round((kjCount / kjData.length) * 100) : 0;
        const vPct = vData.length ? Math.round((vCount / vData.length) * 100) : 0;

        document.getElementById('pct-hiragana').textContent = `${hPct}%`;
        document.getElementById('pct-katakana').textContent = `${kPct}%`;
        document.getElementById('pct-kanji').textContent = `${kjPct}%`;
        document.getElementById('pct-vocab').textContent = `${vPct}%`;

        // Animate bars
        setTimeout(() => {
            document.getElementById('bar-hiragana').style.width = `${hPct}%`;
            document.getElementById('bar-katakana').style.width = `${kPct}%`;
            document.getElementById('bar-kanji').style.width = `${kjPct}%`;
            document.getElementById('bar-vocab').style.width = `${vPct}%`;
        }, 100);

        // JLPT Readiness Calculation
        const jlptStats = { N5: { total: 0, learned: 0 }, N4: { total: 0, learned: 0 }, N3: { total: 0, learned: 0 }, N2: { total: 0, learned: 0 }, N1: { total: 0, learned: 0 } };
        
        // Count totals and learned for Kanji
        kjData.forEach(item => {
            if (jlptStats[item.level]) {
                jlptStats[item.level].total++;
                if (progress.kanji[item.kanji]) jlptStats[item.level].learned++;
            }
        });
        
        // Count totals and learned for Vocab
        vData.forEach(item => {
            if (jlptStats[item.level]) {
                jlptStats[item.level].total++;
                if (progress.vocabulary[item.romaji]) jlptStats[item.level].learned++;
            }
        });

        // Update JLPT Dashboard Bars
        const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
        const tracks = document.querySelectorAll('.jlpt-track .progress-bar-container');
        const headers = document.querySelectorAll('.jlpt-track .progress-header .progress-pct');
        
        if (tracks.length === 5) {
            jlptLevels.forEach((level, idx) => {
                const stat = jlptStats[level];
                const pct = stat.total > 0 ? Math.round((stat.learned / stat.total) * 100) : 0;
                headers[idx].textContent = pct + '%';
                setTimeout(() => { tracks[idx].firstElementChild.style.width = pct + '%'; }, 100);
            });
        }

        // Animate stats numbers
        gsap.from(".stat-value", {
            textContent: 0,
            duration: 1.5,
            ease: "power1.out",
            snap: { textContent: 1 },
            stagger: 0.1
        });
        
        gsap.from(".stat-card", {
            y: 20,
            duration: 0.5,
            stagger: 0.1
        });

    } catch (e) {
        console.error("Error calculating progress percentages", e);
    }
});
