import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. 데이터 파싱 안전장치
    let body = request.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const { name, content } = body;

    if (!name || !content) {
      return response.status(400).json({ error: '닉네임과 내용을 입력해주세요.' });
    }

    // 2. DB 저장 - 테이블명을 소문자 "messages"로 고정하고 쌍따옴표로 감쌉니다.
    // 이 방식이 PostgreSQL에서 가장 오류가 적고 확실한 방법입니다.
    await sql`
      INSERT INTO "messages" (name, content) 
      VALUES (${name}, ${content});
    `;

    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });

  } catch (error) {
    console.error('DB 상세 에러:', error);
    
    return response.status(500).json({ 
      error: "전송 실패 (DB/쿼리 오류)", 
      details: error.message 
    });
  }
}