import { createHandler, ok } from '../../../server/http/respond.js';
import { requireAgent } from '../../../server/auth/agentAuth.js';
import { listProjectsForAgent } from '../../../server/services/projectService.js';

// Home Server Agent가 자신에게 할당된 프로젝트 목록(설정)을 가져가는 엔드포인트.
export default createHandler({
  async GET(request, response) {
    const { agentId } = requireAgent(request);
    const projects = await listProjectsForAgent(agentId);
    return ok(response, projects);
  }
});
