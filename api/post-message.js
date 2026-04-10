import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  const { name, content } = request.body;

  try {
    // db.sql 대신 그냥 sql`쿼리`를 사용합니다.
    // Vercel이 자동으로 'Pooled' 연결을 사용하게 해줍니다.
    await sql`INSERT INTO Messages (name, content) VALUES (${name}, ${content});`;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error(error);
    // 에러 내용을 구체적으로 확인하기 위해 로그 출력
    return response.status(500).json({ error: error.message });
  }
}