// Command 상태 전이 규칙의 단일 기준(source of truth).
// route/service 여러 곳에서 각자 판단하지 않도록 여기서만 정의하고,
// commandRepository의 조건부 UPDATE들이 이 표를 그대로 반영한다.

export const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['success', 'failed', 'timeout'],
  success: [],
  failed: [],
  cancelled: [],
  timeout: []
};

export const TERMINAL_STATUSES = ['success', 'failed', 'cancelled', 'timeout'];

export function canTransition(fromStatus, toStatus) {
  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

// toStatus로 갈 수 있는 모든 fromStatus 목록. 조건부 UPDATE의 WHERE status IN (...) 절에 쓴다.
export function statusesThatCanTransitionTo(toStatus) {
  return Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, targets]) => targets.includes(toStatus))
    .map(([from]) => from);
}

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}
