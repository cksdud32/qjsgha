/* [설명] 
  1. currentDifficulty: 사용자가 선택한 난이도 값을 저장 (DB 쿼리용)
  2. toggleDifficulty: 난이도 메뉴 표시/숨김
  3. selectLevel: 난이도 선택 시 텍스트 변경 및 값 저장
  4. runGame: 난이도 선택 여부 검증 후 DB에 데이터 요청
*/

let currentDifficulty = ""; 

// 1. 난이도 메뉴 열고 닫기
function toggleDifficulty() {
    const menu = document.getElementById('difficultyMenu');
    // 처음 상태가 style="display: none;"이므로 이에 맞춰 토글
    if (menu.style.display === "none" || menu.style.display === "") {
        menu.style.display = "block";
    } else {
        menu.style.display = "none";
    }
}

// 2. 난이도 선택 시 호출되는 함수
function selectLevel(dbValue, displayLabel) {
    // DB에 보낼 값 저장 (예: 'easy', 'medium', 'hard')
    currentDifficulty = dbValue; 
    
    // 화면의 [난이도 선택] 글자를 선택한 난이도로 변경
    const selectedText = document.getElementById('selectedText');
    selectedText.innerText = "[" + displayLabel + "]";
    
    // 메뉴 닫기
    document.getElementById('difficultyMenu').style.display = "none";
    
    console.log("선택된 난이도(DB 전송용):", currentDifficulty);
}

// 3. 게임 시작 버튼 클릭 시 호출 (DB 연동 로직 포함)
async function runGame() {
    // [검증] 난이도를 선택하지 않았을 경우 경고창 띄우기
    if (!currentDifficulty) {
        alert("⚠️ 난이도를 먼저 선택해 주세요!");
        return; // 함수 종료
    }

    // 게임 시작 전 대기 알림 (필요시 사용)
    console.log(`${currentDifficulty} 데이터를 불러오는 중...`);

    try {
        /* [DB 연결부] 
           실제 서버 URL이 있다면 아래 주소를 수정하세요.
           예: http://localhost:3000/game/data?level=easy
        */
        const response = await fetch(`/api/get-data?difficulty=${currentDifficulty}`, {
            method: 'GET', // 또는 서버 설정에 따라 'POST'
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const gameData = await response.json();
            console.log("DB로부터 받은 데이터:", gameData);
            
            // 여기서부터 DB 데이터를 가지고 게임 로직 실행
            startGame(gameData); 
        } else {
            // 서버 연결은 됐으나 응답이 에러일 때 (404, 500 등)
            alert("서버에서 데이터를 가져오지 못했습니다.");
        }
    } catch (error) {
        // 서버 자체가 꺼져있거나 네트워크 오류 시
        console.error("네트워크 에러:", error);
        alert("DB 서버에 연결할 수 없습니다. (콘솔 확인)");
    }
}

// 4. 실제 게임 시작 로직 (예시)
function startGame(data) {
    alert(currentDifficulty + " 난이도로 게임을 시작합니다!");
    // 받아온 data를 화면에 그리거나 게임 세팅에 활용하세요.
}