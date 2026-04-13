import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // GET 요청 등 잘못된 접근 방지
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, content } = request.body;

  try {
    // 이제 환경 변수가 연결되었으니 sql 명령어가 정상 작동할 겁니다.
    await sql`INSERT INTO Messages (name, content) VALUES (${name}, ${content});`;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}