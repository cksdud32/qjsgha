import { createHandler, ok, parseBody } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import { listProjects, createProject } from '../../server/services/projectService.js';

export default createHandler({
  async GET(request, response) {
    await requireAdmin(request);
    const projects = await listProjects();
    return ok(response, projects);
  },

  async POST(request, response) {
    await requireAdmin(request);
    const project = await createProject(parseBody(request));
    return ok(response, project, 201);
  }
});
