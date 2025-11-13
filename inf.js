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

// 대기 시간, 주의사항등 버튼 
document.addEventListener('DOMContentLoaded', () => {
  const toggles = document.querySelectorAll('.toggle-text');

  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetBox = document.getElementById(targetId);

      document.querySelectorAll('.hidden-box').forEach(box => {
        if (box !== targetBox) box.classList.remove('show');
      });

      targetBox.classList.toggle('show');

      toggles.forEach(b => {
        const tId = b.getAttribute('data-target');
        if (tId === targetId) {
          b.textContent = targetBox.classList.contains('show') 
            ? `▲ ${b.textContent.slice(2)}`
            : `▼ ${b.textContent.slice(2)}`;
        } else {
          b.textContent = `▼ ${b.textContent.slice(2)}`;
        }
      });
    });
  });
});



  // 표 숨김/열기 처리
document.querySelectorAll(".clickable-row").forEach(row => {
  row.addEventListener("click", () => {
    const group = row.dataset.group;
    const arrow = row.querySelector(".arrow");

    document.querySelectorAll(`.hidden-row[data-group="${group}"]`).forEach(r => {
      if (r.classList.contains("show")) {
        r.classList.remove("show");
        setTimeout(() => {
          r.style.display = "none";
        }, 300);
        if (arrow) arrow.classList.remove("rotate");
      } else {
        r.style.display = "table-row";
        setTimeout(() => {
          r.classList.add("show");
        }, 10);
        if (arrow) arrow.classList.add("rotate");
      }
    });
  });
});
