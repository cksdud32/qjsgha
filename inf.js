function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  p.classList.toggle("checked-text", checkbox.checked);
}

function updateDDay() {
  const targetDateForDay = new Date("2026-01-10T00:00:00+09:00");
  const targetDateForTime = new Date("2026-01-10T15:00:00+09:00");

  const now = new Date();

  const diffTimeForDay = targetDateForDay - now;
  const diffDays = Math.floor(diffTimeForDay / (1000 * 60 * 60 * 24));

  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  if (diffDays > 0) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (diffDays === 0) {
    ddayElement.textContent = "🎉 D-DAY! 🎉";
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }

  const diffTimeForClock = targetDateForTime - now;
  const absDiff = Math.abs(diffTimeForClock);
  const totalHours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
  const seconds = Math.floor((absDiff / 1000) % 60);

  timeLeftElement.textContent = `${totalHours}시간 ${minutes}분 ${seconds}초`;
}

setInterval(updateDDay, 1000);
updateDDay();

function toggleContent() {
    const box = document.getElementById('hiddenContent');
    const text = document.querySelector('.toggle-text');

    box.classList.toggle('show');

    if (box.classList.contains('show')) {
      text.textContent = '▲ 닫기';
    } else {
      text.textContent = '▼ 대기 및 입장시간 보기';
    }
  }