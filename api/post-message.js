import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // GET 요청(페이지 접속) 시 에러 방지
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, content } = request.body;

  try {
    // 1. db.sql 대신 그냥 sql`쿼리`를 사용합니다.
    // 2. 이 방식은 Vercel이 알아서 'Pooled' 주소를 찾아 연결해 줍니다.
    await sql`
      INSERT INTO Messages (name, content) 
      VALUES (${name}, ${content});
    `;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error('상세 에러 내역:', error);
    // 에러가 나면 어떤 이유인지 브라우저에 구체적으로 보여줍니다.
    return response.status(500).json({ error: error.message });
  }
}