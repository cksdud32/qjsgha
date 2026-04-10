// api/post-message.js
const { db } = require('@vercel/postgres');

export default async function handler(request, response) {
  const { name, content } = request.body;

  try {
    // 컬럼 이름을 소문자로 수정했습니다 (Name -> name, Content -> content)
    await db.sql`INSERT INTO Messages (name, content) VALUES (${name}, ${content});`;
    return response.status(200).json({ message: "성공적으로 저장되었습니다!" });
  } catch (error) {
    // 만약 에러가 나면 브라우저에서 확인할 수 있게 에러 메시지 출력
    return response.status(500).json({ error: error.message });
  }
}