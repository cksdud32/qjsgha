/**
 * [전역 변수 설정]
 */
let currentDifficulty = "";   // 사용자가 선택한 난이도 값 (easy, medium, hard)
let quizList = [];            // 서버에서 받아온 랜덤 문제 배열
let currentIndex = 0;         // 현재 풀고 있는 문제의 번호 (인덱스)
let score = 0;                // 맞춘 정답 개수
let timerInterval;            // 타이머 중지를 위한 변수
let timeLeft = 0;             // 남은 시간 계산용

/**
 * 1. 난이도 메뉴 토글 (열기/닫기)
 */
function toggleDifficulty() {
    const menu = document.getElementById('difficultyMenu');
    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "flex"; // CSS 구성에 따라 block 또는 flex
    } else {
        menu.style.display = "none";
    }
}

/**
 * 2. 난이도 선택 시 호출
 */
function selectLevel(dbValue, displayLabel) {
    currentDifficulty = dbValue; // DB 쿼리에 보낼 값 저장
    
    // UI 업데이트: 버튼 텍스트 변경
    const selectedText = document.getElementById('selectedText');
    selectedText.innerText = "[" + displayLabel + "]";
    
    // 메뉴 닫기
    document.getElementById('difficultyMenu').style.display = "none";
}

/**
 * 3. 게임 시작 버튼 (API 호출 및 화면 전환)
 */
async function runGame() {
    // 난이도 선택 검증
    if (!currentDifficulty) {
        alert("⚠️ 난이도를 먼저 선택해 주세요!");
        return;
    }

    try {
        // [API 호출] 서버에 선택한 난이도 파라미터를 보냅니다.
        const response = await fetch(`/api/get-data?difficulty=${currentDifficulty}`);
        
        if (!response.ok) throw new Error("데이터를 불러오지 못했습니다.");

        const data = await response.json();
        
        if (data.length === 0) {
            alert("선택한 난이도에 등록된 문제가 없습니다.");
            return;
        }

        // 게임 데이터 초기화
        quizList = data;
        currentIndex = 0;
        score = 0;

        // [UI 전환] 인트로 영역을 숨기고 퀴즈 영역을 표시
        document.getElementById('introArea').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'block';

        displayQuestion();

    } catch (error) {
        console.error("연결 에러:", error);
        alert("DB 서버에 연결할 수 없습니다. 서버 상태를 확인하세요.");
    }
}

/**
 * 4. 문제 표시 및 타이머 초기화
 */
function displayQuestion() {
    const q = quizList[currentIndex];
    
    // 문제 텍스트 출력
    document.getElementById('questionDisplay').innerText = q.question_text;
    
    // 입력창 및 결과 영역 초기화
    const input = document.getElementById('answerInput');
    input.value = "";
    input.disabled = false;
    document.getElementById('resultMessage').innerText = "";
    
    // 버튼 상태 제어
    document.getElementById('checkBtn').style.display = "inline-block";
    document.getElementById('nextBtn').style.display = "none";
    
    // 타이머 시작 (DB에서 가져온 각 문제의 time_limit 적용)
    startTimer(q.time_limit || 30);
    
    input.focus();
}

/**
 * 5. 타이머 카운트다운 로직
 */
function startTimer(seconds) {
    if (timerInterval) clearInterval(timerInterval); // 기존 타이머 제거

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
 * 6. 정답 확인 버튼 클릭 시
 */
function checkAnswer() {
    const userInput = document.getElementById('answerInput').value.trim();
    const correctAnswer = quizList[currentIndex].answer;

    if (!userInput) return; // 빈 입력 무시

    clearInterval(timerInterval); // 답을 제출하면 타이머 정지

    // 정답 판정 (띄어쓰기 무시 로직은 서버 데이터 성격에 따라 조정 가능)
    if (userInput === correctAnswer) {
        score++;
        processAnswer(true, "⭕ 정답입니다!");
    } else {
        processAnswer(false, `❌ 틀렸습니다. (정답: ${correctAnswer})`);
    }
}

/**
 * 7. 결과 처리 공통 함수
 */
function processAnswer(isCorrect, message) {
    const resultMsg = document.getElementById('resultMessage');
    resultMsg.innerText = message;
    resultMsg.style.color = isCorrect ? "#4cd137" : "#ff6b6b";

    // UI 제어: 입력창 막고 [다음 문제] 버튼 표시
    document.getElementById('answerInput').disabled = true;
    document.getElementById('checkBtn').style.display = "none";
    document.getElementById('nextBtn').style.display = "inline-block";
}

/**
 * 8. 다음 문제로 넘어가기 (버튼 클릭 시)
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
 * 9. 게임 종료 처리
 */
function finishGame() {
    const container = document.getElementById('quizContainer');
    
    // 결과 화면 구성
    container.innerHTML = `
        <div class="game-result">
            <h2 style="color: white; font-size: 28px;">🎮 게임 종료!</h2>
            <p style="color: #c8ffac; font-size: 20px; margin: 25px 0;">
                총 ${quizList.length}문제 중 <b>${score}</b>문제를 맞췄습니다.
            </p>
            <button class="Start_Btn" onclick="location.reload()" style="background-color: #fbc531;">처음으로 돌아가기</button>
            <div id="nicknameArea" style="margin-top: 30px;">
                </div>
        </div>
    `;
}

/**
 * [편의 기능] 엔터 키 리스너
 */
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // 게임 중일 때만 작동
        const quizVisible = document.getElementById('quizContainer').style.display === 'block';
        if (!quizVisible) return;

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn.style.display === "inline-block") {
            showNextQuestion();
        } else {
            checkAnswer();
        }
    }
});