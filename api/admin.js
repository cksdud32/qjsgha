import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// 관리자 로그인
export async function login(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!username || !password) {
      return response.status(400).json({ error: '아이디와 비밀번호를 모두 입력해주세요.' });
    }

    const result = await pool.query(
      'SELECT id, username FROM "AdminUsers" WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 0) {
      return response.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    return response.status(200).json({
      message: '관리자 로그인 성공',
      success: true,
      adminId: result.rows[0].id
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 건의사항 조회
export async function getSuggestions(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.question_text, s.answer, s.question_text2, s.question_text3, s.difficulty_id, d.level_name
       FROM "SuggestedQuestions" s
       JOIN "difficulty" d ON s.difficulty_id = d.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
    );

    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('Get suggestions error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 건의사항 승인
export async function approveSuggestion(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { suggestionId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!suggestionId) {
      return response.status(400).json({ error: '건의사항 ID가 필요합니다.' });
    }

    const suggestionRes = await pool.query(
      'SELECT question_text, answer, question_text2, question_text3, difficulty_id FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    if (suggestionRes.rows.length === 0) {
      return response.status(404).json({ error: '건의사항을 찾을 수 없습니다.' });
    }

    const suggestion = suggestionRes.rows[0];

    await pool.query(
      'INSERT INTO "questions" (question_text, answer, question_text2, question_text3, difficulty_id) VALUES ($1, $2, $3, $4, $5)',
      [suggestion.question_text, suggestion.answer, suggestion.question_text2 || null, suggestion.question_text3 || null, suggestion.difficulty_id]
    );

    // 승인 처리 시 테이블에서 삭제
    await pool.query(
      'DELETE FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    return response.status(200).json({ message: '건의사항이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve suggestion error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 건의사항 기각
export async function rejectSuggestion(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { suggestionId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!suggestionId) {
      return response.status(400).json({ error: '건의사항 ID가 필요합니다.' });
    }

    // 기각 처리 시 테이블에서 삭제
    await pool.query(
      'DELETE FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    return response.status(200).json({ message: '건의사항이 기각되었습니다.' });
  } catch (error) {
    console.error('Reject suggestion error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 문제 추가
export async function addProblem(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question_text, answer, question_text2, question_text3, difficulty } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!question_text || !answer || !difficulty) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    // 난이도를 숫자로 변환 (1=쉬움, 2=보통, 3=어려움)
    let difficulty_id;
    switch (difficulty) {
      case 'easy':
        difficulty_id = 1;
        break;
      case 'medium':
        difficulty_id = 2;
        break;
      case 'hard':
        difficulty_id = 3;
        break;
      case 'Hardcore':
        difficulty_id = 3;
        break;
      default:
        return response.status(400).json({ error: '올바르지 않은 난이도입니다.' });
    }

    await pool.query(
      'INSERT INTO "questions" (question_text, answer, question_text2, question_text3, difficulty_id) VALUES ($1, $2, $3, $4, $5)',
      [question_text, answer, question_text2 || null, question_text3 || null, difficulty_id]
    );

    return response.status(200).json({ message: '문제가 추가되었습니다.' });
  } catch (error) {
    console.error('Add problem error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 건의된 문제 조회
export async function getSuggestedProblems(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.question_text, s.answer, s.question_text2, s.question_text3, s.difficulty_id, d.level_name
       FROM "SuggestedQuestions" s
       JOIN "difficulty" d ON s.difficulty_id = d.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
    );

    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('Get suggested problems error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 수정된 건의사항 문제 추가
export async function addProblemFromEdit(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question_text, answer, question_text2, question_text3, difficulty_id, suggestionId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!question_text || !answer || difficulty_id === undefined || !suggestionId) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    await pool.query(
      'INSERT INTO "questions" (question_text, answer, question_text2, question_text3, difficulty_id) VALUES ($1, $2, $3, $4, $5)',
      [question_text, answer, question_text2 || null, question_text3 || null, difficulty_id]
    );

    // 승인 처리 시 테이블에서 삭제
    await pool.query(
      'DELETE FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    return response.status(200).json({ message: '문제가 추가되었습니다.' });
  } catch (error) {
    console.error('Add problem from edit error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 모든 문제 조회
export async function getAllProblems(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { difficulty, page = 1 } = request.query;
    const limit = 10;
    const offset = (parseInt(page) - 1) * limit;
    console.log('getAllProblems called with difficulty:', difficulty, 'page:', page);

    let queryText;
    let queryParams;

    if (difficulty) {
      // 난이도를 숫자로 변환
      let difficulty_id;
      switch (difficulty) {
        case 'easy':
          difficulty_id = 1;
          break;
        case 'medium':
          difficulty_id = 2;
          break;
        case 'hard':
          difficulty_id = 3;
          break;
        case 'Hardcore':
          difficulty_id = 4;
          break;
        default:
          return response.status(400).json({ error: '올바르지 않은 난이도입니다.' });
      }

      queryText = `
        SELECT q.id, q.question_text, q.answer, q.question_text2, q.question_text3, q.difficulty_id, d.level_name as difficulty
        FROM "questions" q
        JOIN "difficulty" d ON q.difficulty_id = d.id
        WHERE q.difficulty_id = $1
        ORDER BY q.id DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [difficulty_id, limit, offset];
    } else {
      // 난이도 파라미터가 없으면 모든 문제 반환
      queryText = `
        SELECT q.id, q.question_text, q.answer, q.question_text2, q.question_text3, q.difficulty_id, d.level_name as difficulty
        FROM "questions" q
        JOIN "difficulty" d ON q.difficulty_id = d.id
        ORDER BY q.id DESC
        LIMIT $1 OFFSET $2
      `;
      queryParams = [limit, offset];
    }

    const result = await pool.query(queryText, queryParams);

    console.log('Query result rows:', result.rows.length);
    return response.status(200).json({
      problems: result.rows,
      hasMore: result.rows.length === limit
    });
  } catch (error) {
    console.error('Get all problems error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 문제 수정
export async function updateProblem(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { problemId, question_text, answer, question_text2, question_text3, difficulty_id } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!problemId || !question_text || !answer || difficulty_id === undefined) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    await pool.query(
      'UPDATE "questions" SET question_text = $1, answer = $2, question_text2 = $3, question_text3 = $4, difficulty_id = $5 WHERE id = $6',
      [question_text, answer, question_text2 || null, question_text3 || null, difficulty_id, problemId]
    );

    return response.status(200).json({ message: '문제가 수정되었습니다.' });
  } catch (error) {
    console.error('Update problem error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 문제 삭제
export async function deleteProblem(request, response) {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { problemId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!problemId) {
      return response.status(400).json({ error: '문제 ID가 필요합니다.' });
    }

    await pool.query(
      'DELETE FROM "questions" WHERE id = $1',
      [problemId]
    );

    return response.status(200).json({ message: '문제가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete problem error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 관리자 랭킹 조회
export async function getAdminRanking(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { difficulty, page = 1 } = request.query;
    const limit = 10;
    const offset = (parseInt(page) - 1) * limit;

    if (!difficulty) {
      return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });
    }

    const result = await pool.query(
      `SELECT r.id, r.name, r.score, r.created_at
       FROM "quiz_ranking" r
       JOIN "difficulty" d ON r.difficulty_id = d.id
       WHERE d.db_value = $1
       ORDER BY r.score DESC, r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [difficulty, limit, offset]
    );

    return response.status(200).json({
      rankings: result.rows,
      hasMore: result.rows.length === limit
    });
  } catch (error) {
    console.error('Get admin ranking error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 랭킹 삭제
export async function deleteRanking(request, response) {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rankingId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!rankingId) {
      return response.status(400).json({ error: '랭킹 ID가 필요합니다.' });
    }

    await pool.query(
      'DELETE FROM "quiz_ranking" WHERE id = $1',
      [rankingId]
    );

    return response.status(200).json({ message: '랭킹이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete ranking error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 한 달 전체 랭킹 삭제
export async function deleteAllRankingForCurrentMonth(request, response) {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { difficulty } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!difficulty) {
      return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });
    }

    // 현재 달의 시작과 끝 계산
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await pool.query(
      `DELETE FROM "quiz_ranking" r
       USING "difficulty" d
       WHERE r.difficulty_id = d.id
         AND d.db_value = $1
         AND r.created_at >= $2
         AND r.created_at <= $3`,
      [difficulty, startOfMonth, endOfMonth]
    );

    return response.status(200).json({ 
      message: `${result.rowCount}개의 랭킹이 삭제되었습니다.`,
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Delete all ranking for current month error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 메인 핸들러
export default async function handler(request, response) {
  const { action } = request.query;

  switch (action) {
    case 'login':
      return login(request, response);
    case 'get-suggestions':
      return getSuggestions(request, response);
    case 'approve-suggestion':
      return approveSuggestion(request, response);
    case 'reject-suggestion':
      return rejectSuggestion(request, response);
    case 'add-problem':
      return addProblem(request, response);
    case 'get-suggested-problems':
      return getSuggestedProblems(request, response);
    case 'add-problem-from-edit':
      return addProblemFromEdit(request, response);
    case 'get-all-problems':
      return getAllProblems(request, response);
    case 'update-problem':
      return updateProblem(request, response);
    case 'delete-problem':
      return deleteProblem(request, response);
    case 'get-admin-ranking':
      return getAdminRanking(request, response);
    case 'delete-ranking':
      return deleteRanking(request, response);
    case 'delete-all-ranking-current-month':
      return deleteAllRankingForCurrentMonth(request, response);
    default:
      return response.status(400).json({ error: 'Invalid action' });
  }
}
