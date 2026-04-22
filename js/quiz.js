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
        const response = await fetch(`data/${currentQuizType}.json`);
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
    if (currentQuizType === 'vocabulary') {
        questionEl.textContent = activeQuestion.kanji;
        questionEl.style.fontSize = '3rem';
    } else if (currentQuizType === 'kanji') {
        questionEl.textContent = activeQuestion.kanji;
        questionEl.style.fontSize = '4rem';
    } else {
        questionEl.textContent = activeQuestion.kana;
        questionEl.style.fontSize = '4rem';
    }
    
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
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => handleAnswer(opt, correctAnswer, btn));
        optionsEl.appendChild(btn);
    });

    gsap.from(questionEl, { y: -20, duration: 0.3 });
    gsap.from(".option-btn", { y: 10, duration: 0.3, stagger: 0.1 });
}

function handleAnswer(selected, correct, btnNode) {
    const options = document.querySelectorAll('.option-btn');
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
    activeDiv.style.display = 'none';
    resultsDiv.style.display = 'flex';
    document.getElementById('final-score-value').textContent = score;
    
    // Update Streak logic here (simplified)
    const progress = JSON.parse(localStorage.getItem('kaizuna_progress')) || {};
    const today = new Date().toDateString();
    
    if (progress.lastStudyDate !== today) {
        progress.streak = (progress.streak || 0) + 1;
        progress.lastStudyDate = today;
        localStorage.setItem('kaizuna_progress', JSON.stringify(progress));
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
