import { createHandler, ok } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import { listCommandsFiltered } from '../../server/services/commandService.js';

export default createHandler({
  async GET(request, response) {
    await requireAdmin(request);
    const { status, projectId } = request.query;
    const commands = await listCommandsFiltered({ status, projectId });
    return ok(response, commands);
  }
});
