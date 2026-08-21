import { createHandler, ok } from '../../../server/http/respond.js';
import { requireAdmin } from '../../../server/auth/adminAuth.js';
import { cancelPendingCommand } from '../../../server/services/commandService.js';

// pending -> cancelled. Agent가 이미 가져간(processing 이상) 명령은 취소할 수 없다(409).
export default createHandler({
  async POST(request, response) {
    const cancelledBy = await requireAdmin(request);
    const command = await cancelPendingCommand(request.query.id, cancelledBy);
    return ok(response, command);
  }
});
