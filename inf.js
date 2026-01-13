// 준비물 취소선(데이터 저장)
function toggleStrike(checkbox) {
  const label = checkbox.nextElementSibling;
  if (!label) return;

  label.classList.toggle("checked-text", checkbox.checked);
  localStorage.setItem(checkbox.id, checkbox.checked);
}

function loadCheckboxState() {
  document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
    const saved = localStorage.getItem(cb.id);
    cb.checked = saved === "true";

    const label = cb.nextElementSibling;
    if (label) {
      label.classList.toggle("checked-text", cb.checked);
    }
  });
}

function clearAllStrikes() {
  document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    const label = cb.nextElementSibling;
    if (label) label.classList.remove('checked-text');
    localStorage.setItem(cb.id, false);
  });

  saveCustomItems();
  updateCustomItemBorder();
}

// 사용자 준비물 추가 / 삭제

function addCustomItem(text, id = null, checked = false) {
  const container = document.querySelector('.scd');
  const clearBtn = document.getElementById('clearStrikesBtn');
  if (!container || !clearBtn) return;

  const itemId = id || `custom_${Date.now()}`;

  const div = document.createElement('div');
  div.className = 'check-item custom-item';

  div.innerHTML = `
    <input type="checkbox" id="${itemId}">
    <label for="${itemId}" style="cursor: pointer;">${text}</label>
    <button type="button" class="delete-btn" aria-label="삭제">삭제하기</button>
  `;

  container.insertBefore(div, clearBtn);

  const checkbox = div.querySelector('input');
  const deleteBtn = div.querySelector('.delete-btn');

  checkbox.checked = checked;
  toggleStrike(checkbox);

  checkbox.addEventListener('change', () => {
    toggleStrike(checkbox);
    saveCustomItems();
  });

  deleteBtn.addEventListener('click', () => {
    localStorage.removeItem(itemId);
    div.remove();
    saveCustomItems();
    updateCustomItemBorder();
  });

  saveCustomItems();
  updateCustomItemBorder();
}

function saveCustomItems() {
  const items = [];
  document.querySelectorAll('.custom-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    items.push({
      id: cb.id,
      text: cb.nextElementSibling.textContent,
      checked: cb.checked
    });
  });
  localStorage.setItem('customItems', JSON.stringify(items));
}

function loadCustomItems() {
  const saved = localStorage.getItem('customItems');
  if (!saved) return;

  JSON.parse(saved).forEach(item => {
    addCustomItem(item.text, item.id, item.checked);
  });
}

function updateCustomItemBorder() {
  const items = document.querySelectorAll('.custom-item');

  items.forEach(item => {
    item.style.borderBottom = 'none';
    item.style.paddingBottom = '0';
  });

  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    lastItem.style.borderBottom = '1px solid #333';
    lastItem.style.paddingBottom = '10px';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => toggleStrike(cb));
  });

  loadCheckboxState();
  loadCustomItems();

  // 사용자 준비물 추가
  const addBtn = document.getElementById('addCustomItemBtn');
  const input = document.getElementById('customItemInput');

  if (addBtn && input) {
    addBtn.addEventListener('click', () => {
      const value = input.value.trim();
      if (!value) return;

      addCustomItem(value);

      input.value = '';
      input.focus();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  // 전체 초기화
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
  const targetDay = new Date(2026, 1, 7);

  const targetTime = new Date("2026-02-07T15:00:00+09:00");

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
      alert('계산기를 열어 추가해주세요.');
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

document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.querySelector('.Live-Setlist');
  const popup = document.querySelector('.popup_12');
  const closeBtn = document.querySelector('.popup_12_popi a');

  // 팝업 열기
  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    popup.style.display = 'block';
  });

  // 팝업 닫기
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    popup.style.display = 'none';
  });
});