import { createClient } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. 직접 연결(Direct) 주소가 아닌 '풀링(Pooled)' 주소를 사용하도록 강제 지정합니다.
  // Vercel이 자동으로 넣어준 POSTGRES_URL 혹은 STORAGE_URL을 사용합니다.
  const client = createClient({
    connectionString: process.env.POSTGRES_URL || process.env.STORAGE_URL
  });

  const { name, content } = request.body;

  try {
    await client.connect();
    
    // 2. 데이터를 저장합니다.
    await client.sql`
      INSERT INTO Messages (name, content) 
      VALUES (${name}, ${content});
    `;
    
    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error('상세 에러:', error);
    return response.status(500).json({ error: error.message });
  } finally {
    // 3. 연결을 안전하게 닫아줍니다.
    await client.end();
  }
}