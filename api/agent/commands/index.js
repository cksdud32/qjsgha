import { createHandler, ok } from '../../../server/http/respond.js';
import { requireAgent } from '../../../server/auth/agentAuth.js';
import { listPendingCommandsForAgent } from '../../../server/services/commandService.js';

// Home Server Agent가 폴링으로 처리할 pending 명령 목록을 가져가는 엔드포인트.
// agentId는 더 이상 query string을 신뢰하지 않고, requireAgent()가 인증 정보(X-Agent-Id 헤더)에서 뽑아낸 값을 쓴다.
export default createHandler({
  async GET(request, response) {
    const { agentId } = requireAgent(request);
    const commands = await listPendingCommandsForAgent(agentId);
    return ok(response, commands);
  }
});
