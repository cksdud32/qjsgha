import { createHandler, ok } from '../../../server/http/respond.js';
import { requireAdmin } from '../../../server/auth/adminAuth.js';
import { requestControlCommand } from '../../../server/services/commandService.js';

export default createHandler({
  async POST(request, response) {
    const requestedBy = await requireAdmin(request);
    const command = await requestControlCommand({
      projectId: request.query.id,
      action: 'restart',
      source: 'web',
      requestedBy
    });
    return ok(response, { commandId: command.id, projectId: command.projectId, action: command.action, status: command.status }, 201);
  }
});
