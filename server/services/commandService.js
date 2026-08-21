import { ApiError } from '../http/respond.js';
import { COMMAND_ACTIONS, COMMAND_SOURCES, COMMAND_STATUSES, COMMAND_LOG_EVENTS, isOneOf } from '../types/enums.js';
import { COMMAND_TIMEOUT_SECONDS } from '../config.js';
import {
  createCommand,
  findCommands,
  findCommandById,
  findCommandByIdempotencyKey,
  findActiveCommandForProject,
  findPendingCommands,
  claimCommand,
  completeCommand,
  cancelCommand,
  findStaleProcessingCommands
} from '../repositories/commandRepository.js';
import { addCommandLog } from '../repositories/commandLogRepository.js';
import { getProjectOrThrow } from './projectService.js';

const EVENT_MESSAGES = {
  [COMMAND_LOG_EVENTS.CREATED]: '명령이 생성되었습니다.',
  [COMMAND_LOG_EVENTS.CLAIMED]: 'Agent가 명령을 선점하고 처리를 시작했습니다.',
  [COMMAND_LOG_EVENTS.SUCCEEDED]: '명령이 성공적으로 완료되었습니다.',
  [COMMAND_LOG_EVENTS.FAILED]: '명령이 실패했습니다.',
  [COMMAND_LOG_EVENTS.CANCELLED]: '명령이 취소되었습니다.',
  [COMMAND_LOG_EVENTS.TIMEOUT]: '명령이 응답 없이 시간 초과되었습니다.'
};

// 상태 변화가 있을 때마다 여러 곳에서 각자 CommandLog를 남기지 않도록 모아둔 공용 함수.
function logCommandEvent(command, event, { level = 'info', agentId = null, detail } = {}) {
  const base = EVENT_MESSAGES[event] ?? event;
  const message = detail ? `${base} (${detail})` : base;
  return addCommandLog({
    commandId: command.id,
    projectId: command.projectId,
    agentId,
    level,
    message: `[${event}] ${message}`
  });
}

// 웹/디스코드에서 start/stop/restart 요청 시 호출된다.
// 실제 프로세스를 건드리지 않고 DB에 pending Command만 생성한다. (Home Server Agent가 나중에 폴링해 처리)
export async function requestControlCommand({ projectId, action, source, requestedBy, idempotencyKey }) {
  if (!isOneOf(action, COMMAND_ACTIONS)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `action은 다음 중 하나여야 합니다: ${COMMAND_ACTIONS.join(', ')}`);
  }
  if (!isOneOf(source, COMMAND_SOURCES)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `source는 다음 중 하나여야 합니다: ${COMMAND_SOURCES.join(', ')}`);
  }

  // 재시도로 같은 Idempotency-Key가 다시 들어오면 새로 만들지 않고 기존 Command를 그대로 돌려준다.
  if (idempotencyKey) {
    const existing = await findCommandByIdempotencyKey(idempotencyKey);
    if (existing) return existing;
  }

  const project = await getProjectOrThrow(projectId);

  // 같은 프로젝트에 아직 끝나지 않은(pending/processing) 명령이 있으면 새 명령을 받지 않는다.
  // 아래 pre-check는 사용자에게 바로 명확한 에러를 주기 위한 것이고, 실제 경합 방지는
  // DB의 partial unique index(commands_active_project_unique)가 최종 방어선이다.
  const active = await findActiveCommandForProject(project.id);
  if (active) {
    throw new ApiError(
      409,
      'PROJECT_COMMAND_IN_PROGRESS',
      'A command is already being processed for this project.'
    );
  }

  let command;
  try {
    command = await createCommand({
      projectId: project.id,
      action,
      source,
      requestedBy: requestedBy ?? null,
      idempotencyKey: idempotencyKey ?? null
    });
  } catch (error) {
    if (error.code === 'P2002') {
      if (idempotencyKey && error.meta?.target?.includes?.('idempotencyKey')) {
        const existing = await findCommandByIdempotencyKey(idempotencyKey);
        if (existing) return existing;
      }
      throw new ApiError(
        409,
        'PROJECT_COMMAND_IN_PROGRESS',
        'A command is already being processed for this project.'
      );
    }
    throw error;
  }

  const logDetail = process.env.SERVER_CONTROL_MODE === 'mock'
    ? 'mock 모드: 실제 Agent가 없으므로 scripts/mock-agent.js 또는 Agent API로 직접 처리해야 합니다.'
    : undefined;
  await logCommandEvent(command, COMMAND_LOG_EVENTS.CREATED, { detail: logDetail });

  return command;
}

