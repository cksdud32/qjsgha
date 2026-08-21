import { createHandler, ok } from '../../server/http/respond.js';
import { requireAdmin } from '../../server/auth/adminAuth.js';
import { timeoutStaleCommands } from '../../server/services/commandService.js';

// COMMAND_TIMEOUT_SECONDS(기본 600초) 이상 processing 상태에 머문 명령들을 timeout으로 정리한다.
// 아직 cron/scheduler는 없으므로, 지금은 관리자가 수동으로(또는 나중에 cron이) 호출하는 형태로만 존재한다.
export default createHandler({
  async POST(request, response) {
    await requireAdmin(request);
    const timedOutCommandIds = await timeoutStaleCommands();
    return ok(response, { timedOutCommandIds, count: timedOutCommandIds.length });
  }
});
