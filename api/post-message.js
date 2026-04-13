import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // 1. POST 방식만 허용
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 데이터 꺼내기 (JSON 파싱 에러 방지)
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { name, content } = body;

    // 3. 값 확인
    if (!name || !content) {
      return response.status(400).json({ error: '닉네임과 내용을 모두 입력해주세요.' });
    }

    // 4. DB 저장 시도 (Messages 테이블에 삽입)
    // 테이블 이름 대소문자 주의: Messages가 맞는지 확인!
    await sql`
      INSERT INTO messages (name, content) 
      VALUES (${name}, ${content});
    `;

    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });

  } catch (error) {
    console.error('상세 에러 로그:', error);
    
    // 에러 종류에 따라 메시지 분리
    if (error.message.includes('relation "messages" does not exist')) {
      return response.status(500).json({ error: "테이블을 찾을 수 없습니다. (대소문자 확인 필요)" });
    }
    
    return response.status(500).json({ 
      error: "DB 연결 혹은 쿼리 오류", 
      details: error.message 
    });
  }
}