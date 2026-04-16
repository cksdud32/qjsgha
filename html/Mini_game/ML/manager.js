// 탭 전환 로직
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');

    // 탭 버튼 활성화
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 탭 콘텐츠 표시
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
      targetTab.classList.add('active');

      // 탭별 데이터 로드
      if (tabName === 'suggestions') {
        loadSuggestions();
      } else if (tabName === 'edit-problem') {
        console.log('Switching to edit-problem tab');
        loadEditProblems();
      } else if (tabName === 'ranking') {
        loadRanking();
      }
    }
  });
});

// 헬퍼: 상태 메시지 표시
function showStatus(elementId, message, type = 'success') {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-msg show ${type}`;
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 4000);
  }
}

// ==================== 건의사항 검토 ====================
async function loadSuggestions() {
  const container = document.getElementById('suggestionsList');
  container.innerHTML = '<p class="loading">로딩 중...</p>';

  try {
    const response = await fetch('/api/admin?action=get-suggestions');
    if (!response.ok) throw new Error('건의사항을 불러올 수 없습니다.');

    const suggestions = await response.json();
    container.innerHTML = '';

    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = '<p class="loading">건의된 문제가 없습니다.</p>';
      return;
    }

    suggestions.forEach(suggestion => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-header">
          <div>
            <div class="list-item-title">${escapeHtml(suggestion.question_text || '제목 없음')}</div>
            <div class="list-item-meta">건의자: ${escapeHtml(suggestion.name || '익명')} | 난이도: ${suggestion.level_name || '-'}</div>
          </div>
        </div>
        <div class="list-item-content">
          <strong>정답:</strong> ${escapeHtml(suggestion.answer || '-')}
        </div>
        <div class="list-item-actions">
          <button class="btn btn-success" onclick="approveSuggestion(${suggestion.id})">✓ 승인</button>
          <button class="btn btn-danger" onclick="rejectSuggestion(${suggestion.id})">✕ 기각</button>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('건의사항 로드 오류:', error);
    container.innerHTML = '<p class="loading">오류 발생: ' + error.message + '</p>';
  }
}

async function approveSuggestion(suggestionId) {
  try {
    const response = await fetch('/api/admin?action=approve-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId })
    });

    if (!response.ok) throw new Error('승인에 실패했습니다.');

    showStatus('suggestionsList', '문제가 승인되어 추가되었습니다.', 'success');
    loadSuggestions();
  } catch (error) {
    showStatus('suggestionsList', error.message, 'error');
  }
}

async function rejectSuggestion(suggestionId) {
  if (!confirm('정말로 기각하시겠습니까?')) return;

  try {
    const response = await fetch('/api/admin?action=reject-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId })
    });

    if (!response.ok) throw new Error('기각에 실패했습니다.');

    showStatus('suggestionsList', '건의사항이 기각되었습니다.', 'success');
    loadSuggestions();
  } catch (error) {
    showStatus('suggestionsList', error.message, 'error');
  }
}

// ==================== 문제 추가 ====================
document.getElementById('addProblemForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const questionText = document.getElementById('newQuestionText').value.trim();
  const answer = document.getElementById('newAnswer').value.trim();
  const difficulty = document.getElementById('newDifficulty').value;

  if (!questionText || !answer || !difficulty) {
    showStatus('addProblemStatus', '모든 필드를 입력해주세요.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/admin?action=add-problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_text: questionText,
        answer: answer,
        difficulty: difficulty
      })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || '문제 추가에 실패했습니다.');

    showStatus('addProblemStatus', '문제가 추가되었습니다.', 'success');
    document.getElementById('addProblemForm').reset();
  } catch (error) {
    showStatus('addProblemStatus', error.message, 'error');
  }
});

// ==================== 문제 수정 ====================
async function loadEditProblems() {
  console.log('loadEditProblems called');

  // 섹션 탭 초기화 (중복 방지)
  if (!document.querySelector('.edit-tab-btn').hasAttribute('data-listener-added')) {
    document.querySelectorAll('.edit-tab-btn').forEach(btn => {
      btn.setAttribute('data-listener-added', 'true');
      btn.addEventListener('click', () => {
        const section = btn.getAttribute('data-section');
        console.log('Tab clicked:', section);

        document.querySelectorAll('.edit-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.edit-section').forEach(s => s.classList.remove('active'));

        btn.classList.add('active');
        const targetSection = document.getElementById(`${section}-problems`);
        if (targetSection) targetSection.classList.add('active');

        if (section === 'existing') {
          loadExistingProblems();
        } else {
          loadSuggestedEditProblems();
        }
      });
    });
  }

  // 기본으로 기존 문제 로드
  loadExistingProblems();
}

async function loadExistingProblems(page = 1) {
  const difficultySelect = document.getElementById('existingDifficulty');
  const difficulty = difficultySelect?.value || '';
  const container = document.getElementById('existingProblemList');
  container.innerHTML = '<p class="loading">로딩 중...</p>';

  console.log('Loading existing problems for difficulty:', difficulty, 'page:', page);

  try {
    const url = difficulty
      ? `/api/admin?action=get-all-problems&difficulty=${difficulty}&page=${page}`
      : `/api/admin?action=get-all-problems&page=${page}`;

    const response = await fetch(url);
    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error('문제를 불러올 수 없습니다.');
    }

    const data = await response.json();
    const problems = data.problems;
    const hasMore = data.hasMore;

    console.log('Received problems:', problems.length, 'hasMore:', hasMore);

    container.innerHTML = '';

    if (!problems || problems.length === 0) {
      container.innerHTML = '<p class="loading">문제가 없습니다.</p>';
      return;
    }

    problems.forEach(problem => {
      const div = document.createElement('div');
      const extraAnswer2 = problem.question_text2 ? `<br><strong>추가 정답 2:</strong><br><input type="text" value="${escapeHtml(problem.question_text2)}" readonly style="width:100%;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.6);color:#e2e8f0;margin-top:8px;">` : '';
      const extraAnswer3 = problem.question_text3 ? `<br><strong>추가 정답 3:</strong><br><input type="text" value="${escapeHtml(problem.question_text3)}" readonly style="width:100%;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.6);color:#e2e8f0;margin-top:8px;">` : '';
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-header">
          <div>
            <div class="list-item-title">ID: ${problem.id}</div>
            <div class="list-item-meta">난이도: ${problem.difficulty || '-'}</div>
          </div>
        </div>
        <div class="list-item-content">
          <strong>문제:</strong><br>
          <textarea id="edit-q-${problem.id}" style="width:100%;min-height:80px;margin-top:8px;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.8);color:#f8fafc;">${escapeHtml(problem.question_text || '')}</textarea><br><br>
          <strong>정답:</strong><br>
          <input id="edit-a-${problem.id}" type="text" value="${escapeHtml(problem.answer || '')}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.8);color:#f8fafc;margin-top:8px;"><br><br>
          ${extraAnswer2}
          ${extraAnswer3}
          <strong>난이도:</strong><br>
          <select id="edit-d-${problem.id}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.8);color:#f8fafc;margin-top:8px;">
            <option value="1" ${problem.difficulty_id == 1 ? 'selected' : ''}>쉬움</option>
            <option value="2" ${problem.difficulty_id == 2 ? 'selected' : ''}>보통</option>
            <option value="3" ${problem.difficulty_id == 3 ? 'selected' : ''}>어려움</option>
          </select>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-primary" onclick="updateProblem(${problem.id})">저장</button>
          <button class="btn btn-danger" onclick="deleteProblem(${problem.id})">삭제</button>
        </div>
      `;
      container.appendChild(div);
    });

    // 페이지네이션 버튼 추가
    if (hasMore || page > 1) {
      const paginationDiv = document.createElement('div');
      paginationDiv.style.cssText = 'text-align: center; margin-top: 20px; padding: 10px;';
      
      if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary';
        prevBtn.textContent = '이전';
        prevBtn.onclick = () => loadExistingProblems(page - 1);
        prevBtn.style.marginRight = '10px';
        paginationDiv.appendChild(prevBtn);
      }
      
      if (hasMore) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = '다음';
        nextBtn.onclick = () => loadExistingProblems(page + 1);
        paginationDiv.appendChild(nextBtn);
      }
      
      container.appendChild(paginationDiv);
    }
  } catch (error) {
    console.error('기존 문제 로드 오류:', error);
    container.innerHTML = '<p class="loading">오류 발생: ' + error.message + '</p>';
  }
}

