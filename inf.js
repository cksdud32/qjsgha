function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  if (checkbox.checked) {
    p.classList.add("checked-text");
  } else {
    p.classList.remove("checked-text");
  }
}

function updateDDay() {2818
  const targetDate = new Date("2026-01-10T15:00:00+09:00"); // 목표 날짜
  const now = new Date();

  const diffTime = targetDate - now; // 남은 시간 (밀리초)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // 남은 일수
  const diffHoursTotal = Math.floor(diffTime / (1000 * 60 * 60)); // 총 남은 시간(시간 단위)

  const ddayElement= document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  // D-Day 표시
  if (diffDays > 0) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (diffDays === 0) {
    ddayElement.textContent = `🎉 D-DAY! 🎉`;
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }

  // 세부 남은 시간 표시 (총 시간 + 시분초)
  const absDiffTime = Math.abs(diffTime);
  const totalHours = Math.floor(absDiffTime / (1000 * 60 * 60)); // 전체 시간
  const hours = Math.floor((absDiffTime / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absDiffTime / (1000 * 60)) % 60);
  const seconds = Math.floor((absDiffTime / 1000) % 60);

  timeLeftElement.textContent = `${totalHours}시간${minutes}분 ${seconds}초`;
}

// 1초마다 갱신
setInterval(updateDDay, 1000);
updateDDay(); // 처음 한 번 실행S