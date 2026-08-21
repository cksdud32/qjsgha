import crypto from 'crypto';
import { ApiError, parseBody } from '../http/respond.js';

// Home Server Agent 전용 인증. 관리자 로그인과 완전히 분리된 별도의 토큰 기반 인증이다.
// Authorization: Bearer <AGENT_API_TOKEN>
//
// 토큰 자체는 아직 모든 Agent가 공유하는 단일 비밀값이라 "어떤 Agent가 호출했는지"까지는 증명하지 못한다.
// 그래서 최소한 URL query string(로그에 남기 쉽고 값이 노출되기 쉬움)은 신뢰하지 않고,
// 요청자가 스스로 밝히는 X-Agent-Id 헤더(또는 POST body의 agentId)를 우선 사용한다.
// 실제로 그 Agent가 맞는지, 그리고 그 Agent가 대상 프로젝트의 소유자가 맞는지는
// 호출하는 서비스 쪽에서 DB로 다시 검증한다(예: commandService의 project.agentId 비교).
// 완전한 Agent별 인증(에이전트마다 별도 토큰 발급)은 추후 다중 서버컴 구성 시 검토 대상이다.
function extractAgentId(request) {
  const headerValue = request.headers['x-agent-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  const body = parseBody(request);
  if (body && typeof body.agentId === 'string' && body.agentId.trim()) {
    return body.agentId.trim();
  }

  const queryValue = request.query?.agentId;
  if (typeof queryValue === 'string' && queryValue.trim()) {
    return queryValue.trim();
  }

  return null;
}

// 통과 시 { agentId }를 반환, 실패 시 ApiError를 throw한다.
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

  const agentId = extractAgentId(request);
  if (!agentId) {
    throw new ApiError(401, 'AGENT_ID_REQUIRED', 'X-Agent-Id 헤더(또는 agentId)가 필요합니다.');
  }

  return { agentId };
}
