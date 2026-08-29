// 테스트 보조 픽스처(테스트 러너가 수집하지 않도록 .mjs / _ 접두사).
// unit-setup.mjs 를 거친 뒤 lib/db.js 가 어떤 연결 문자열로 풀을 만드는지 출력만 한다.
// 실제 쿼리는 하지 않으므로 어디에도 접속하지 않는다.
import { pool } from '../../lib/db.js';
process.stdout.write(String(pool.options.connectionString || `host=${pool.options.host}`));
