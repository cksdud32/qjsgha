import { createHandler, ok, parseBody } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import { listAgents, createAgent } from '../../server/services/agentService.js';

export default createHandler({
  async GET(request, response) {
    await requireAdmin(request);
    const agents = await listAgents();
    return ok(response, agents);
  },

  async POST(request, response) {
    await requireAdmin(request);
    const agent = await createAgent(parseBody(request));
    return ok(response, agent, 201);
  }
});
