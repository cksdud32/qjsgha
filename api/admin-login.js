import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
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
    return response.status(500).json({ error: '서버 오류가 발생했습니다.', details: error.message });
  }
}
