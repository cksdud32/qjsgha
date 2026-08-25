import { ok, fail, failFromError, parseBody } from '../../server/http/respond.js';
import { requireAgent } from '../../server/auth/agentAuth.js';
import { recordHeartbeat, reportAgentStatus } from '../../server/services/agentService.js';
import {
  listPendingCommandsForAgent,
  markCommandProcessing,
  markCommandFinished
} from '../../server/services/commandService.js';
import { listProjectsForAgent, reportProjectStatus } from '../../server/services/projectService.js';

// Vercel Hobby 플랜의 Serverless Function 12개 제한 때문에, 원래 별도 파일이던
// /api/agent/* 엔드포인트(heartbeat, status, commands/*, projects/*)를 이 파일 하나로 합쳤다.
// 외부에서 보이는 URL과 동작은 기존과 동일하다.
export default async function handler(request, response) {
  const segments = Array.isArray(request.query.path) ? request.query.path : [];

  try {
    const { agentId } = requireAgent(request);

    if (segments.length === 1 && segments[0] === 'heartbeat' && request.method === 'POST') {
      const agent = await recordHeartbeat(agentId);
      return ok(response, { agentId: agent.id, status: agent.status, lastSeenAt: agent.lastSeenAt });
    }

    if (segments.length === 1 && segments[0] === 'status' && request.method === 'POST') {
      const body = parseBody(request);
      const agent = await reportAgentStatus(agentId, body);
      return ok(response, agent);
    }

    if (segments.length === 1 && segments[0] === 'commands' && request.method === 'GET') {
      const commands = await listPendingCommandsForAgent(agentId);
      return ok(response, commands);
    }

    if (segments.length === 3 && segments[0] === 'commands' && request.method === 'POST') {
      const [, commandId, action] = segments;
      if (action === 'processing') {
        const command = await markCommandProcessing(commandId, agentId);
        return ok(response, command);
      }
      if (action === 'success') {
        const command = await markCommandFinished(commandId, 'success', null, agentId);
        return ok(response, command);
      }
      if (action === 'failed') {
        const { errorMessage } = parseBody(request);
        const command = await markCommandFinished(commandId, 'failed', errorMessage ?? null, agentId);
        return ok(response, command);
      }
    }

    if (segments.length === 1 && segments[0] === 'projects' && request.method === 'GET') {
      const projects = await listProjectsForAgent(agentId);
      return ok(response, projects);
    }

    if (segments.length === 3 && segments[0] === 'projects' && segments[2] === 'status' && request.method === 'POST') {
      const { status } = parseBody(request);
      const project = await reportProjectStatus(segments[1], status, agentId);
      return ok(response, project);
    }

    return fail(response, 404, 'NOT_FOUND', 'Not Found');
  } catch (error) {
    return failFromError(response, error);
  }
}
