// 준비물 취소선
function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  p.classList.toggle("checked-text", checkbox.checked);
}

// 체크박스 상태 저장
function saveCheckboxState(checkbox) {
  localStorage.setItem(checkbox.id, checkbox.checked);
}

// 체크박스 상태 불러오기
function loadCheckboxState() {
  const checkboxes = document.querySelectorAll('.check-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const saved = localStorage.getItem(cb.id);
    cb.checked = saved === "true"; 
    toggleStrike(cb);         
  });
}

// 기존 toggleStrike 함수에 상태 저장 연결
function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  p.classList.toggle("checked-text", checkbox.checked);
  saveCheckboxState(checkbox); // 상태 저장
}

// 이벤트 연결
document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => toggleStrike(cb));
});

// 페이지 로드 시 상태 불러오기
window.addEventListener('DOMContentLoaded', loadCheckboxState);


// 디데이
function updateDDay() {
  const targetDateForDay = new Date("2026-01-10T00:00:00+09:00");
  const targetDateForTime = new Date("2026-01-10T15:00:00+09:00");

  const now = new Date();

  const diffTimeForDay = targetDateForDay - now;
  const diffDays = Math.floor(diffTimeForDay / (1000 * 60 * 60 * 24));

  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  const isDDay =
    now >= new Date("2026-01-10T00:00:00+09:00") &&
    now < new Date("2026-01-11T00:00:00+09:00");

  if (diffDays > 0 && !isDDay) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (isDDay) {
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

// 대기 및 입장 시간 표시

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

  // 표 숨김/열기 처리
document.querySelectorAll(".clickable-row").forEach(row => {
  row.addEventListener("click", () => {
    const group = row.dataset.group;
    document.querySelectorAll(`.hidden-row[data-group="${group}"]`).forEach(r => {
      if (r.classList.contains("show")) {
        r.classList.remove("show");
        setTimeout(() => {
          r.style.display = "none";
        }, 300); 
      } else {
        r.style.display = "table-row";
        setTimeout(() => {
          r.classList.add("show");
        }, 10);
      }
    });
  });
});
