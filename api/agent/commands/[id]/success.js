import { createHandler, ok } from '../../../../server/http/respond.js';
import { requireAgent } from '../../../../server/auth/agentAuth.js';
import { markCommandFinished } from '../../../../server/services/commandService.js';

// processing -> success. processing 상태가 아니거나 이 명령을 선점한 Agent가 아니면 거부한다.
export default createHandler({
  async POST(request, response) {
    const { agentId } = requireAgent(request);
    const command = await markCommandFinished(request.query.id, 'success', null, agentId);
    return ok(response, command);
  }
});
