import { createPool } from '@vercel/postgres';

// 우리가 새로 만든 이름을 직접 지정합니다.
const pool = createPool({
  connectionString: process.env.MY_SAFE_DB_URL 
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = request.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const { name, content } = body;

    if (!name || !content) {
      return response.status(400).json({ error: '닉네임과 내용을 입력해주세요.' });
    }

    // pool.sql을 사용하여 저장
    await pool.sql`
      INSERT INTO "messages" (name, content, created_at) 
      VALUES (${name}, ${content}, NOW());
    `;

    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });

  } catch (error) {
    console.error('DB 상세 에러:', error);
    return response.status(500).json({ 
      error: "전송 실패", 
      details: error.message 
    });
  }
}