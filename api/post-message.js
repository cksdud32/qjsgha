import { createPool } from '@vercel/postgres';

// 1. 여기서 POSTGRES_URL을 직접 가져와서 연결 풀(Pool)을 만듭니다.
const pool = createPool({
  connectionString: process.env.POSTGRES_URL
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

    // 2. sql 대신 pool.sql을 사용하여 강제로 연결된 주소를 사용하게 합니다.
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