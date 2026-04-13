import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, content } = request.body;

  try {
    // sql 객체는 자동으로 환경변수를 찾지만, 
    // 혹시 모르니 테이블 이름을 한 번 더 체크하며 데이터를 넣습니다.
    await sql`
      INSERT INTO Messages (name, content) 
      VALUES (${name}, ${content});
    `;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error('상세 에러 내역:', error);
    // 에러 메시지를 더 자세히 보여줘서 원인을 확실히 잡습니다.
    return response.status(500).json({ 
      error: "데이터베이스 연결 오류", 
      details: error.message 
    });
  }
}