async function updateProblem(problemId) {
  const questionEl = document.getElementById(`edit-q-${problemId}`);
  const answerEl = document.getElementById(`edit-a-${problemId}`);
  const difficultyEl = document.getElementById(`edit-d-${problemId}`);

  if (!questionEl || !answerEl || !difficultyEl) {
    alert('입력 필드를 찾을 수 없습니다.');
    return;
  }

  const question = questionEl.value.trim();
  const answer = answerEl.value.trim();
  const difficulty = difficultyEl.value;

  if (!question || !answer || !difficulty) {
    alert('문제, 정답, 난이도를 모두 입력해주세요.');
    return;
  }

  try {
    const response = await fetch('/api/admin?action=update-problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId,
        question_text: question,
        answer: answer,
        difficulty_id: parseInt(difficulty)
      })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || '수정에 실패했습니다.');

    alert('문제가 수정되었습니다.');
    loadExistingProblems();
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

async function deleteProblem(problemId) {
  if (!confirm('정말로 이 문제를 삭제하시겠습니까?')) return;

  try {
    const response = await fetch('/api/admin?action=delete-problem', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || '삭제에 실패했습니다.');

    alert('문제가 삭제되었습니다.');
    loadExistingProblems();
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

async function loadSuggestedEditProblems() {
  const container = document.getElementById('editProblemList');
  container.innerHTML = '<p class="loading">로딩 중...</p>';

  try {
    const response = await fetch('/api/admin?action=get-suggested-problems');
    if (!response.ok) throw new Error('문제를 불러올 수 없습니다.');

    const problems = await response.json();
    container.innerHTML = '';

    if (!problems || problems.length === 0) {
      container.innerHTML = '<p class="loading">건의된 문제가 없습니다.</p>';
      return;
    }

    problems.forEach(problem => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-header">
          <div>
            <div class="list-item-title">${escapeHtml(problem.question_text || '제목 없음')}</div>
            <div class="list-item-meta">건의자: ${escapeHtml(problem.name || '익명')}</div>
          </div>
        </div>
        <div class="list-item-content">
          <strong>원래 정답:</strong> ${escapeHtml(problem.answer || '-')}<br>
          <textarea id="edit-sugg-answer-${problem.id}" style="width:100%;min-height:60px;margin-top:8px;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.8);color:#f8fafc;" placeholder="수정된 정답을 입력하세요">${escapeHtml(problem.answer || '')}</textarea><br><br>
          <strong>난이도:</strong><br>
          <select id="edit-sugg-diff-${problem.id}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #60a5fa;background:rgba(15,23,42,0.8);color:#f8fafc;margin-top:8px;">
            <option value="1" ${problem.difficulty_id == 1 ? 'selected' : ''}>쉬움</option>
            <option value="2" ${problem.difficulty_id == 2 ? 'selected' : ''}>보통</option>
            <option value="3" ${problem.difficulty_id == 3 ? 'selected' : ''}>어려움</option>
          </select>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-primary" onclick="saveSuggestedProblemEdit(${problem.id}, '${escapeHtml(problem.question_text)}')">수정후 추가</button>
          <button class="btn btn-secondary" onclick="loadSuggestedEditProblems()">취소</button>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('건의 문제 로드 오류:', error);
    container.innerHTML = '<p class="loading">오류 발생: ' + error.message + '</p>';
  }
}

async function saveSuggestedProblemEdit(problemId, questionText) {
  const editAnswerEl = document.getElementById(`edit-sugg-answer-${problemId}`);
  const editDiffEl = document.getElementById(`edit-sugg-diff-${problemId}`);
  const editedAnswer = editAnswerEl?.value.trim();
  const editedDifficulty = editDiffEl?.value;

  if (!editedAnswer || !editedDifficulty) {
    alert('정답과 난이도를 모두 입력해주세요.');
    return;
  }

  try {
    const response = await fetch('/api/admin?action=add-problem-from-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_text: questionText,
        answer: editedAnswer,
        difficulty_id: parseInt(editedDifficulty),
        suggestionId: problemId
      })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || '저장에 실패했습니다.');

    alert('문제가 추가되었습니다.');
    loadSuggestedEditProblems();
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

// 기존 난이도 필터
document.getElementById('existingDifficulty')?.addEventListener('change', (e) => {
  console.log('Difficulty changed to:', e.target.value);
  loadExistingProblems(1); // 첫 페이지부터 로드
});

// ==================== 랭킹 관리 ====================
async function loadRanking(page = 1) {
  const difficulty = document.getElementById('rankingDifficulty').value;
  const container = document.getElementById('rankingList');
  container.innerHTML = '<p class="loading">로딩 중...</p>';

  try {
    const response = await fetch(`/api/admin?action=get-admin-ranking&difficulty=${difficulty}&page=${page}`);
    if (!response.ok) throw new Error('랭킹을 불러올 수 없습니다.');

    const data = await response.json();
    const rankings = data.rankings;
    const hasMore = data.hasMore;

    container.innerHTML = '';

    if (!rankings || rankings.length === 0) {
      container.innerHTML = '<p class="loading">랭킹이 없습니다.</p>';
      return;
    }

    rankings.forEach((ranking, index) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-header">
          <div>
            <div class="list-item-title">${(page - 1) * 10 + index + 1}. ${escapeHtml(ranking.name)}</div>
            <div class="list-item-meta">점수: ${ranking.score}점 | 등록: ${new Date(ranking.created_at).toLocaleDateString('ko-KR')}</div>
          </div>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-danger" onclick="deleteRanking(${ranking.id})">삭제</button>
        </div>
      `;
      container.appendChild(div);
    });

    // 페이지네이션 버튼 추가
    if (hasMore || page > 1) {
      const paginationDiv = document.createElement('div');
      paginationDiv.style.cssText = 'text-align: center; margin-top: 20px; padding: 10px;';
      
      if (page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary';
        prevBtn.textContent = '이전';
        prevBtn.onclick = () => loadRanking(page - 1);
        prevBtn.style.marginRight = '10px';
        paginationDiv.appendChild(prevBtn);
      }
      
      if (hasMore) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = '다음';
        nextBtn.onclick = () => loadRanking(page + 1);
        paginationDiv.appendChild(nextBtn);
      }
      
      container.appendChild(paginationDiv);
    }

    // 이번 달 전체 삭제 버튼 추가 (첫 페이지에만)
    if (page === 1) {
      const bulkDeleteDiv = document.createElement('div');
      bulkDeleteDiv.style.cssText = 'text-align: center; margin-top: 20px; padding: 10px;';
      bulkDeleteDiv.innerHTML = `
        <button class="btn btn-danger" onclick="deleteAllRankingForCurrentMonth()" style="background: #dc2626; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">
          이번 달 랭킹 전체 삭제
        </button>
      `;
      container.appendChild(bulkDeleteDiv);
    }
  } catch (error) {
    console.error('랭킹 로드 오류:', error);
    container.innerHTML = '<p class="loading">오류 발생: ' + error.message + '</p>';
  }
}

async function deleteRanking(rankingId) {
  if (!confirm('정말로 이 랭킹을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch('/api/admin?action=delete-ranking', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankingId })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || '삭제에 실패했습니다.');

    alert('랭킹이 삭제되었습니다.');
    loadRanking();
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

async function deleteAllRankingForCurrentMonth() {
  const difficulty = document.getElementById('rankingDifficulty').value;
  if (!confirm('정말로 이번 달의 모든 랭킹을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

  try {
    const response = await fetch('/api/admin?action=delete-all-ranking-current-month', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || '삭제에 실패했습니다.');

    alert(`이번 달 랭킹 ${result.deletedCount}개가 삭제되었습니다.`);
    loadRanking(1);
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

// 랭킹 필터 변경 시 재로드
document.getElementById('rankingDifficulty')?.addEventListener('change', () => loadRanking(1)); // 첫 페이지부터 로드

// 유틸: XSS 방지
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 초기 로드
window.addEventListener('DOMContentLoaded', () => {
  loadSuggestions();
});
