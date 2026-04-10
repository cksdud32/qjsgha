import { createClient } from '@vercel/postgres';

export default async function handler(request, response) {
  // 클라이언트를 직접 생성합니다.
  const client = createClient();
  
  try {
    await client.connect(); // 연결 시도
    
    const { name, content } = request.body;
    
    // 데이터를 넣습니다.
    await client.sql`INSERT INTO Messages (name, content) VALUES (${name}, ${content});`;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  } finally {
    // 연결을 꼭 닫아줘야 서버에 과부하가 안 걸려요!
    await client.end();
  }
}