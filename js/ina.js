/**
 * [전역 변수 설정]
 */
let currentDifficulty = "";   // 게임 진행용 난이도
let quizList = [];            
let currentIndex = 0;         
let score = 0;                
let timerInterval;            
let timeLeft = 0;             

// [랭킹보드 필터 상태]
let currentRankPeriod = 'current'; // 'current' (이번달) or 'last' (전달)
let currentRankDiff = 'easy';      // 'easy', 'medium', 'hard'

/**
 * 0. 페이지 로드 시 실행
 */
window.onload = function() {
    updateRankUI(); // 초기 랭킹 로드 (이번달 + 쉬움)
};

/**
 * 1. 랭킹보드 제어 로직 (기간 및 난이도 이중 필터)
 */
function changePeriod(p) {
    currentRankPeriod = p;
    updateRankUI();
}

function changeDiff(d) {
    currentRankDiff = d;
    updateRankUI();
}

async function updateRankUI() {
    const currentTab = document.getElementById('currentTab');
    const lastTab = document.getElementById('lastTab');
    const rankList = document.getElementById('rankList');

    // 1. 기간 메인 탭 UI 활성화 (보라색 밑줄)
    if (currentRankPeriod === 'current') {
        currentTab.classList.add('active');
        lastTab.classList.remove('active');
    } else {
        lastTab.classList.add('active');
        currentTab.classList.remove('active');
    }

    // 2. 난이도 서브 탭 UI 활성화 (연두색 강조)
    document.querySelectorAll('.diff-tab').forEach(el => el.classList.remove('active'));
    const targetDiffTab = document.getElementById(`diff-${currentRankDiff}`);
    if (targetDiffTab) targetDiffTab.classList.add('active');

    // 3. API 호출 (기간과 난이도를 모두 파라미터로 전송)
    try {
        const response = await fetch(`/api/get-ranking?type=${currentRankPeriod}&diff=${currentRankDiff}`);
        const rankings = await response.json();

        rankList.innerHTML = ''; 

        if (!rankings || rankings.length === 0) {
            const periodMsg = (currentRankPeriod === 'current') ? '이번 달' : '지난 달';
            rankList.innerHTML = `<p style="text-align:center; padding-top:30px; font-size:12px; color:#888;">${periodMsg} 기록이 없습니다.</p>`;
            return;
        }

        rankings.forEach((rank, index) => {
            const div = document.createElement('div');
            div.className = 'rank-item';
            div.innerHTML = `
                <span class="rank-name">${index + 1}. ${rank.name}</span>
                <span class="rank-score">${rank.score}점</span>
            `;
            rankList.appendChild(div);
        });
    } catch (error) {
        console.error("랭킹 로드 에러:", error);
    }
}

/**
 * 2. 난이도 메뉴 토글 (게임 시작 전 선택창)
 */
function toggleDifficulty() {
    const menu = document.getElementById('difficultyMenu');
    menu.style.display = (menu.style.display === "none" || menu.style.display === "") ? "flex" : "none";
}

function selectLevel(dbValue, displayLabel) {
    currentDifficulty = dbValue; 
    document.getElementById('selectedText').innerText = "[" + displayLabel + "]";
    document.getElementById('difficultyMenu').style.display = "none";
}

/**
 * 3. 게임 시작 (랜덤 10문제 추출)
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

        // 받아온 문제들 중 랜덤 10개는 이미 백엔드(api/get-data.js)에서 처리되어 옵니다.
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
 * 4. 문제 표시 및 타이머 로직
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
 * 5. 정답 확인 및 결과 처리
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

function showNextQuestion() {
    currentIndex++;
    if (currentIndex < quizList.length) {
        displayQuestion();
    } else {
        finishGame();
    }
}

/**
 * 6. 게임 종료 및 랭킹 저장 (POST)
 */
function finishGame() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div style="padding:40px 0;">
            <h2 style="color:white;">🎮 게임 종료!</h2>
            <p style="color:#c8ffac; font-size:18px;">총 ${quizList.length}문제 중 <b>${score}</b>문제를 맞췄습니다.</p>
            <div id="nicknameArea" style="margin: 30px 0;">
                <input type="text" id="rankNickname" placeholder="닉네임(10자 이내)" maxlength="10" 
                       style="padding:12px; border-radius:5px; border:none; width:180px;">
                <button class="Start_Btn" onclick="saveRanking()" style="background-color:#4cd137; padding:12px 20px;">등록</button>
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

        const result = await response.json();
        if (response.ok) {
            alert(result.message || "등록 완료! 🏆");
            location.reload(); 
        } else {
            alert("저장 실패: " + result.error);
        }
    } catch (e) {
        console.error(e);
        alert("서버 통신 오류가 발생했습니다.");
    }
}

/**
 * 7. 엔터 키 지원
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