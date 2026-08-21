import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAgent } from '../server/auth/agentAuth.js';
import { requireAdmin } from '../server/auth/adminAuth.js';
import { ApiError } from '../server/http/respond.js';

function fakeRequest({ headers = {}, body, query = {} } = {}) {
  return { headers, body, query };
}

test('requireAgent: missing token -> 401', () => {
  process.env.AGENT_API_TOKEN = 'test-token';
  assert.throws(
    () => requireAgent(fakeRequest()),
    (err) => err instanceof ApiError && err.status === 401
  );
});

test('requireAgent: wrong token -> 401', () => {
  process.env.AGENT_API_TOKEN = 'test-token';
  assert.throws(
    () => requireAgent(fakeRequest({ headers: { authorization: 'Bearer wrong-token' } })),
    (err) => err instanceof ApiError && err.status === 401
  );
});

test('requireAgent: correct token but no agent id -> 401 AGENT_ID_REQUIRED', () => {
  process.env.AGENT_API_TOKEN = 'test-token';
  assert.throws(
    () => requireAgent(fakeRequest({ headers: { authorization: 'Bearer test-token' } })),
    (err) => err instanceof ApiError && err.status === 401 && err.code === 'AGENT_ID_REQUIRED'
  );
});

test('requireAgent: correct token + X-Agent-Id header -> resolves agentId', () => {
  process.env.AGENT_API_TOKEN = 'test-token';
  const result = requireAgent(
    fakeRequest({ headers: { authorization: 'Bearer test-token', 'x-agent-id': 'agent-123' } })
  );
  assert.equal(result.agentId, 'agent-123');
});

test('requireAgent: query string agentId is not trusted over missing header', () => {
  process.env.AGENT_API_TOKEN = 'test-token';
  // query만으로도 동작은 하되(하위 호환), 헤더가 있으면 헤더가 우선이어야 한다.
  const result = requireAgent(
    fakeRequest({
      headers: { authorization: 'Bearer test-token', 'x-agent-id': 'agent-from-header' },
      query: { agentId: 'agent-from-query' }
    })
  );
  assert.equal(result.agentId, 'agent-from-header');
});

test('requireAdmin: no credentials -> 401 (no DB call)', async () => {
  await assert.rejects(
    () => requireAdmin(fakeRequest()),
    (err) => err instanceof ApiError && err.status === 401
  );
});

test('requireAdmin: malformed Authorization header -> 401 (no DB call)', async () => {
  await assert.rejects(
    () => requireAdmin(fakeRequest({ headers: { authorization: 'NotBasic garbage' } })),
    (err) => err instanceof ApiError && err.status === 401
  );
});
