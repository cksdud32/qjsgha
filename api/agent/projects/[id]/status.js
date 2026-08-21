import { createHandler, ok, parseBody } from '../../../../server/http/respond.js';
import { requireAgent } from '../../../../server/auth/agentAuth.js';
import { reportProjectStatus } from '../../../../server/services/projectService.js';

// Home Server Agent가 실제 프로세스 상태를 주기적으로/이벤트 발생 시 보고하는 엔드포인트.
export default createHandler({
  async POST(request, response) {
    requireAgent(request);
    const { status } = parseBody(request);
    const project = await reportProjectStatus(request.query.id, status);
    return ok(response, project);
  }
});
