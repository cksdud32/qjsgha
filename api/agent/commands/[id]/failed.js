import { createHandler, ok, parseBody } from '../../../../server/http/respond.js';
import { requireAgent } from '../../../../server/auth/agentAuth.js';
import { markCommandFinished } from '../../../../server/services/commandService.js';

// processing -> failed. processing 상태가 아니면 409.
export default createHandler({
  async POST(request, response) {
    requireAgent(request);
    const { errorMessage } = parseBody(request);
    const command = await markCommandFinished(request.query.id, 'failed', errorMessage ?? null);
    return ok(response, command);
  }
});
