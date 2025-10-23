function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  if (checkbox.checked) {
    p.classList.add("checked-text");
  } else {
    p.classList.remove("checked-text");
  }
}

function updateDDay() {
  const targetDate = new Date("2026-01-10");
  const today = new Date();

  targetDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const ddayElement = document.getElementById("dday");

  if (diffDays > 0) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (diffDays === 0) {
    ddayElement.textContent = `🎉 D-DAY! 🎉`;
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }
}

updateDDay();
