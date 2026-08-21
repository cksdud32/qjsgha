import { createHandler, ok } from '../../../server/http/respond.js';
import { requireAgent } from '../../../server/auth/agentAuth.js';
import { listPendingCommandsForAgent } from '../../../server/services/commandService.js';

// Home Server Agent가 폴링으로 처리할 pending 명령 목록을 가져가는 엔드포인트.
export default createHandler({
  async GET(request, response) {
    requireAgent(request);
    const { agentId } = request.query;
    const commands = await listPendingCommandsForAgent(agentId);
    return ok(response, commands);
  }
});
