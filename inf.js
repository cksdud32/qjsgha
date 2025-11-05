function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  if (checkbox.checked) {
    p.classList.add("checked-text");
  } else {
    p.classList.remove("checked-text");
  }
}

function updateDDay() {
  const targetDate = new Date("2026-01-10T15:00:00+09:00"); // 목표 날짜 (자정 기준)
  const now = new Date();

  const diffTime = targetDate - now; // 남은 시간 (밀리초)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  if (diffDays > 0) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (diffDays === 0) {
    ddayElement.textContent = `🎉 D-DAY! 🎉`;
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }

  // 남은 시간 계산
  const absDiffTime = Math.abs(diffTime);
  const hours = Math.floor((absDiffTime / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absDiffTime / (1000 * 60)) % 60);
  const seconds = Math.floor((absDiffTime / 1000) % 60);

  timeLeftElement.textContent = `${hours}시간 ${minutes}분 ${seconds}초`;
}

// 1초마다 갱신
setInterval(updateDDay, 1000);

updateDDay(); // 처음 한 번 실행