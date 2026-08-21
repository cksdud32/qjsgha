import { createHandler, ok } from '../../server/http/respond.js';
import { requireAgent } from '../../server/auth/agentAuth.js';
import { recordHeartbeat } from '../../server/services/agentService.js';

// Home Server Agent가 살아있음을 주기적으로 알리는 엔드포인트. status=online, lastSeenAt=now로 갱신한다.
// offline 판정은 여기서 DB에 강제로 쓰지 않고, 조회 시점에 (now - lastSeenAt > threshold)로 계산한다.
export default createHandler({
  async POST(request, response) {
    const { agentId } = requireAgent(request);
    const agent = await recordHeartbeat(agentId);
    return ok(response, { agentId: agent.id, status: agent.status, lastSeenAt: agent.lastSeenAt });
  }
});
