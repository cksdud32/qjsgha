/**
 * [변수 설정]
 */
let currentDifficulty = "";   // 선택된 난이도 (easy, medium, hard)
let quizList = [];            // 서버에서 받은 랜덤 문제 배열
let currentIndex = 0;         // 현재 문제 번호
let score = 0;                // 맞춘 개수
let timerInterval;            // 타이머 제어용
let timeLeft = 0;               // 남은 시간

/**
 * 1. 난이도 메뉴 토글
 */
function toggleDifficulty() {
    const menu = document.getElementById('difficultyMenu');
    // 초기 상태가 display: none이므로 이에 맞춰 토글
    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "flex";
    } else {
        menu.style.display = "none";
    }
}

/**
 * 2. 난이도 선택
 */
function selectLevel(dbValue, displayLabel) {
    currentDifficulty = dbValue;
    const selectedText = document.getElementById('selectedText');
    selectedText.innerText = "[" + displayLabel + "]";

    // 메뉴 닫기
    document.getElementById('difficultyMenu').style.display = "none";
}

/**
 * 3. 게임 시작 (DB 데이터 요청 및 화면 전환)
 */
async function runGame() {
    if (!currentDifficulty) {
        alert("⚠️ 난이도를 먼저 선택해 주세요!");
        return;
    }

    try {
        // 백엔드 API 호출 (작성하신 Vercel 서버리스 함수 경로)
        const response = await fetch(`/api/get-data?difficulty=${currentDifficulty}`);

        if (!response.ok) throw new Error("데이터 로드 실패");

        const data = await response.json();

        if (data.length === 0) {
            alert("해당 난이도에 문제가 없습니다.");
            return;
        }

        // 데이터 초기화
        quizList = data;
        currentIndex = 0;
        score = 0;

        // [UI 전환] 인트로 숨기고 퀴즈 컨테이너 보이기
        document.getElementById('introArea').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'block';

        displayQuestion();

    } catch (error) {
        console.error("에러 발생:", error);
        alert("DB 서버 연결에 실패했습니다.");
    }
}

/**
 * 4. 문제 표시
 */
function displayQuestion() {
    const q = quizList[currentIndex];

    // 문제 텍스트 및 UI 초기화
    document.getElementById('questionDisplay').innerText = q.question_text;
    document.getElementById('resultMessage').innerText = "";
    document.getElementById('answerInput').value = "";
    document.getElementById('answerInput').disabled = false;

    // 버튼 상태 제어
    document.getElementById('checkBtn').style.display = "inline-block";
    document.getElementById('nextBtn').style.display = "none";

    // 타이머 시작 (DB의 time_limit 사용)
    startTimer(q.time_limit || 30);

    document.getElementById('answerInput').focus();
}

/**
 * 5. 타이머 로직
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
            processResult(false, "⏰ 시간 초과!");
        }
    }, 1000);
}

/**
 * 6. 정답 확인
 */
function checkAnswer() {
    const userInput = document.getElementById('answerInput').value.trim();
    const correctAnswer = quizList[currentIndex].answer;

    if (!userInput) {
        alert("답을 입력해주세요!");
        return;
    }

    clearInterval(timerInterval); // 정답 확인 시 타이머 정지

    if (userInput === correctAnswer) {
        score++;
        processResult(true, "⭕ 정답입니다!");
    } else {
        processResult(false, `❌ 틀렸습니다. (정답: ${correctAnswer})`);
    }
}

/**
 * 7. 결과 처리 (화면 표시 및 버튼 전환)
 */
function processResult(isCorrect, message) {
    const resMsg = document.getElementById('resultMessage');
    resMsg.innerText = message;
    resMsg.style.color = isCorrect ? "#4cd137" : "#ff6b6b";

    // 입력창 막고 [다음 문제] 버튼 노출
    document.getElementById('answerInput').disabled = true;
    document.getElementById('checkBtn').style.display = "none";
    document.getElementById('nextBtn').style.display = "inline-block";
}

/**
 * 8. 다음 문제로 진행
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
 * 9. 게임 종료 화면
 */
function finishGame() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div style="padding: 40px 0;">
            <h2 style="color: white; font-size: 30px;">🎮 게임 종료!</h2>
            <p style="color: #c8ffac; font-size: 20px; margin: 20px 0;">
                총 ${quizList.length}문제 중 <b>${score}</b>문제를 맞췄습니다.
            </p>
            <button class="Start_Btn" onclick="location.reload()" style="background-color: #fbc531;">다시 하기</button>
            <div id="rankingSection" style="margin-top: 30px;">
                </div>
        </div>
    `;
}

/**
 * [편의 기능] 엔터 키 지원
 */
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
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