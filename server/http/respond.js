// 모든 신규 API가 공유하는 공통 응답 포맷 유틸리티.
//
// 성공: { success: true, data }
// 실패: { success: false, error: { code, message } }

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok(response, data, status = 200) {
  return response.status(status).json({ success: true, data });
}

export function fail(response, status, code, message) {
  return response.status(status).json({ success: false, error: { code, message } });
}

export function failFromError(response, error) {
  if (error instanceof ApiError) {
    return fail(response, error.status, error.code, error.message);
  }
  console.error('Unhandled server-control API error:', error);
  return fail(response, 500, 'INTERNAL_ERROR', '서버 내부 오류가 발생했습니다.');
}

export function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed.join(', '));
  return fail(response, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
}

export function parseBody(request) {
  if (!request.body) return {};
  return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
}

// Idempotency-Key 헤더는 대소문자 표기가 제각각일 수 있어(node http는 lower-case로 정규화하지만
// 프록시를 거치는 경우를 대비해) 여기서 한 곳에서만 읽는다.
export function getIdempotencyKey(request) {
  const value = request.headers['idempotency-key'];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// 라우트 핸들러를 감싸서 method 체크 + 에러 처리를 통일한다.
export function createHandler(methodHandlers) {
  return async function handler(request, response) {
    const fn = methodHandlers[request.method];
    if (!fn) return methodNotAllowed(response, Object.keys(methodHandlers));
    try {
      await fn(request, response);
    } catch (error) {
      return failFromError(response, error);
    }
  };
}
