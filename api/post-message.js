// api/post-message.js
import { db } from '@vercel/postgres';

export default async function handler(request, response) {
  // 팬이 보낸 이름과 메시지 가져오기
  const { name, content } = request.body;

  try {
    // DB에 데이터 저장하기 (SQL 문법)
    await db.sql`INSERT INTO Messages (Name, Content) VALUES (${name}, ${content});`;
    return response.status(200).json({ message: "성공적으로 저장되었습니다!" });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}