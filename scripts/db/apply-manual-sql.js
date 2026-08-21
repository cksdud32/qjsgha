import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// prisma migrate/db push는 이 DB의 기존(원시 SQL로 만든) 테이블들을 drop하려고 시도하므로 쓸 수 없다.
// 대신 prisma/manual/ 아래의 SQL 파일을 직접, 트랜잭션으로 실행한다.
//
// 사용법: node scripts/db/apply-manual-sql.js prisma/manual/0001_server_control_tables.sql

const file = process.argv[2];
if (!file) {
  console.error('사용법: node scripts/db/apply-manual-sql.js <sql 파일 경로>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log(`적용 완료: ${file}`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('적용 실패, 롤백함:', error.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
