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

  document.querySelectorAll('.check-item input[type="checkbox"]').forEach((cb, index) => {
    if (!cb.id) {
      cb.id = `default_${index}`;
    }
  });

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
let _ddayTarget = { day: null, time: null };

function updateDDay() {
  const ddayElement = document.getElementById("dday");
  const timeLeftElement = document.getElementById("timeLeft");
  if (!ddayElement || !timeLeftElement) return;

  const targetDay  = _ddayTarget.day;
  const targetTime = _ddayTarget.time;

  if (!targetDay || isNaN(targetDay.getTime()) || !targetTime || isNaN(targetTime.getTime())) {
    ddayElement.textContent = "일정 미정";
    timeLeftElement.textContent = "";
    return;
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((targetDay - today) / 86400000);
  const isDDay   = today.getTime() === targetDay.getTime();

  if (diffDays > 0 && !isDDay) {
    ddayElement.textContent = `D-${diffDays}`;
  } else if (isDDay) {
    ddayElement.textContent = "🎉 D-DAY! 🎉";
  } else {
    ddayElement.textContent = `D+${Math.abs(diffDays)}`;
  }

  const absDiff = Math.abs(targetTime - now);
  const hours   = Math.floor(absDiff / (1000 * 60 * 60));
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




// ============ DB 데이터 로드 ============

function extractUrl(text) {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : null;
}

function buildConcertTable(concerts) {
  const headRow = document.getElementById('concert-head-row');
  const tbody = document.getElementById('concert-tbody');
  if (!headRow || !tbody) return;

  concerts.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c.name + (c.status === '취소' ? `(${c.status})` : '');
    headRow.appendChild(th);
  });

  const rowDefs = [
    {
      label: '날짜',
      cell: (c) => {
        const parts = [c.date_label, c.status ? `(${c.status})` : ''].filter(Boolean);
        return parts.join('') || '정보 없음';
      }
    },
    {
      label: '티켓 인포',
      html: (c) => {
        const url = extractUrl(c.ticketing_info);
        if (url) {
          const label = (c.ticketing_info || '').replace(/\s*\(https?:\/\/[^\s)]+\)/, '').trim();
          return `<a href="${url}" class="fldzm" target="_blank" rel="noopener noreferrer">${label || '바로가기'}</a>`;
        }
        return c.ticketing_info || '정보 없음';
      }
    },
    {
      label: '가격',
      cell: (c) => c.ticket_price ? c.ticket_price.toLocaleString() + '￦' : '정보 없음'
    },
    {
      label: '배송비',
      cell: (c) => c.delivery_fee ? c.delivery_fee.toLocaleString() + '￦' : '정보 없음'
    },
    {
      label: '티켓팅',
      cell: (c) => c.status || '정보 없음'
    },
    {
      label: '입장 전 대기 시간<br>및 입장 시작 시간',
      cell: (c) => c.waiting_time || '정보 없음'
    },
    {
      label: '입장 후 대기 시간',
      cell: (c) => c.entry_wait_time || '정보 없음'
    },
    {
      label: '진행 시간',
      cell: (c) => c.run_time || '정보 없음'
    },
    {
      label: '굿즈 구매 시간<br>(품절 주의)',
      cell: (c) => c.goods_sale_time || '정보 없음'
    },
    {
      label: '장소',
      html: (c) => {
        if (!c.location_url) return '정보 없음';
        return `<div class="map-wrap" id="map-area-${c.id}">
          <iframe src="${c.location_url}" style="padding-bottom:10px;"></iframe>
        </div>
        <a href="${c.location_url}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;color:blue;">
          길찾기 / 상세 위치 보기</a>`;
      },
      tdStyle: (c) => c.location_url ? 'padding:0;padding-bottom:10px;' : ''
    },
    {
      label: '드레스 코드',
      cell: (c) => c.dress_code || '정보 없음'
    },
    {
      label: '셋리스트 보기',
      html: (c, idx) => {
        if (!c.setlist_url) {
          return idx === 0
            ? `<span class="Live-Setlist"><a href="#">셋리스트 보기</a></span>`
            : '정보 없음';
        }
        return `<a href="${c.setlist_url}" class="fldzm" target="_blank" rel="noopener noreferrer">셋리스트 보기</a>`;
      }
    },
    {
      label: '추가 정보 보기',
      html: (c) => {
        if (!c.extra_info_url) return '정보 없음';
        return `<a href="${c.extra_info_url}" class="fldzm" target="_blank" rel="noopener noreferrer">체리 숲 바로가기</a>`;
      }
    }
  ];

  rowDefs.forEach(def => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.innerHTML = def.label;
    tr.appendChild(th);

    concerts.forEach((c, idx) => {
      const td = document.createElement('td');
      if (def.tdStyle) td.setAttribute('style', def.tdStyle(c));
      if (def.html) {
        td.innerHTML = def.html(c, idx);
      } else {
        td.textContent = def.cell(c, idx);
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function buildGoodsTable(goods, config) {
  const headRow = document.getElementById('goods-head-row');
  const tbody = document.getElementById('goods-tbody');
  if (!headRow || !tbody) return;

  // ALL 굿즈(concert_ref=null)와 일반 굿즈 분리
  const allGoods    = goods.filter(g => g.concert_ref === null);
  const normalGoods = goods.filter(g => g.concert_ref !== null);

  // 고유 concert_ref 목록 (순서 유지, null 제외)
  const refs = [];
  normalGoods.forEach(g => {
    if (!refs.includes(g.concert_ref)) refs.push(g.concert_ref);
  });

  refs.forEach(ref => {
    const th = document.createElement('th');
    th.textContent = ref + ' 굿즈 가격';
    headRow.appendChild(th);
  });

  // 굿즈 맵: name → { ref: goodObject }
  const goodsMap = {};
  normalGoods.forEach(g => {
    if (!goodsMap[g.goods_name]) goodsMap[g.goods_name] = {};
    goodsMap[g.goods_name][g.concert_ref] = g;
  });
  // ALL 굿즈를 각 콘서트 ref에 주입 (price는 price_data에서 추출)
  allGoods.forEach(g => {
    if (!goodsMap[g.goods_name]) goodsMap[g.goods_name] = {};
    refs.forEach(ref => {
      const p = g.price_data ? Number(g.price_data[ref]) : null;
      goodsMap[g.goods_name][ref] = { ...g, price: isNaN(p) ? null : p };
    });
  });

  // 고유 이름 목록 (첫 등장 순서)
  const names = [];
  goods.forEach(g => {
    if (!names.includes(g.goods_name)) names.push(g.goods_name);
  });

  function getGroupName(name) {
    return (Object.values(goodsMap[name])[0] || {}).group_name || null;
  }

  // 그룹핑: 같은 group_name끼리 묶기 (등장 순서 유지)
  const seenGroups = {};
  const orderedItems = [];
  names.forEach(name => {
    const group = getGroupName(name);
    if (!group) {
      orderedItems.push({ type: 'single', name });
    } else {
      if (!seenGroups[group]) {
        const entry = { type: 'group', group, names: [] };
        seenGroups[group] = entry;
        orderedItems.push(entry);
      }
      seenGroups[group].names.push(name);
    }
  });

  function makeGoodsTd(name, ref) {
    const td = document.createElement('td');
    const g = goodsMap[name] && goodsMap[name][ref];
    if (!g) {
      td.textContent = '×';
    } else {
      const parts = [];
      if (g.price !== null && g.price !== undefined) parts.push(g.price.toLocaleString() + '원');
      if (g.quantity_info) parts.push(g.quantity_info);
      if (g.detail) parts.push(g.detail);
      td.innerHTML = parts.length ? parts.join('<br>') : '정보 없음';
    }
    return td;
  }

  function makeItemRow(name, isHidden, group) {
    const tr = document.createElement('tr');
    tr.className = 'price-row' + (isHidden ? ' hidden-row' : '');
    if (group) tr.dataset.group = group;
    if (isHidden) tr.style.display = 'none';

    const td0 = document.createElement('td');
    td0.textContent = name;
    tr.appendChild(td0);
    refs.forEach(ref => tr.appendChild(makeGoodsTd(name, ref)));
    return tr;
  }

  // 행 렌더링
  orderedItems.forEach(item => {
    if (item.type === 'single') {
      tbody.appendChild(makeItemRow(item.name, false, null));
    } else {
      // 클릭 가능한 그룹 헤더 행
      const headerTr = document.createElement('tr');
      headerTr.className = 'clickable-row';
      headerTr.dataset.group = item.group;
      const headerTd = document.createElement('td');
      headerTd.colSpan = 1 + refs.length;
      headerTd.innerHTML = `<span class="arrow">▼</span> 전체 ${item.group} 보기`;
      headerTr.appendChild(headerTd);
      tbody.appendChild(headerTr);

      // 숨김 굿즈 행
      item.names.forEach(name => tbody.appendChild(makeItemRow(name, true, item.group)));
    }
  });

  // 합계 행
  const totalTr = document.createElement('tr');
  const totalTd0 = document.createElement('td');
  totalTd0.innerHTML = '전체 가격<br><div style="font-size:13px;">(도안당 1개 기준)</div>';
  totalTr.appendChild(totalTd0);
  refs.forEach(ref => {
    const td = document.createElement('td');
    const manualTotal = config && config['goods_total_' + ref];
    td.textContent = manualTotal || '정보 없음';
    totalTr.appendChild(td);
  });
  tbody.appendChild(totalTr);

  // 계산기 행
  const calcTr = document.createElement('tr');
  calcTr.id = 'calculator-row';
  calcTr.style.display = 'none';
  calcTr.innerHTML = `<td colspan="${1 + refs.length}">
    <div class="calculator">
      <div class="calculator-header">
        🟢 계산기 활성화 중
        <button id="resetCalc">초기화</button>
        <button id="closeCalc">닫기</button>
      </div>
      <ul id="calcList"></ul>
      <div class="calc-total">총합: <span id="calcTotal">0</span>원</div>
    </div>
  </td>`;
  tbody.appendChild(calcTr);

  // 그룹 접기/펼치기 이벤트 위임
  tbody.addEventListener('click', (e) => {
    const headerRow = e.target.closest('.clickable-row');
    if (!headerRow) return;

    const group = headerRow.dataset.group;
    const arrow = headerRow.querySelector('.arrow');

    tbody.querySelectorAll(`.hidden-row[data-group="${group}"]`).forEach(r => {
      if (r.classList.contains('show')) {
        r.classList.remove('show');
        setTimeout(() => { r.style.display = 'none'; }, 300);
        if (arrow) arrow.classList.remove('rotate');
      } else {
        r.style.display = 'table-row';
        setTimeout(() => { r.classList.add('show'); }, 10);
        if (arrow) arrow.classList.add('rotate');
      }
    });
  });
}

function buildWaitingGroup(groups) {
  const el = document.getElementById('waiting-group-list');
  if (!el) return;
  if (!groups || !groups.length) { el.innerHTML = ''; return; }
  let html = '';
  groups.forEach(g => {
    html += `<b>${g.group_name}</b><br>`;
    if (g.wait_start)  html += `입장 전 대기(줄서기): ${g.wait_start}<br>`;
    if (g.entry_start) html += `입장 시작: ${g.entry_start}<br>`;
    html += '<br>';
  });
  el.innerHTML = html;
}

function parseLinks(text) {
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" class="fldzm" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function buildNotices(notices) {
  const typeConfig = {
    '안내':    { id: 'notice-안내',    title: '※ 안내 사항 ※' },
    '주의':    { id: 'notice-주의',    title: '⚠️ 주의 사항' },
    '환불':    { id: 'notice-환불',    title: '※ 환불 안내 ※' },
    '추가정보': { id: 'notice-추가정보', title: '※ 추가 정보 ※' },
    '대기안내': { id: 'notice-대기안내', title: '※ 안내 사항 ※' },
    '대기참고': { id: 'notice-대기참고', title: '※ 참고 사항 ※' }
  };

  const grouped = {};
  notices.forEach(n => {
    if (!grouped[n.type]) grouped[n.type] = [];
    grouped[n.type].push(n);
  });

  Object.entries(grouped).forEach(([type, items]) => {
    const cfg = typeConfig[type];
    if (!cfg) return;
    const el = document.getElementById(cfg.id);
    if (!el) return;

    let html = `<h3>${cfg.title}</h3><p>`;
    items.forEach(item => {
      html += `• ${parseLinks(item.content)}<br><br>`;
    });

    const sources = [...new Set(items.map(i => i.source).filter(Boolean))];
    if (sources.length) {
      html += `<strong>본 내용은 ${sources.join(', ')}을(를) 기준으로 작성되었습니다.</strong>`;
    }
    html += '</p>';
    el.innerHTML = html;
  });
}

function initCalculator() {
  const openBtn = document.getElementById('Calculator');
  if (!openBtn) return;

  const goodsTbody = document.getElementById('goods-tbody');
  if (!goodsTbody) return;

  let isCalcOpen = false;
  let activeConcertIdx = null;
  const cart = {};

  function getRefNames() {
    const ths = document.querySelectorAll('#goods-head-row th');
    return Array.from(ths).slice(1).map(th => th.textContent.replace(' 굿즈 가격', ''));
  }

  function updateHeader() {
    const header = document.querySelector('.calculator-header');
    if (!header) return;
    const refs = getRefNames();
    let text = '🟢 계산기 활성화 중';
    if (activeConcertIdx !== null && refs[activeConcertIdx - 1]) {
      text += ` (${refs[activeConcertIdx - 1]})`;
    }
    header.childNodes[0].nodeValue = text + ' ';
  }

  function render() {
    const calcList = document.getElementById('calcList');
    const calcTotal = document.getElementById('calcTotal');
    if (!calcList || !calcTotal) return;
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

  function resetCalculator() {
    activeConcertIdx = null;
    for (const k in cart) delete cart[k];
    const calcList = document.getElementById('calcList');
    const calcTotal = document.getElementById('calcTotal');
    if (calcList) calcList.innerHTML = '';
    if (calcTotal) calcTotal.textContent = '0';
    updateHeader();
  }

  openBtn.addEventListener('click', () => {
    const calcRow = document.getElementById('calculator-row');
    if (calcRow) calcRow.style.display = 'table-row';
    isCalcOpen = true;
    updateHeader();
  });

  // 이벤트 위임으로 닫기/초기화 버튼과 굿즈 행 클릭 처리
  goodsTbody.addEventListener('click', (e) => {
    if (e.target.id === 'closeCalc') {
      const calcRow = document.getElementById('calculator-row');
      if (calcRow) calcRow.style.display = 'none';
      isCalcOpen = false;
      resetCalculator();
      return;
    }
    if (e.target.id === 'resetCalc') {
      resetCalculator();
      return;
    }

    const td = e.target.closest('td');
    if (!td) return;
    const row = td.closest('tr.price-row');
    if (!row) return;

    if (!isCalcOpen) {
      alert('계산기 열기 버튼을 클릭하여 추가하십시오');
      return;
    }

    const tds = row.querySelectorAll('td');
    const tdIdx = Array.from(tds).indexOf(td);
    if (tdIdx === 0) return;

    if (activeConcertIdx === null) {
      activeConcertIdx = tdIdx;
      updateHeader();
    }

    const priceTd = tds[activeConcertIdx];
    if (!priceTd) return;
    const priceMatch = priceTd.innerText.match(/([0-9,]+)원/);
    if (!priceMatch) return;

    const price = Number(priceMatch[1].replace(/,/g, ''));
    if (!price) return;

    const name = tds[0].innerText.trim();
    const key = `${name}_${price}_${activeConcertIdx}`;
    cart[key] = cart[key] || { name, price, count: 0 };
    cart[key].count++;
    render();
  });
}

function initSetlistPopup() {
  const popup = document.querySelector('.popup_12');
  const closeBtn = document.querySelector('.popup_exe');
  if (!popup || !closeBtn) return;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.Live-Setlist a');
    if (link) {
      e.preventDefault();
      popup.style.display = 'block';
    }
  });

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    popup.style.display = 'none';
  });
}

async function loadInfData() {
  try {
    const res = await fetch('/api/get-inf');
    if (!res.ok) throw new Error('API 응답 오류: ' + res.status);
    const data = await res.json();

    buildConcertTable(data.concerts);
    buildGoodsTable(data.goods, data.config);
    buildNotices(data.notices);
    buildWaitingGroup(data.waiting_groups);

    const subtitle = document.getElementById('goods-subtitle');
    if (subtitle && data.config && data.config.goods_subtitle) {
      subtitle.textContent = '※ ' + data.config.goods_subtitle;
    }

    if (data.config) {
      const dateStr = data.config.next_concert_date;
      const timeStr = data.config.next_concert_time;
      if (dateStr) _ddayTarget.day  = new Date(dateStr);
      if (timeStr) _ddayTarget.time = new Date(timeStr);
      updateDDay();
    }

    initCalculator();
    initSetlistPopup();
  } catch (e) {
    console.error('데이터 로드 실패:', e);
  }
}

document.addEventListener('DOMContentLoaded', loadInfData);

// 네이버 앱에서만 지도 숨김 처리
window.addEventListener('DOMContentLoaded', function() {
    var agent = navigator.userAgent.toLowerCase();
    
    // 네이버 앱인지 확인
    if (agent.indexOf('naver') !== -1) {
        var mapArea = document.getElementById('map-area');
        if (mapArea) {
            // 지도 영역만 숨김 클래스 추가
            mapArea.classList.add('hide-in-naver');
        }
    }
});