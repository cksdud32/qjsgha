//가사 보기 버튼(가사 불러오기)
let lyricsData = {};

async function loadAllLyrics() {
    const response = await fetch('../lyrics.json');
    lyricsData = await response.json();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllLyrics();

    document.querySelectorAll('.lyrics-btn').forEach(btn => {
        btn.addEventListener('click', () => {
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