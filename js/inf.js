// 준비물 취소선(데이터 저장)
function toggleStrike(checkbox) {
  const label = checkbox.parentElement.querySelector('span');
  if (!label) return;

  label.classList.toggle("checked-text", checkbox.checked);
  localStorage.setItem(checkbox.id, checkbox.checked);
}

function loadCheckboxState() {
  document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
    const saved = localStorage.getItem(cb.id);
    cb.checked = saved === "true";

    const label = cb.parentElement.querySelector('span');
    if (label) {
      label.classList.toggle("checked-text", cb.checked);
    }
  });
}

function clearAllStrikes() {
  document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
    cb.checked = false;

    const label = cb.parentElement.querySelector('span');
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
    <label class="check-item-inner">
      <input type="checkbox" id="${itemId}">
      <span>${text}</span>
    </label>
    <button type="button" class="delete-btn">삭제하기</button>
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

deleteBtn.addEventListener('click', (e) => {
  e.stopPropagation();

  if (!confirm('추가한 준비물을 삭제하시겠습니까?')) return;

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
      text: cb.parentElement.querySelector('span').textContent,
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
  const targetDay = new Date("2026, 8, 25"); //형식 ex: 2026, 1, 7 (2026년 2월 7일)
  const targetTime = new Date("2026-07-25T15:00:00"); //형식 ex: 2026-02-15T15:00:00

  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");

  if (isNaN(targetDay.getTime()) || isNaN(targetTime.getTime())) {
    ddayElement.textContent = "일정 미정";
    timeLeftElement.textContent = "";
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((targetDay - today) / 86400000);

  const isDDay = today.getTime() === targetDay.getTime();

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
document.addEventListener('DOMContentLoaded', () => {
  const calcRow = document.getElementById('calculator-row');
  const calcList = document.getElementById('calcList');
  const calcTotal = document.getElementById('calcTotal');
  const header = document.querySelector('.calculator-header');

  const openBtn = document.getElementById('Calculator');
  const resetBtn = document.getElementById('resetCalc');
  const closeBtn = document.getElementById('closeCalc');

  let isCalcOpen = false;
  let activeConcert = null;
  const cart = {};


  openBtn.addEventListener('click', () => {
    calcRow.style.display = 'table-row';
    isCalcOpen = true;
    updateHeader();
  });

  closeBtn.addEventListener('click', () => {
    calcRow.style.display = 'none';
    isCalcOpen = false;
    resetCalculator();
  });

  resetBtn.addEventListener('click', resetCalculator);

  function resetCalculator() {
    activeConcert = null;
    for (const k in cart) delete cart[k];
    calcList.innerHTML = '';
    calcTotal.textContent = '0';
    updateHeader();
  }

  function updateHeader() {
    let text = '🟢 계산기 활성화 중';
    if (activeConcert === 'jan') text += ' (1월콘)';
    if (activeConcert === 'feb') text += ' (2월콘)';
    header.childNodes[0].nodeValue = text + ' ';
  }


  function render() {
    let total = 0;
    calcList.innerHTML = '';

    Object.values(cart).forEach(item => {
      total += item.price * item.count;
      const li = document.createElement('li');
      li.textContent = `${item.name} × ${item.count}`;
      calcList.appendChild(li);
    });

    calcTotal.textContent = total.toLocaleString();
  }


  document.querySelectorAll('#price-row').forEach(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length !== 3) return;

    tds.forEach((td, index) => {
      if (index === 0) return;

      td.addEventListener('click', () => {
        if (!isCalcOpen) {
          alert('계산기 열기 버튼을 클릭하여 추가하십시오');
          return;
        }

        if (!activeConcert) {
          activeConcert = index === 1 ? 'jan' : 'feb';
          updateHeader();
        }

        const priceTd =
          activeConcert === 'jan' ? tds[1] : tds[2];

        const priceMatch = priceTd.innerText.match(/([0-9,]+)원/);
        if (!priceMatch) return;

        const price = Number(priceMatch[1].replace(/,/g, ''));
        if (!price) return;

        const name = row.cells[0].innerText.trim();
        const key = `${name}_${price}_${activeConcert}`;

        cart[key] = cart[key] || {
          name,
          price,
          count: 0
        };

        cart[key].count++;
        render();
      });
    });
  });
});


// 셋리스트 팝업
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.querySelector('.Live-Setlist');
  const popup = document.querySelector('.popup_12');
  const closeBtn = document.querySelector('.popup_exe');

  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    popup.style.display = 'block';
  });

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    popup.style.display = 'none';
  });
});