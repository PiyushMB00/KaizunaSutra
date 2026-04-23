let currentQuizType = null;
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
let activeQuestion = null;
const totalQuestions = 10;

// Setup Phase
const setupDiv = document.getElementById('quiz-setup');
const activeDiv = document.getElementById('quiz-active');
const resultsDiv = document.getElementById('quiz-results');
const startBtn = document.getElementById('start-btn');
const typeBtns = document.querySelectorAll('.quiz-type-btn');

typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentQuizType = btn.dataset.type;
        startBtn.removeAttribute('disabled');
    });
});

startBtn?.addEventListener('click', startQuiz);
document.getElementById('restart-btn')?.addEventListener('click', resetQuiz);

async function startQuiz() {
    if (!currentQuizType) return;
    
    try {
        const response = await fetch(`/static/data/${currentQuizType}.json`);
        const data = await response.json();
        
        // Shuffle and take 10
        quizData = data.sort(() => 0.5 - Math.random()).slice(0, totalQuestions);
        
        // To generate options, we need the full dataset to pick random wrong answers
        quizData.fullSet = data;

        currentQuestionIndex = 0;
        score = 0;
        
        setupDiv.style.display = 'none';
        activeDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        
        loadQuestion();
    } catch (e) {
        console.error("Error loading quiz data", e);
        alert("Failed to load quiz data.");
    }
}

function loadQuestion() {
    if (currentQuestionIndex >= quizData.length) {
        endQuiz();
        return;
    }

    activeQuestion = quizData[currentQuestionIndex];
    document.getElementById('q-current').textContent = currentQuestionIndex + 1;
    document.getElementById('score').textContent = score;

    const questionEl = document.getElementById('question');
    const optionsEl = document.getElementById('options');
    
    // Set question text
    const charToSpeak = (currentQuizType === 'vocabulary' || currentQuizType === 'kanji') 
        ? activeQuestion.kanji : activeQuestion.kana;
        
    questionEl.innerHTML = `
        <i class="fa-solid fa-volume-high audio-btn quiz-audio" id="quiz-audio-btn" title="Play Pronunciation"></i>
        <span>${charToSpeak}</span>
    `;

    if (currentQuizType === 'vocabulary') {
        questionEl.style.fontSize = '3rem';
    } else {
        questionEl.style.fontSize = '4rem';
    }

    document.getElementById('quiz-audio-btn').addEventListener('click', () => {
        const utterance = new SpeechSynthesisUtterance(charToSpeak);
        utterance.lang = 'ja-JP';
        speechSynthesis.speak(utterance);
    });
    
    // Generate Options
    optionsEl.innerHTML = '';
    const correctAnswer = (currentQuizType === 'vocabulary' || currentQuizType === 'kanji') 
        ? activeQuestion.meaning : activeQuestion.romaji;
    
    // Get 3 random wrong answers
    let options = [correctAnswer];
    while(options.length < 4) {
        const randomItem = quizData.fullSet[Math.floor(Math.random() * quizData.fullSet.length)];
        const randomAnswer = (currentQuizType === 'vocabulary' || currentQuizType === 'kanji') 
            ? randomItem.meaning : randomItem.romaji;
        if (!options.includes(randomAnswer)) {
            options.push(randomAnswer);
        }
    }
    
    // Shuffle options
    options = options.sort(() => 0.5 - Math.random());

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => handleAnswer(opt, correctAnswer, btn));
        optionsEl.appendChild(btn);
    });

    gsap.from(questionEl, { y: -20, duration: 0.3 });
    gsap.from(".quiz-option", { y: 10, duration: 0.3, stagger: 0.1 });
}

function handleAnswer(selected, correct, btnNode) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(btn => btn.disabled = true); // Disable all

    if (selected === correct) {
        btnNode.classList.add('correct');
        score++;
        document.getElementById('score').textContent = score;
    } else {
        btnNode.classList.add('wrong');
        // Highlight correct answer
        options.forEach(btn => {
            if (btn.textContent === correct) {
                btn.classList.add('correct');
            }
        });
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1500);
}

function endQuiz() {
    const resultsDiv = document.getElementById('quiz-results');
    resultsDiv.classList.remove('hidden');
    document.getElementById('final-score').textContent = `Score: ${score} / ${totalQuestions}`;

    // Update streak and accuracy
    const progress = JSON.parse(localStorage.getItem('kizuna_progress'));
    if (progress) {
        const today = new Date().toISOString().split('T')[0];
        
        if (progress.lastStudyDate !== today) {
            if (progress.lastStudyDate) {
                const lastDate = new Date(progress.lastStudyDate);
                const diffTime = Math.abs(new Date(today) - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    progress.streak = (progress.streak || 0) + 1;
                } else if (diffDays > 1) {
                    progress.streak = 1; // Reset streak
                }
            } else {
                progress.streak = 1;
            }
            progress.lastStudyDate = today;
        }
        
        progress.quizCount = (progress.quizCount || 0) + totalQuestions;
        progress.correctAnswers = (progress.correctAnswers || 0) + score;
        
        localStorage.setItem('kizuna_progress', JSON.stringify(progress));
    }

    gsap.from(resultsDiv, { scale: 0.9, duration: 0.5 });
}

function resetQuiz() {
    setupDiv.style.display = 'flex';
    resultsDiv.style.display = 'none';
    startBtn.disabled = true;
    currentQuizType = null;
    typeBtns.forEach(b => b.classList.remove('selected'));
}
