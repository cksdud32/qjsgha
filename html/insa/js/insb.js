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

function updateDDay() {
  const targetDay = new Date(2026, 2, 14);

  const targetTime = new Date("2026-03-14T15:00:00+09:00");

  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((targetDay - today) / 86400000);

  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  const isDDay =
    today.getTime() === targetDay.getTime();

  if (diffDays > 0 && !isDDay) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (isDDay) {
    ddayElement.textContent = "🎉 D-DAY! 🎉";
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }

  const diffTime = targetTime - now;

  const absDiff = Math.abs(diffTime);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
  const seconds = Math.floor((absDiff / 1000) % 60);

  timeLeftElement.textContent = `${hours}시간 ${minutes}분 ${seconds}초`;
}

setInterval(updateDDay, 1000);
updateDDay();