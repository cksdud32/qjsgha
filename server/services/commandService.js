import { ApiError } from '../http/respond.js';
import { COMMAND_ACTIONS, COMMAND_SOURCES, COMMAND_STATUSES, isOneOf } from '../types/enums.js';
import {
  createCommand,
  findCommands,
  findCommandById,
  findPendingCommands,
  claimCommand,
  completeCommand
} from '../repositories/commandRepository.js';
import { addCommandLog } from '../repositories/commandLogRepository.js';
import { getProjectOrThrow } from './projectService.js';

// 웹/디스코드에서 start/stop/restart 요청 시 호출된다.
// 실제 프로세스를 건드리지 않고 DB에 pending Command만 생성한다. (Home Server Agent가 나중에 폴링해 처리)
export async function requestControlCommand({ projectId, action, source, requestedBy }) {
  if (!isOneOf(action, COMMAND_ACTIONS)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `action은 다음 중 하나여야 합니다: ${COMMAND_ACTIONS.join(', ')}`);
  }
  if (!isOneOf(source, COMMAND_SOURCES)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `source는 다음 중 하나여야 합니다: ${COMMAND_SOURCES.join(', ')}`);
  }

  const project = await getProjectOrThrow(projectId);

  const command = await createCommand({
    projectId: project.id,
    action,
    source,
    requestedBy: requestedBy ?? null
  });

  const logMessage =
    process.env.SERVER_CONTROL_MODE === 'mock'
      ? `[mock] ${action} 명령이 생성되었습니다. 실제 Agent가 연결되어 있지 않으므로 scripts/mock-agent.js 또는 Agent API로 직접 처리해야 합니다.`
      : `${action} 명령이 생성되었습니다.`;
  await addCommandLog(command.id, 'info', logMessage);

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

// ── 이하 Home Server Agent 전용 (agent/commands/*) ─────────────

export async function listPendingCommandsForAgent(agentId) {
  return findPendingCommands({ agentId });
}

export async function markCommandProcessing(id) {
  const command = await getCommandOrThrow(id);
  const claimed = await claimCommand(id);
  if (!claimed) {
    throw new ApiError(
      409,
      'INVALID_STATE_TRANSITION',
      `이미 다른 곳에서 처리 중이거나 완료된 명령입니다. (현재 상태: ${command.status})`
    );
  }
  await addCommandLog(id, 'info', 'Agent가 명령 처리를 시작했습니다.');
  return getCommandOrThrow(id);
}

export async function markCommandFinished(id, status, errorMessage) {
  const command = await getCommandOrThrow(id);
  const updated = await completeCommand(id, { status, errorMessage });
  if (!updated) {
    throw new ApiError(
      409,
      'INVALID_STATE_TRANSITION',
      `processing 상태의 명령만 완료 처리할 수 있습니다. (현재 상태: ${command.status})`
    );
  }
  await addCommandLog(
    id,
    status === 'success' ? 'info' : 'error',
    status === 'success' ? '명령이 성공적으로 완료되었습니다.' : `명령이 실패했습니다: ${errorMessage ?? '(사유 없음)'}`
  );
  return getCommandOrThrow(id);
}
