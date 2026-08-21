import { ApiError } from '../http/respond.js';
import { PROJECT_STATUSES, PROJECT_TYPES, isOneOf } from '../types/enums.js';
import {
  findAllProjects,
  findProjectById,
  createProject as createProjectRow,
  updateProjectStatus
} from '../repositories/projectRepository.js';
import { findAgentById } from '../repositories/agentRepository.js';

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export async function listProjects() {
  return findAllProjects();
}

export async function getProjectOrThrow(id) {
  const project = await findProjectById(id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.');
  }
  return project;
}

export async function createProject(input) {
  const { name, description, port, type, agentId, processName } = input;

  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'name은 필수입니다.');
  }
  if (!isOneOf(type, PROJECT_TYPES)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `type은 다음 중 하나여야 합니다: ${PROJECT_TYPES.join(', ')}`);
  }
  if (port !== undefined && port !== null && (!Number.isInteger(port) || port < 0 || port > 65535)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'port는 0~65535 사이의 정수여야 합니다.');
  }

  let id = input.id ? String(input.id).toLowerCase() : slugify(name);
  if (!SLUG_PATTERN.test(id)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'id는 소문자/숫자/하이픈으로만 이루어진 2~64자 문자열이어야 합니다.'
    );
  }

  if (agentId) {
    const agent = await findAgentById(agentId);
    if (!agent) {
      throw new ApiError(404, 'AGENT_NOT_FOUND', '연결하려는 Agent를 찾을 수 없습니다.');
    }
  }

  const existing = await findProjectById(id);
  if (existing) {
    throw new ApiError(409, 'PROJECT_ID_EXISTS', `이미 존재하는 프로젝트 id입니다: ${id}`);
  }

  try {
    return await createProjectRow({
      id,
      name,
      description: description ?? null,
      port: port ?? null,
      type,
      processName: processName ?? id,
      agentId: agentId ?? null
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'PROJECT_ID_EXISTS', `이미 존재하는 프로젝트 id입니다: ${id}`);
    }
    throw error;
  }
}

// Agent가 보고하는 실제 상태로 프로젝트 status를 갱신한다. (Home Server Agent 연동 지점)
export async function reportProjectStatus(id, status) {
  if (!isOneOf(status, PROJECT_STATUSES)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `status는 다음 중 하나여야 합니다: ${PROJECT_STATUSES.join(', ')}`);
  }
  await getProjectOrThrow(id);
  return updateProjectStatus(id, status);
}
