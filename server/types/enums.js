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

export const COMMAND_STATUSES = ['pending', 'processing', 'success', 'failed', 'cancelled'];

export const COMMAND_SOURCES = ['web', 'discord', 'system'];

export const AGENT_STATUSES = ['online', 'offline', 'unknown'];

export const LOG_LEVELS = ['info', 'warn', 'error'];

export function isOneOf(value, allowed) {
  return typeof value === 'string' && allowed.includes(value);
}
