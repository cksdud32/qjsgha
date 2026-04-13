import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // 1. POST 요청만 허용
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 데이터 파싱 안전장치
    let body = request.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return response.status(400).json({ error: '잘못된 JSON 형식입니다.' });
      }
    }
    
    const { name, content } = body;

    // 3. 필수 입력값 체크
    if (!name || !content) {
      return response.status(400).json({ error: '닉네임과 내용을 입력해주세요.' });
    }

    // 4. DB 저장
    // PostgreSQL에서 소문자 테이블명 "messages"를 확실히 찾을 수 있게 쌍따옴표를 씁니다.
    // @vercel/postgres의 sql 기능은 환경 변수의 POSTGRES_URL을 자동으로 사용합니다.
    await sql`
      INSERT INTO "messages" (name, content, created_at) 
      VALUES (${name}, ${content}, NOW());
    `;

    return response.status(200).json({ 
      success: true, 
      message: "성공적으로 저장되었습니다! 🍒" 
    });

  } catch (error) {
    console.error('DB 상세 에러:', error);
    
    // 에러 메시지에 'invalid_connection_string'이 포함되어 있다면 주소 문제임을 알림
    const isConnError = error.message.includes('connection');
    
    return response.status(500).json({ 
      error: "전송 실패 (서버 오류)", 
      details: isConnError ? "DB 연결 주소(Pooled)를 확인해주세요." : error.message 
    });
  }
}