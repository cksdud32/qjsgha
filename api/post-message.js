import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // 1. POST 요청인지 확인
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, content } = request.body;

  // 2. 데이터가 비어있는지 확인
  if (!name || !content) {
    return response.status(400).json({ error: '데이터가 부족합니다.' });
  }

  try {
    // 3. 가장 안정적인 sql 태그 함수 사용
    // 이 방식은 Vercel이 알아서 Pooled 주소를 찾아 안전하게 연결해줍니다.
    await sql`
      INSERT INTO Messages (name, content) 
      VALUES (${name}, ${content});
    `;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    // 4. 에러 발생 시 상세 로그 출력
    console.error('데이터베이스 저장 중 오류:', error);
    return response.status(500).json({ 
      error: "데이터베이스 연결 오류", 
      details: error.message 
    });
  }
}