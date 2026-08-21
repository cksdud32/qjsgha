import { createHandler, ok } from '../../../server/http/respond.js';
import { requireAdmin } from '../../../server/auth/adminAuth.js';
import { getProjectOrThrow } from '../../../server/services/projectService.js';

export default createHandler({
  async GET(request, response) {
    await requireAdmin(request);
    const project = await getProjectOrThrow(request.query.id);
    return ok(response, project);
  }
});
