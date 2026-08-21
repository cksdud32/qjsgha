import crypto from 'crypto';
import { ApiError } from '../http/respond.js';

// Home Server Agent 전용 인증. 관리자 로그인과 완전히 분리된 별도의 토큰 기반 인증이다.
// Authorization: Bearer <AGENT_API_TOKEN>
export function requireAgent(request) {
  const token = process.env.AGENT_API_TOKEN;
  if (!token) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'AGENT_API_TOKEN이 서버에 설정되어 있지 않습니다.');
  }

  const authHeader = request.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Agent 인증 토큰이 필요합니다.');
  }

  const provided = authHeader.slice('Bearer '.length).trim();
  const providedBuf = Buffer.from(provided);
  const tokenBuf = Buffer.from(token);

  const isValid =
    providedBuf.length === tokenBuf.length && crypto.timingSafeEqual(providedBuf, tokenBuf);

  if (!isValid) {
    throw new ApiError(401, 'UNAUTHORIZED', '유효하지 않은 Agent 토큰입니다.');
  }
}
