function viewTicketingPractice() {
    window.location.href = 'inqa.html';
}

function initInqaPage() {
    const nicknameInput = document.getElementById('nicknameInput');
    const startButton = document.getElementById('startButton');

    if (!nicknameInput || !startButton) {
        return;
    }

    nicknameInput.addEventListener('input', updateStartButtonState);
    updateStartButtonState();
}

function updateStartButtonState() {
    const nicknameInput = document.getElementById('nicknameInput');
    const startButton = document.getElementById('startButton');

    if (!nicknameInput || !startButton) {
        return;
    }

    startButton.disabled = nicknameInput.value.trim().length < 2;
}

async function startGame() {
    const nicknameInput = document.getElementById('nicknameInput');
    const nickname = nicknameInput ? nicknameInput.value.trim() : '';

    if (nickname.length < 2) return;

    try {
        const result = await postTicketingPracticeResult(nickname, 0);
        if (result?.error) {
            alert(result.error || '기록 저장 중 오류가 발생했습니다.');
            return;
        }

        const productImageEl = document.querySelector('.detail-image-main img');
        const sessionData = {
            id: result.id ?? null,
            name: nickname,
            stopwatch: 0,
            product: {
                title: '티켓팅 연습',
                price: 81400,
                qty: 1,
                imageUrl: productImageEl ? productImageEl.src : null,
            },
        };
        sessionStorage.setItem('ticketingPracticeSession', JSON.stringify(sessionData));
        sessionStorage.setItem('ticketingStep', 'inqa');
        window.location.href = 'main/inq-main1.html';
    } catch (error) {
        console.error(error);
        alert('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
}

function goBackToList() {
    window.location.href = 'inq.html';
}

window.addEventListener('DOMContentLoaded', initInqaPage);
