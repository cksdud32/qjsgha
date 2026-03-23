// 가사 보기 버튼(가사 불러오기)
let lyricsData = {};

const lyricsPasswords = {
    "cksdud32": "cksdud32!",
    "chebyeol": "sterche!babo",
    " yeonho_831":""
};

async function loadAllLyrics() {
    const response = await fetch('../lyrics.json');
    lyricsData = await response.json();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllLyrics();

    document.querySelectorAll('.lyrics-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const songId = btn.id;
            const correctPw = lyricsPasswords[songId];

            if (correctPw) {
                const inputPw = prompt("비밀번호를 입력하세요");
                if (inputPw === null) return;

                if (inputPw !== correctPw) {
                    alert("비밀번호가 올바르지 않습니다.");
                    return;
                }
            }

            const num = btn.dataset.number;
            const content = lyricsData[num] || "가사가 등록되지 않았습니다.";
            const titleText = btn.previousElementSibling.innerText;

            document.getElementById('modalTitle').innerText = titleText;
            document.getElementById('modalLyrics').innerText = content;
            document.getElementById('lyricsModal').style.display = 'block';
        });
    });

    document.getElementById('closeBtn').addEventListener('click', () => {
        document.getElementById('lyricsModal').style.display = 'none';
    });
});