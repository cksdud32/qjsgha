import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  // 브라우저에서 보낸 데이터를 가져옵니다
  const { name, content } = request.body;

  try {
    // DB 테이블 컬럼명에 맞춰 소문자(name, content)로 작성했습니다
    await db.sql`INSERT INTO Messages (name, content) VALUES (${name}, ${content});`;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}