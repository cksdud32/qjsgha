import { ApiError } from '../http/respond.js';
import { findAllAgents, createAgent as createAgentRow } from '../repositories/agentRepository.js';

export async function listAgents() {
  return findAllAgents();
}

export async function createAgent({ name }) {
  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'name은 필수입니다.');
  }
  try {
    return await createAgentRow({ name });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'AGENT_NAME_EXISTS', `이미 존재하는 Agent 이름입니다: ${name}`);
    }
    throw error;
  }
}
