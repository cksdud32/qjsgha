// 프로젝트/명령 관련 허용 값 정의.
// Prisma의 native enum과 값이 어긋나지 않도록 반드시 여기 값들을 schema.prisma의 enum과 동일하게 유지한다.
// (type만 하이픈이 포함될 수 있어 Prisma enum 대신 문자열 + 검증 리스트로 관리한다.)

export const PROJECT_STATUSES = [
  'running',
  'stopped',
  'starting',
  'stopping',
  'restarting',
  'error',
  'unknown'
];

export const PROJECT_TYPES = ['web', 'discord-bot', 'worker', 'api', 'other'];

export const COMMAND_ACTIONS = ['start', 'stop', 'restart'];

export const COMMAND_STATUSES = ['pending', 'processing', 'success', 'failed', 'cancelled', 'timeout'];

export const COMMAND_SOURCES = ['web', 'discord', 'system'];

export const AGENT_STATUSES = ['online', 'offline', 'unknown'];

export const LOG_LEVELS = ['info', 'warn', 'error'];

// CommandLog.message에 붙는 표준 이벤트 코드. DB에는 별도 컬럼 없이 message에 녹여 남긴다.
export const COMMAND_LOG_EVENTS = {
  CREATED: 'COMMAND_CREATED',
  CLAIMED: 'COMMAND_CLAIMED',
  SUCCEEDED: 'COMMAND_SUCCEEDED',
  FAILED: 'COMMAND_FAILED',
  CANCELLED: 'COMMAND_CANCELLED',
  TIMEOUT: 'COMMAND_TIMEOUT'
};

export function isOneOf(value, allowed) {
  return typeof value === 'string' && allowed.includes(value);
}
