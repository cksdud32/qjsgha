import { createHandler, ok, parseBody } from '../../server/http/respond.js';
import { requireAgent } from '../../server/auth/agentAuth.js';
import { reportAgentStatus } from '../../server/services/agentService.js';

// Home Server Agent가 자신의 시스템 정보(hostname/platform/uptime/cpuUsage/memoryUsage)를 보고하는 엔드포인트.
// 실제 CPU/RAM 수집(Node의 os 모듈 등)은 이번 범위가 아니고, 여기서는 값을 받아 저장하는 구조만 만든다.
// heartbeat 역할도 겸해서 status=online, lastSeenAt=now로 함께 갱신된다.
export default createHandler({
  async POST(request, response) {
    const { agentId } = requireAgent(request);
    const body = parseBody(request);
    const agent = await reportAgentStatus(agentId, body);
    return ok(response, agent);
  }
});