export async function listCommandsFiltered({ status, projectId }) {
  if (status && !isOneOf(status, COMMAND_STATUSES)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `status는 다음 중 하나여야 합니다: ${COMMAND_STATUSES.join(', ')}`);
  }
  return findCommands({ status, projectId });
}

export async function getCommandOrThrow(id) {
  const command = await findCommandById(id);
  if (!command) {
    throw new ApiError(404, 'COMMAND_NOT_FOUND', '명령을 찾을 수 없습니다.');
  }
  return command;
}

// 관리자가 아직 Agent가 가져가지 않은 pending 명령을 취소한다.
export async function cancelPendingCommand(id, cancelledBy) {
  const command = await getCommandOrThrow(id);
  const cancelled = await cancelCommand(id);
  if (!cancelled) {
    throw new ApiError(
      409,
      'INVALID_STATE_TRANSITION',
      `pending 상태의 명령만 취소할 수 있습니다. (현재 상태: ${command.status})`
    );
  }
  await logCommandEvent(command, COMMAND_LOG_EVENTS.CANCELLED, {
    detail: cancelledBy ? `by ${cancelledBy}` : undefined
  });
  return getCommandOrThrow(id);
}

// ── 이하 Home Server Agent 전용 (agent/commands/*) ─────────────

export async function listPendingCommandsForAgent(agentId) {
  return findPendingCommands({ agentId });
}

// agentId: requireAgent()로 인증된 호출자의 Agent id. 해당 Agent가 담당하는 프로젝트의
// 명령만 처리할 수 있도록 project.agentId와 비교한다(다른 Agent의 프로젝트는 건드릴 수 없음).
export async function markCommandProcessing(id, agentId) {
  const command = await getCommandOrThrow(id);

  if (command.project.agentId && command.project.agentId !== agentId) {
    throw new ApiError(403, 'AGENT_PROJECT_MISMATCH', '다른 Agent에 연결된 프로젝트의 명령은 처리할 수 없습니다.');
  }

  const claimed = await claimCommand(id, agentId);
  if (!claimed) {
    throw new ApiError(
      409,
      'INVALID_STATE_TRANSITION',
      `이미 다른 곳에서 처리 중이거나 완료된 명령입니다. (현재 상태: ${command.status})`
    );
  }
  const claimedCommand = await getCommandOrThrow(id);
  await logCommandEvent(claimedCommand, COMMAND_LOG_EVENTS.CLAIMED, { agentId });
  return claimedCommand;
}

export async function markCommandFinished(id, status, errorMessage, agentId) {
  const command = await getCommandOrThrow(id);

  if (command.claimedByAgentId && command.claimedByAgentId !== agentId) {
    throw new ApiError(403, 'AGENT_PROJECT_MISMATCH', '다른 Agent가 선점한 명령은 완료 처리할 수 없습니다.');
  }

  const updated = await completeCommand(id, { status, errorMessage });
  if (!updated) {
    throw new ApiError(
      409,
      'INVALID_STATE_TRANSITION',
      `processing 상태의 명령만 완료 처리할 수 있습니다. (현재 상태: ${command.status})`
    );
  }
  const finishedCommand = await getCommandOrThrow(id);
  await logCommandEvent(
    finishedCommand,
    status === 'success' ? COMMAND_LOG_EVENTS.SUCCEEDED : COMMAND_LOG_EVENTS.FAILED,
    { level: status === 'success' ? 'info' : 'error', agentId, detail: errorMessage ?? undefined }
  );
  return finishedCommand;
}

// 아직 cron/scheduler는 없다. 나중에 cron에서(혹은 관리자가 수동으로) 호출할 함수만 준비해둔다.
export async function timeoutStaleCommands() {
  const threshold = new Date(Date.now() - COMMAND_TIMEOUT_SECONDS * 1000);
  const staleCommands = await findStaleProcessingCommands(threshold);

  const timedOut = [];
  for (const command of staleCommands) {
    const updated = await completeCommand(command.id, { status: 'timeout', errorMessage: 'COMMAND_TIMEOUT' });
    if (updated) {
      const finished = await getCommandOrThrow(command.id);
      await logCommandEvent(finished, COMMAND_LOG_EVENTS.TIMEOUT, {
        level: 'error',
        agentId: command.claimedByAgentId
      });
      timedOut.push(finished.id);
    }
  }
  return timedOut;
}
