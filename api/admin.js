import crypto from 'crypto';
import { pool } from '../lib/db.js';
import { writeAdminLog } from '../lib/admin-log.js';
import { requireAdmin, requireAdminPlain } from '../lib/admin-auth.js';
import { determineSongType, classifyJapaneseCover } from '../lib/songUtils.js';

// 관리자 폼에서는 '일본 커버곡'을 하나로만 고르고, 실제 저장 시 곡 제목 첫 글자로 1/2을 자동 분류한다.
function resolveSongType(song_type, song_title) {
  return song_type === '일본 커버곡' ? classifyJapaneseCover(song_title) : song_type;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function parseBody(request) {
  return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
}

const DIFFICULTY_IDS = { easy: 1, medium: 2, hard: 3, Hardcore: 4 };

function difficultyToId(difficulty) {
  return DIFFICULTY_IDS[difficulty] ?? null;
}

// 변경성/조회성 퀴즈·랭킹 관리자 액션의 인증은 lib/admin-auth.js 의 requireAdmin(request)
// 하나로 통일한다. 로그인 화면(html/Mini_game/ML/*)이 sessionStorage 에 저장한
// username + 비밀번호 SHA-256 해시(adminPwHash)를 X-Admin-Username / X-Admin-Password-Hash
// 헤더로 받아 "AdminUsers" 와 대조하고, 통과 시 정규 username 을 돌려준다.
// (변경성 액션 프론트는 아직 본문으로 보내므로 requireAdmin 이 본문도 하위호환으로 인정한다.)
// 감사 로그 admin_id 로는 클라이언트가 보낸 adminUsername 이 아니라 이 반환값만 쓴다.

// 관리자 로그인
export async function login(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { username, password } = parseBody(request);
    if (!username || !password) {
      return response.status(400).json({ error: '아이디와 비밀번호를 모두 입력해주세요.' });
    }

    const result = await pool.query(
      'SELECT id, username FROM "AdminUsers" WHERE username = $1 AND password = $2',
      [username, sha256(password)]
    );

    if (result.rows.length === 0) {
      return response.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    return response.status(200).json({ message: '관리자 로그인 성공', success: true, adminId: result.rows[0].id });
  } catch (error) {
    console.error('Admin login error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 건의사항 조회 (get-suggestions, get-suggested-problems 공용)
async function getSuggestedProblemsQuery(response) {
  const result = await pool.query(
    `SELECT s.id, s.name, s.question_text, s.answer, s.question_text2, s.question_text3, s.difficulty_id, d.level_name
     FROM "SuggestedQuestions" s
     JOIN "difficulty" d ON s.difficulty_id = d.id
     WHERE s.status = 'pending'
     ORDER BY s.created_at DESC`
  );
  return response.status(200).json(result.rows);
}

export async function getSuggestions(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    await requireAdmin(request);
    return await getSuggestedProblemsQuery(response);
  } catch (error) {
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('Get suggestions error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 건의사항 승인
export async function approveSuggestion(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { suggestionId } = body;
    if (!suggestionId) return response.status(400).json({ error: '건의사항 ID가 필요합니다.' });

    const suggestionRes = await pool.query(
      'SELECT question_text, answer, question_text2, question_text3, difficulty_id FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    if (suggestionRes.rows.length === 0) return response.status(404).json({ error: '건의사항을 찾을 수 없습니다.' });

    const s = suggestionRes.rows[0];
    await pool.query(
      'INSERT INTO "questions" (question_text, answer, question_text2, question_text3, difficulty_id) VALUES ($1, $2, $3, $4, $5)',
      [s.question_text, s.answer, s.question_text2 || null, s.question_text3 || null, s.difficulty_id]
    );
    await pool.query('DELETE FROM "SuggestedQuestions" WHERE id = $1', [suggestionId]);

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_SUGGESTION_APPROVE',
      targetType: 'quiz_suggestion',
      targetId: suggestionId,
      details: { question_text: s.question_text },
    });

    return response.status(200).json({ message: '건의사항이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve suggestion error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_SUGGESTION_APPROVE',
      targetType: 'quiz_suggestion',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 건의사항 기각
export async function rejectSuggestion(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { suggestionId } = body;
    if (!suggestionId) return response.status(400).json({ error: '건의사항 ID가 필요합니다.' });

    await pool.query('DELETE FROM "SuggestedQuestions" WHERE id = $1', [suggestionId]);

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_SUGGESTION_REJECT',
      targetType: 'quiz_suggestion',
      targetId: suggestionId,
    });

    return response.status(200).json({ message: '건의사항이 기각되었습니다.' });
  } catch (error) {
    console.error('Reject suggestion error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_SUGGESTION_REJECT',
      targetType: 'quiz_suggestion',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 문제 추가
export async function addProblem(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { question_text, answer, question_text2, question_text3, difficulty } = body;
    if (!question_text || !answer || !difficulty) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    const difficulty_id = difficultyToId(difficulty);
    if (difficulty_id === null) return response.status(400).json({ error: '올바르지 않은 난이도입니다.' });

    const inserted = await pool.query(
      'INSERT INTO "questions" (question_text, answer, question_text2, question_text3, difficulty_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [question_text, answer, question_text2 || null, question_text3 || null, difficulty_id]
    );

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_CREATE',
      targetType: 'quiz',
      targetId: inserted.rows[0]?.id,
      details: { difficulty },
    });

    return response.status(200).json({ message: '문제가 추가되었습니다.' });
  } catch (error) {
    console.error('Add problem error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_CREATE',
      targetType: 'quiz',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 수정된 건의사항 문제 추가
export async function addProblemFromEdit(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { question_text, answer, question_text2, question_text3, difficulty_id, suggestionId } = body;
    if (!question_text || !answer || difficulty_id === undefined || !suggestionId) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    const inserted = await pool.query(
      'INSERT INTO "questions" (question_text, answer, question_text2, question_text3, difficulty_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [question_text, answer, question_text2 || null, question_text3 || null, difficulty_id]
    );
    await pool.query('DELETE FROM "SuggestedQuestions" WHERE id = $1', [suggestionId]);

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_CREATE',
      targetType: 'quiz',
      targetId: inserted.rows[0]?.id,
      details: { from_suggestion_id: suggestionId },
    });

    return response.status(200).json({ message: '문제가 추가되었습니다.' });
  } catch (error) {
    console.error('Add problem from edit error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_CREATE',
      targetType: 'quiz',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 모든 문제 조회
export async function getAllProblems(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    await requireAdmin(request);
    const { difficulty, page = 1 } = request.query;
    const limit = 10;
    const offset = (parseInt(page) - 1) * limit;

    let queryText, queryParams;

    if (difficulty) {
      const difficulty_id = difficultyToId(difficulty);
      if (difficulty_id === null) return response.status(400).json({ error: '올바르지 않은 난이도입니다.' });

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
    return response.status(200).json({ problems: result.rows, hasMore: result.rows.length === limit });
  } catch (error) {
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('Get all problems error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 문제 수정
export async function updateProblem(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { problemId, question_text, answer, question_text2, question_text3, difficulty_id } = body;
    if (!problemId || !question_text || !answer || difficulty_id === undefined) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    await pool.query(
      'UPDATE "questions" SET question_text = $1, answer = $2, question_text2 = $3, question_text3 = $4, difficulty_id = $5 WHERE id = $6',
      [question_text, answer, question_text2 || null, question_text3 || null, difficulty_id, problemId]
    );

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_UPDATE',
      targetType: 'quiz',
      targetId: problemId,
    });

    return response.status(200).json({ message: '문제가 수정되었습니다.' });
  } catch (error) {
    console.error('Update problem error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_UPDATE',
      targetType: 'quiz',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 문제 삭제
export async function deleteProblem(request, response) {
  if (request.method !== 'DELETE') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { problemId } = body;
    if (!problemId) return response.status(400).json({ error: '문제 ID가 필요합니다.' });

    await pool.query('DELETE FROM "questions" WHERE id = $1', [problemId]);

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_DELETE',
      targetType: 'quiz',
      targetId: problemId,
    });

    return response.status(200).json({ message: '문제가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete problem error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_DELETE',
      targetType: 'quiz',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 관리자 랭킹 조회
export async function getAdminRanking(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    await requireAdmin(request);
    const { difficulty, page = 1 } = request.query;
    const limit = 10;
    const offset = (parseInt(page) - 1) * limit;

    if (!difficulty) return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });

    const result = await pool.query(
      `SELECT r.id, r.name, r.score, r.created_at
       FROM "quiz_ranking" r
       JOIN "difficulty" d ON r.difficulty_id = d.id
       WHERE d.db_value = $1
       ORDER BY r.score DESC, r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [difficulty, limit, offset]
    );
    return response.status(200).json({ rankings: result.rows, hasMore: result.rows.length === limit });
  } catch (error) {
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('Get admin ranking error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 관리자 감사 로그 조회 (get-admin-logs). 헤더 인증(lib/admin-auth.js requireAdmin).
// 라우팅 파라미터가 ?action=get-admin-logs 라서, 로그의 action 컬럼 필터는 logAction 으로 받는다.
// 필터: logAction / adminId / status / from / to, 페이지네이션: page / limit.
const ADMIN_LOG_DEFAULT_LIMIT = 50;
const ADMIN_LOG_MAX_LIMIT = 100;

export async function getAdminLogs(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    await requireAdmin(request);

    const { adminId, status, from, to } = request.query;
    const logAction = request.query.logAction;

    let limit = parseInt(request.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = ADMIN_LOG_DEFAULT_LIMIT;
    limit = Math.min(limit, ADMIN_LOG_MAX_LIMIT);

    let page = parseInt(request.query.page, 10);
    if (!Number.isFinite(page) || page <= 0) page = 1;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (logAction) {
      params.push(logAction);
      conditions.push(`action = $${params.length}`);
    }
    if (adminId) {
      params.push(adminId);
      conditions.push(`admin_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`created_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit + 1);
    const limitParamIndex = params.length;
    params.push(offset);
    const offsetParamIndex = params.length;

    const result = await pool.query(
      `SELECT id, admin_id, action, target_type, target_id, details, status, created_at
       FROM admin_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      params
    );

    const hasMore = result.rows.length > limit;
    const logs = hasMore ? result.rows.slice(0, limit) : result.rows;

    return response.status(200).json({ logs, hasMore, page, limit });
  } catch (error) {
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('Get admin logs error:', error);
    return response.status(500).json({ error: error.message });
  }
}

// 랭킹 삭제
export async function deleteRanking(request, response) {
  if (request.method !== 'DELETE') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { rankingId } = body;
    if (!rankingId) return response.status(400).json({ error: '랭킹 ID가 필요합니다.' });

    await pool.query('DELETE FROM "quiz_ranking" WHERE id = $1', [rankingId]);

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_RANKING_DELETE',
      targetType: 'quiz_ranking',
      targetId: rankingId,
    });

    return response.status(200).json({ message: '랭킹이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete ranking error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_RANKING_DELETE',
      targetType: 'quiz_ranking',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// 한 달 전체 랭킹 삭제
export async function deleteAllRankingForCurrentMonth(request, response) {
  if (request.method !== 'DELETE') return response.status(405).json({ error: 'Method Not Allowed' });

  let adminUsername;
  try {
    const body = parseBody(request);
    adminUsername = await requireAdmin(request);
    const { difficulty } = body;
    if (!difficulty) return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });

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

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_RANKING_DELETE_ALL',
      targetType: 'quiz_ranking',
      details: { difficulty, deletedCount: result.rowCount },
    });

    return response.status(200).json({ message: `${result.rowCount}개의 랭킹이 삭제되었습니다.`, deletedCount: result.rowCount });
  } catch (error) {
    console.error('Delete all ranking for current month error:', error);

    // 인증 실패(requireAdmin)면 DB 변경 전이므로 실패 감사 로그를 남기지 않고 401 로 거부한다.
    if (error.status === 401) {
      return response.status(401).json({ error: error.message });
    }

    await writeAdminLog({
      adminId: adminUsername,
      action: 'QUIZ_RANKING_DELETE_ALL',
      targetType: 'quiz_ranking',
      status: 'failed',
      details: { error: error.message },
    });
    return response.status(500).json({ error: error.message });
  }
}

// ── 노래방 관리 (karaoke_number / pending_karaoke) ──────────────
// Vercel Hobby 플랜 Serverless Function 12개 제한 때문에 별도 파일을 만들지 않고
// 이미 action 기반으로 라우팅하는 이 파일에 합쳤다. 노래방 admin 액션은 요청마다
// (inf-admin.js와 동일하게) username/password를 직접 검증한다.
async function requireKaraokeAdmin(creds) {
  const { username, password } = creds || {};
  if (!username || !password) {
    const err = new Error('아이디와 비밀번호가 필요합니다.');
    err.status = 401;
    throw err;
  }
  const result = await pool.query(
    'SELECT id FROM "AdminUsers" WHERE username = $1 AND password = $2',
    [username, sha256(password)]
  );
  if (result.rows.length === 0) {
    const err = new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    err.status = 401;
    throw err;
  }
}

// 디스코드로 오는 노래방 등록 요청과 동일한 목록을 사이트 관리자 페이지에서도 조회
export async function getPendingKaraoke(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    await requireAdminPlain(request); // 헤더(X-Admin-Username / X-Admin-Password) 인증. URL query 아님.
    const result = await pool.query(
      `SELECT id, track_title, tj_title, tj_number, nat_type, is_cover FROM pending_karaoke ORDER BY id ASC`
    );
    return response.status(200).json({ pending: result.rows });
  } catch (error) {
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('Get pending karaoke error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

// 디스코드 등록 버튼과 동일한 로직(discord-interactions.js)을 사이트에서도 수행
export async function approvePendingKaraoke(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = parseBody(request);
    await requireKaraokeAdmin(body);
    const { pendingId } = body;
    if (!pendingId) return response.status(400).json({ error: 'pendingId가 필요합니다.' });

    const { rows } = await pool.query(
      'SELECT id, track_title, tj_number, nat_type, is_cover FROM pending_karaoke WHERE id = $1',
      [pendingId]
    );
    if (rows.length === 0) return response.status(404).json({ error: '이미 처리된 항목입니다.' });

    const pending = rows[0];
    const songType = determineSongType(pending.track_title, pending.nat_type, pending.is_cover);
    await pool.query(
      `INSERT INTO karaoke_number (song_title, song_type, number1) VALUES ($1, $2, $3)`,
      [pending.track_title, songType, pending.tj_number]
    );
    await pool.query('DELETE FROM pending_karaoke WHERE id = $1', [pendingId]);

    return response.status(200).json({ message: `등록 완료: ${pending.track_title}`, songType });
  } catch (error) {
    console.error('Approve pending karaoke error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

export async function rejectPendingKaraoke(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = parseBody(request);
    await requireKaraokeAdmin(body);
    const { pendingId } = body;
    if (!pendingId) return response.status(400).json({ error: 'pendingId가 필요합니다.' });

    await pool.query('DELETE FROM pending_karaoke WHERE id = $1', [pendingId]);
    return response.status(200).json({ message: '기각되었습니다.' });
  } catch (error) {
    console.error('Reject pending karaoke error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

export async function getKaraokeSongs(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    await requireAdminPlain(request); // 헤더(X-Admin-Username / X-Admin-Password) 인증. URL query 아님.
    const { search } = request.query;
    const columns = 'id, song_title, song_type, number1, number2, lyrics_key1, lyrics_label, lyrics_label2';
    const result = search
      ? await pool.query(
          `SELECT ${columns} FROM karaoke_number WHERE song_title ILIKE $1 ORDER BY id DESC`,
          [`%${search}%`]
        )
      : await pool.query(`SELECT ${columns} FROM karaoke_number ORDER BY id DESC`);
    return response.status(200).json({ songs: result.rows });
  } catch (error) {
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('Get karaoke songs error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

// 가사는 아직 사이트 관리자 페이지에서 다루지 않고 기존 방식(사이트 내 별도 입력)을 그대로 사용한다.
export async function addKaraokeSong(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = parseBody(request);
    await requireKaraokeAdmin(body);
    const { song_title, song_type, number1, number2, lyrics_key1, lyrics_label, lyrics_label2 } = body;
    if (!song_title || !song_type || !number1) {
      return response.status(400).json({ error: '필수 항목(곡 제목, 종류, 번호1)이 누락되었습니다.' });
    }
    await pool.query(
      `INSERT INTO karaoke_number (song_title, song_type, number1, number2, lyrics_key1, lyrics_label, lyrics_label2) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [song_title, resolveSongType(song_type, song_title), number1, number2 || null, lyrics_key1 || null, lyrics_label || null, lyrics_label2 || null]
    );
    return response.status(200).json({ message: '곡이 추가되었습니다.' });
  } catch (error) {
    console.error('Add karaoke song error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

export async function updateKaraokeSong(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = parseBody(request);
    await requireKaraokeAdmin(body);
    const { songId, song_title, song_type, number1, number2, lyrics_key1, lyrics_label, lyrics_label2 } = body;
    if (!songId || !song_title || !song_type || !number1) {
      return response.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }
    await pool.query(
      `UPDATE karaoke_number SET song_title=$1, song_type=$2, number1=$3, number2=$4, lyrics_key1=$5, lyrics_label=$6, lyrics_label2=$7 WHERE id=$8`,
      [song_title, resolveSongType(song_type, song_title), number1, number2 || null, lyrics_key1 || null, lyrics_label || null, lyrics_label2 || null, songId]
    );
    return response.status(200).json({ message: '곡이 수정되었습니다.' });
  } catch (error) {
    console.error('Update karaoke song error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

export async function deleteKaraokeSong(request, response) {
  if (request.method !== 'DELETE') return response.status(405).json({ error: 'Method Not Allowed' });
  try {
    const body = parseBody(request);
    await requireKaraokeAdmin(body);
    const { songId } = body;
    if (!songId) return response.status(400).json({ error: '곡 ID가 필요합니다.' });

    await pool.query('DELETE FROM karaoke_number WHERE id=$1', [songId]);
    return response.status(200).json({ message: '곡이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete karaoke song error:', error);
    return response.status(error.status || 500).json({ error: error.message });
  }
}

export default async function handler(request, response) {
  const { action } = request.query;

  switch (action) {
    case 'login':                        return login(request, response);
    case 'karaoke-get-pending':          return getPendingKaraoke(request, response);
    case 'karaoke-approve-pending':      return approvePendingKaraoke(request, response);
    case 'karaoke-reject-pending':       return rejectPendingKaraoke(request, response);
    case 'karaoke-get-songs':            return getKaraokeSongs(request, response);
    case 'karaoke-add-song':             return addKaraokeSong(request, response);
    case 'karaoke-update-song':          return updateKaraokeSong(request, response);
    case 'karaoke-delete-song':          return deleteKaraokeSong(request, response);
    case 'get-suggestions':
    case 'get-suggested-problems':       return getSuggestions(request, response);
    case 'approve-suggestion':           return approveSuggestion(request, response);
    case 'reject-suggestion':            return rejectSuggestion(request, response);
    case 'add-problem':                  return addProblem(request, response);
    case 'add-problem-from-edit':        return addProblemFromEdit(request, response);
    case 'get-all-problems':             return getAllProblems(request, response);
    case 'update-problem':               return updateProblem(request, response);
    case 'delete-problem':               return deleteProblem(request, response);
    case 'get-admin-ranking':            return getAdminRanking(request, response);
    case 'get-admin-logs':               return getAdminLogs(request, response);
    case 'delete-ranking':               return deleteRanking(request, response);
    case 'delete-all-ranking-current-month': return deleteAllRankingForCurrentMonth(request, response);
    default: return response.status(400).json({ error: 'Invalid action' });
  }
}
