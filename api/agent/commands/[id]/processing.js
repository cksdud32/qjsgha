import { createHandler, ok } from '../../../../server/http/respond.js';
import { requireAgent } from '../../../../server/auth/agentAuth.js';
import { markCommandProcessing } from '../../../../server/services/commandService.js';

// Agent가 명령을 선점(claim)한다. pending -> processing.
// status가 이미 pending이 아니면(다른 곳에서 먼저 처리 중이면) 409, 다른 Agent 소유 프로젝트면 403을 반환한다.
export default createHandler({
  async POST(request, response) {
    const { agentId } = requireAgent(request);
    const command = await markCommandProcessing(request.query.id, agentId);
    return ok(response, command);
  }
});
