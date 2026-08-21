import { createHandler, ok } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import { getCommandOrThrow } from '../../server/services/commandService.js';

export default createHandler({
  async GET(request, response) {
    await requireAdmin(request);
    const command = await getCommandOrThrow(request.query.id);
    return ok(response, command);
  }
});
