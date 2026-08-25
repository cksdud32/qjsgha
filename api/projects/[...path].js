import { ok, fail, failFromError, parseBody, getIdempotencyKey } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import { listProjects, createProject, getProjectOrThrow } from '../../server/services/projectService.js';
import { requestControlCommand } from '../../server/services/commandService.js';

const CONTROL_ACTIONS = new Set(['start', 'stop', 'restart']);

// Vercel Hobby 플랜의 Serverless Function 12개 제한 때문에, 원래 별도 파일이던
// /api/projects/* 엔드포인트(index, [id], [id]/start|stop|restart)를 이 파일 하나로 합쳤다.
// 외부에서 보이는 URL과 동작은 기존과 동일하다.
export default async function handler(request, response) {
  const segments = Array.isArray(request.query.path) ? request.query.path : [];

  try {
    const requestedBy = await requireAdmin(request);

    if (segments.length === 0 && request.method === 'GET') {
      const projects = await listProjects();
      return ok(response, projects);
    }

    if (segments.length === 0 && request.method === 'POST') {
      const project = await createProject(parseBody(request));
      return ok(response, project, 201);
    }

    if (segments.length === 1 && request.method === 'GET') {
      const project = await getProjectOrThrow(segments[0]);
      return ok(response, project);
    }

    if (segments.length === 2 && CONTROL_ACTIONS.has(segments[1]) && request.method === 'POST') {
      const command = await requestControlCommand({
        projectId: segments[0],
        action: segments[1],
        source: 'web',
        requestedBy,
        idempotencyKey: getIdempotencyKey(request)
      });
      return ok(response, { commandId: command.id, projectId: command.projectId, action: command.action, status: command.status }, 201);
    }

    return fail(response, 404, 'NOT_FOUND', 'Not Found');
  } catch (error) {
    return failFromError(response, error);
  }
}
