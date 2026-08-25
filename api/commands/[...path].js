import { ok, fail, failFromError } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import {
  listCommandsFiltered,
  getCommandOrThrow,
  cancelPendingCommand,
  timeoutStaleCommands
} from '../../server/services/commandService.js';

// Vercel Hobby 플랜의 Serverless Function 12개 제한 때문에, 원래 별도 파일이던
// /api/commands/* 엔드포인트(index, [id], [id]/cancel, timeout-check)를 이 파일 하나로 합쳤다.
// 외부에서 보이는 URL과 동작은 기존과 동일하다.
export default async function handler(request, response) {
  const segments = Array.isArray(request.query.path) ? request.query.path : [];

  try {
    const requestedBy = await requireAdmin(request);

    if (segments.length === 0 && request.method === 'GET') {
      const { status, projectId } = request.query;
      const commands = await listCommandsFiltered({ status, projectId });
      return ok(response, commands);
    }

    if (segments.length === 1 && segments[0] === 'timeout-check' && request.method === 'POST') {
      const timedOutCommandIds = await timeoutStaleCommands();
      return ok(response, { timedOutCommandIds, count: timedOutCommandIds.length });
    }

    if (segments.length === 1 && request.method === 'GET') {
      const command = await getCommandOrThrow(segments[0]);
      return ok(response, command);
    }

    if (segments.length === 2 && segments[1] === 'cancel' && request.method === 'POST') {
      const command = await cancelPendingCommand(segments[0], requestedBy);
      return ok(response, command);
    }

    return fail(response, 404, 'NOT_FOUND', 'Not Found');
  } catch (error) {
    return failFromError(response, error);
  }
}
