// 준비물 취소선(데이터 저장)
function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  p.classList.toggle("checked-text", checkbox.checked);
}

function saveCheckboxState(checkbox) {
  localStorage.setItem(checkbox.id, checkbox.checked);
}

function loadCheckboxState() {
  const checkboxes = document.querySelectorAll('.check-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const saved = localStorage.getItem(cb.id);
    cb.checked = saved === "true";
    toggleStrike(cb);
  });
}

function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  p.classList.toggle("checked-text", checkbox.checked);
  saveCheckboxState(checkbox);
}

document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => toggleStrike(cb));
});

window.addEventListener('DOMContentLoaded', loadCheckboxState);

// 모든 취소선(체크) 해제
function clearAllStrikes() {
  const checkboxes = document.querySelectorAll('.check-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    if (cb.checked) {
      cb.checked = false;
      toggleStrike(cb);
    } else {
      const p = cb.nextElementSibling;
      if (p && p.classList.contains('checked-text')) {
        p.classList.remove('checked-text');
        saveCheckboxState(cb);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clearStrikesBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('선택된 모든 준비물을 초기화하시겠습니까?')) return;

      clearAllStrikes();
    });
  }
});


// 디데이
function updateDDay() {
  const targetDay = new Date(2026, 0, 10);

  const targetTime = new Date("2026-01-10T15:00:00+09:00");

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


// 대기 시간, 주의사항등 버튼 
document.addEventListener('DOMContentLoaded', () => {
  const allToggles = document.querySelectorAll('.toggle-text');

  allToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetBox = document.getElementById(targetId);

      const area = btn.closest('.data').getAttribute('data-area');

      const toggles = document.querySelectorAll(`.data[data-area="${area}"] .toggle-text`);
      const boxes = document.querySelectorAll(`.data[data-area="${area}"] ~ .hidden-box`);

      boxes.forEach(box => {
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

// 계산기
let calculatorOn = false;
const cart = {};

const openBtn  = document.querySelector('.Calculator');
const calcRow  = document.getElementById('calculator-row');
const closeBtn = document.getElementById('closeCalc');
const resetBtn = document.getElementById('resetCalc');
const calcList = document.getElementById('calcList');
const calcTotal = document.getElementById('calcTotal');

openBtn.addEventListener('click', () => {
  calculatorOn = true;
  calcRow.style.display = 'table-row';
  setActiveState(true);
});

closeBtn.addEventListener('click', () => {
  calculatorOn = false;
  calcRow.style.display = 'none';
  resetCart();
  setActiveState(false);
});

resetBtn.addEventListener('click', () => {
  resetCart();
});

document.querySelectorAll('tbody tr[id^="price-"]').forEach(row => {
  row.addEventListener('click', () => {
    if (!calculatorOn) {
      alert('계산기를 열어야 추가할 수 있습니다.');
      return;
    }

    const name = row.cells[0].innerText.trim();

    const priceMatch = row.innerText.match(/([0-9,]+)원/);
    if (!priceMatch) return;

    const price = Number(priceMatch[1].replace(/,/g, ''));

    cart[name] = cart[name] || { count: 0, price };
    cart[name].count++;

    renderCalculator();
  });
});

function renderCalculator() {
  calcList.innerHTML = '';
  let total = 0;

  for (const key in cart) {
    const item = cart[key];
    total += item.count * item.price;

    const li = document.createElement('li');
    li.textContent = `${key} × ${item.count}`;
    calcList.appendChild(li);
  }

  calcTotal.textContent = total.toLocaleString();
}

function setActiveState(on) {
  document.querySelectorAll('tbody tr[id^="price-"]').forEach(row => {
    row.classList.toggle('calc-on', on);
  });
}

function resetCart() {
  for (const key in cart) delete cart[key];
  calcList.innerHTML = '';
  calcTotal.textContent = '0';
}
