import 'dotenv/config';

// 로컬 개발용 "가짜 Home Server Agent".
// SERVER_CONTROL_MODE=mock 일 때만 동작하며, 실제 PM2/Docker 대신
// /api/agent/* 엔드포인트만 호출해 pending 명령을 processing -> success로 넘긴다.
// 상태는 전부 DB(Command 테이블)에 저장되므로 이 스크립트는 아무 상태도 들고 있지 않다.
//
// 사용법:
//   SERVER_CONTROL_MODE=mock AGENT_API_TOKEN=xxx BASE_URL=http://localhost:3000 node scripts/mock-agent.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AGENT_API_TOKEN = process.env.AGENT_API_TOKEN;
// Agent API는 이제 X-Agent-Id로 어떤 Agent인지 스스로 밝혀야 한다(URL query는 신뢰하지 않음).
// 먼저 POST /api/agents로 Agent를 등록하고, 그 id를 여기 넣는다.
const MOCK_AGENT_ID = process.env.MOCK_AGENT_ID;
const HEARTBEAT_INTERVAL_MS = Number(process.env.MOCK_AGENT_HEARTBEAT_INTERVAL_MS) || 30000;
const POLL_INTERVAL_MS = Number(process.env.MOCK_AGENT_POLL_INTERVAL_MS) || 3000;
const PROCESS_DELAY_MS = Number(process.env.MOCK_AGENT_PROCESS_DELAY_MS) || 1000;

if (process.env.SERVER_CONTROL_MODE !== 'mock') {
  console.error('SERVER_CONTROL_MODE=mock 일 때만 실행할 수 있습니다.');
  process.exit(1);
}

if (!AGENT_API_TOKEN) {
  console.error('AGENT_API_TOKEN 환경변수를 설정하세요.');
  process.exit(1);
}

if (!MOCK_AGENT_ID) {
  console.error('MOCK_AGENT_ID 환경변수를 설정하세요. (POST /api/agents로 미리 등록한 Agent의 id)');
  process.exit(1);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${AGENT_API_TOKEN}`,
    'X-Agent-Id': MOCK_AGENT_ID,
    'Content-Type': 'application/json'
  };
}

async function sendHeartbeat() {
  const res = await fetch(`${BASE_URL}/api/agent/heartbeat`, { method: 'POST', headers: authHeaders() });
  const body = await res.json();
  if (!body.success) console.error(`[mock-agent] heartbeat 실패: ${body.error?.message}`);
}

async function fetchPendingCommands() {
  const res = await fetch(`${BASE_URL}/api/agent/commands`, { headers: authHeaders() });
  const body = await res.json();
  if (!body.success) throw new Error(`pending 명령 조회 실패: ${body.error?.message}`);
  return body.data;
}

async function markProcessing(commandId) {
  const res = await fetch(`${BASE_URL}/api/agent/commands/${commandId}/processing`, {
    method: 'POST',
    headers: authHeaders()
  });
  return res.json();
}

async function markSuccess(commandId) {
  const res = await fetch(`${BASE_URL}/api/agent/commands/${commandId}/success`, {
    method: 'POST',
    headers: authHeaders()
  });
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processCommand(command) {
  const claimResult = await markProcessing(command.id);
  if (!claimResult.success) {
    console.log(`[mock-agent] ${command.id} 선점 실패(이미 다른 곳에서 처리 중): ${claimResult.error?.message}`);
    return;
  }
  console.log(`[mock-agent] ${command.id} (${command.action} @ ${command.projectId}) 처리 시작`);

  await sleep(PROCESS_DELAY_MS);

  const doneResult = await markSuccess(command.id);
  if (!doneResult.success) {
    console.error(`[mock-agent] ${command.id} 완료 처리 실패: ${doneResult.error?.message}`);
    return;
  }
  console.log(`[mock-agent] ${command.id} 완료 (mock success)`);
}

async function tick() {
  try {
    const pending = await fetchPendingCommands();
    for (const command of pending) {
      await processCommand(command);
    }
  } catch (error) {
    console.error('[mock-agent] 폴링 중 오류:', error.message);
  }
}

console.log(`[mock-agent] 시작 (agentId=${MOCK_AGENT_ID}) — ${BASE_URL} 를 ${POLL_INTERVAL_MS}ms 간격으로 폴링합니다.`);
sendHeartbeat();
tick();
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
setInterval(tick, POLL_INTERVAL_MS);
