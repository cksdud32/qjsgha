// 서버 제어 API 전역에서 쓰는 임계값들.
// 전부 환경변수로 덮어쓸 수 있고, 미설정 시 아래 기본값을 쓴다.

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// 이 시간(초) 동안 heartbeat/status 보고가 없으면 Agent를 offline으로 간주한다.
export const AGENT_OFFLINE_THRESHOLD_SECONDS = toPositiveInt(
  process.env.AGENT_OFFLINE_THRESHOLD_SECONDS,
  60
);

// processing 상태로 이 시간(초) 이상 머문 Command는 timeout 후보로 간주한다.
export const COMMAND_TIMEOUT_SECONDS = toPositiveInt(process.env.COMMAND_TIMEOUT_SECONDS, 600);
