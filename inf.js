function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  p.classList.toggle("checked-text", checkbox.checked);
}

function updateDDay() {
  const targetDate = new Date("2026-01-10T15:00:00+09:00");
  const now = new Date();

  const diffTime = targetDate - now;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  if (diffDays > 0) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (diffDays === 0) {
    ddayElement.textContent = "🎉 D-DAY! 🎉";
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }

  const absDiff = Math.abs(diffTime);
  const totalHours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
  const seconds = Math.floor((absDiff / 1000) % 60);

  timeLeftElement.textContent = `${totalHours}시간 ${minutes}분 ${seconds}초`;
}

setInterval(updateDDay, 1000);
updateDDay();
