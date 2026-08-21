import { ApiError } from '../http/respond.js';
import { AGENT_OFFLINE_THRESHOLD_SECONDS } from '../config.js';
import {
  findAllAgents,
  findAgentById,
  createAgent as createAgentRow,
  touchAgentHeartbeat,
  updateAgentStatusReport
} from '../repositories/agentRepository.js';

// lastSeenAt 기준으로 온라인 여부를 "계산"한다. offline을 DB에 강제로 써넣지 않아도 되므로
// heartbeat가 끊긴 순간과 실제로 그 사실을 인지하는 시점 사이에 별도 batch job이 필요 없다.
export function deriveAgentStatus(agent) {
  if (!agent.lastSeenAt) return 'unknown';
  const secondsSinceLastSeen = (Date.now() - new Date(agent.lastSeenAt).getTime()) / 1000;
  if (secondsSinceLastSeen > AGENT_OFFLINE_THRESHOLD_SECONDS) return 'offline';
  return agent.status === 'unknown' ? 'unknown' : 'online';
}

function withDerivedStatus(agent) {
  return { ...agent, status: deriveAgentStatus(agent) };
}

export async function listAgents() {
  const agents = await findAllAgents();
  return agents.map(withDerivedStatus);
}

export async function getAgentOrThrow(id) {
  const agent = await findAgentById(id);
  if (!agent) {
    throw new ApiError(404, 'AGENT_NOT_FOUND', 'Agent를 찾을 수 없습니다.');
  }
  return agent;
}

export async function createAgent({ name }) {
  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'name은 필수입니다.');
  }
  try {
    return await createAgentRow({ name });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'AGENT_NAME_EXISTS', `이미 존재하는 Agent 이름입니다: ${name}`);
    }
    throw error;
  }
}

// POST /api/agent/heartbeat
export async function recordHeartbeat(agentId) {
  await getAgentOrThrow(agentId);
  return touchAgentHeartbeat(agentId);
}

// POST /api/agent/status — heartbeat를 겸하면서 hostname/platform/uptime/cpuUsage/memoryUsage를 갱신한다.
// 실제 os 모듈로 값을 수집하는 Agent 쪽 코드는 이번 범위가 아니므로, 여기서는 값의 형태만 검증한다.
export async function reportAgentStatus(agentId, payload) {
  await getAgentOrThrow(agentId);

  const { hostname, platform, uptime, cpuUsage, memoryUsage } = payload ?? {};
  const report = {};

  if (hostname !== undefined) {
    if (typeof hostname !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'hostname은 문자열이어야 합니다.');
    report.hostname = hostname;
  }
  if (platform !== undefined) {
    if (typeof platform !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'platform은 문자열이어야 합니다.');
    report.platform = platform;
  }
  if (uptime !== undefined) {
    if (!Number.isFinite(uptime) || uptime < 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'uptime은 0 이상의 숫자(초)여야 합니다.');
    }
    report.uptime = Math.floor(uptime);
  }
  if (cpuUsage !== undefined) {
    if (!Number.isFinite(cpuUsage) || cpuUsage < 0 || cpuUsage > 100) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'cpuUsage는 0~100 사이의 숫자여야 합니다.');
    }
    report.cpuUsage = cpuUsage;
  }
  if (memoryUsage !== undefined) {
    if (!Number.isFinite(memoryUsage) || memoryUsage < 0 || memoryUsage > 100) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'memoryUsage는 0~100 사이의 숫자여야 합니다.');
    }
    report.memoryUsage = memoryUsage;
  }

  return updateAgentStatusReport(agentId, report);
}
