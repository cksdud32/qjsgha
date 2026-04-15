/**
 * [전역 변수 설정]
 */
let currentDifficulty = "";   
let quizList = [];            
let currentIndex = 0;         
let score = 0;                
let timerInterval;            
let timeLeft = 0;             

/**
 * 0. 페이지 로드 시 실행: 랭킹 데이터 불러오기
 */
window.onload = function() {
    loadRankings();
};

async function loadRankings() {
    try {
        const response = await fetch('/api/get-ranking'); // 랭킹 가져오기 API
        const rankings = await response.json();

        const nav = document.querySelector('nav');
        nav.innerHTML = '<h3 style="text-align:center; color:#c8ffac;">🏆 랭킹보드</h3>';

        if (rankings.length === 0) {
            nav.innerHTML += '<p style="text-align:center; font-size:12px;">아직 기록이 없어요.</p>';
            return;
        }

        // 랭킹 리스트 생성
        const listUl = document.createElement('ul');
        listUl.style.listStyle = 'none';
        listUl.style.padding = '10px';

        rankings.forEach((rank, index) => {
            const li = document.createElement('li');
            li.style.marginBottom = '10px';
            li.style.fontSize = '14px';
            li.innerHTML = `
                <span style="color:#ffd700;">${index + 1}위</span> 
                <strong>${rank.name}</strong> 
                <span style="float:right;">${rank.score}점</span>
                <br><small style="color:#aaa;">${rank.level_name}</small>
            `;
            listUl.appendChild(li);
        });
        nav.appendChild(listUl);
    } catch (error) {
        console.error("랭킹 로드 실패:", error);
    }
}

/**
 * 1. 난이도 메뉴 토글
 */
function toggleDifficulty() {
    const menu = document.getElementById('difficultyMenu');
    menu.style.display = (menu.style.display === "none" || menu.style.display === "") ? "flex" : "none";
}

/**
 * 2. 난이도 선택
 */
function selectLevel(dbValue, displayLabel) {
    currentDifficulty = dbValue; 
    document.getElementById('selectedText').innerText = "[" + displayLabel + "]";
    document.getElementById('difficultyMenu').style.display = "none";
}

/**
 * 3. 게임 시작 (API 호출 및 화면 전환)
 */
async function runGame() {
    if (!currentDifficulty) {
        alert("⚠️ 난이도를 먼저 선택해 주세요!");
        return;
    }

    try {
        const response = await fetch(`/api/get-data?difficulty=${currentDifficulty}`);
        if (!response.ok) throw new Error("데이터 로드 실패");
        const data = await response.json();
        
        if (data.length === 0) {
            alert("문제가 없습니다.");
            return;
        }

        quizList = data;
        currentIndex = 0;
        score = 0;

        document.getElementById('introArea').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'block';

        displayQuestion();
    } catch (error) {
        console.error(error);
        alert("DB 연결 실패!");
    }
}

/**
 * 4. 문제 표시
 */
function displayQuestion() {
    const q = quizList[currentIndex];
    document.getElementById('questionDisplay').innerText = q.question_text;
    
    const input = document.getElementById('answerInput');
    input.value = "";
    input.disabled = false;
    document.getElementById('resultMessage').innerText = "";
    document.getElementById('checkBtn').style.display = "inline-block";
    document.getElementById('nextBtn').style.display = "none";
    
    startTimer(q.time_limit || 30);
    input.focus();
}

/**
 * 5. 타이머
 */
function startTimer(seconds) {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = seconds;
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.innerText = `남은 시간: ${timeLeft}`;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = `남은 시간: ${timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            processAnswer(false, `⏰ 시간 초과! (정답: ${quizList[currentIndex].answer})`);
        }
    }, 1000);
}

/**
 * 6. 정답 확인
 */
function checkAnswer() {
    const userInput = document.getElementById('answerInput').value.trim();
    const correctAnswer = quizList[currentIndex].answer;

    if (!userInput) return;
    clearInterval(timerInterval);

    if (userInput === correctAnswer) {
        score++;
        processAnswer(true, "⭕ 정답입니다!");
    } else {
        processAnswer(false, `❌ 틀렸습니다. (정답: ${correctAnswer})`);
    }
}

function processAnswer(isCorrect, message) {
    const resultMsg = document.getElementById('resultMessage');
    resultMsg.innerText = message;
    resultMsg.style.color = isCorrect ? "#4cd137" : "#ff6b6b";

    document.getElementById('answerInput').disabled = true;
    document.getElementById('checkBtn').style.display = "none";
    document.getElementById('nextBtn').style.display = "inline-block";
}

/**
 * 7. 다음 문제/종료
 */
function showNextQuestion() {
    currentIndex++;
    if (currentIndex < quizList.length) {
        displayQuestion();
    } else {
        finishGame();
    }
}

/**
 * 8. 종료 및 랭킹 저장
 */
function finishGame() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div style="padding:40px 0;">
            <h2 style="color:white;">🎮 게임 종료!</h2>
            <p style="color:#c8ffac;">${quizList.length}문제 중 <b>${score}</b>문제를 맞췄습니다.</p>
            <div id="nicknameArea" style="margin: 20px 0;">
                <input type="text" id="rankNickname" placeholder="닉네임" style="padding:10px; border-radius:5px;">
                <button class="Start_Btn" onclick="saveRanking()" style="background-color:#4cd137;">등록</button>
            </div>
            <button class="Start_Btn" onclick="location.reload()" style="background-color:#fbc531;">처음으로</button>
        </div>
    `;
}

async function saveRanking() {
    const nickname = document.getElementById('rankNickname').value.trim();
    if (!nickname) return alert("닉네임을 입력하세요!");

    try {
        const response = await fetch('/api/post-ranking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nickname, score: score, difficulty: currentDifficulty })
        });

        if (response.ok) {
            alert("등록 완료! 🏆");
            location.reload(); 
        }
    } catch (e) {
        console.error(e);
    }
}

/**
 * 엔터 키 지원
 */
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const quizVisible = document.getElementById('quizContainer').style.display === 'block';
        if (!quizVisible) return;
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn && nextBtn.style.display === "inline-block") {
            showNextQuestion();
        } else {
            checkAnswer();
        }
    }
});