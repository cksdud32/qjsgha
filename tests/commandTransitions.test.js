import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, isTerminalStatus } from '../server/types/commandTransitions.js';

test('pending -> processing is allowed', () => {
  assert.equal(canTransition('pending', 'processing'), true);
});

test('pending -> cancelled is allowed', () => {
  assert.equal(canTransition('pending', 'cancelled'), true);
});

test('pending -> success is not allowed', () => {
  assert.equal(canTransition('pending', 'success'), false);
});

test('processing -> success is allowed', () => {
  assert.equal(canTransition('processing', 'success'), true);
});

test('processing -> failed is allowed', () => {
  assert.equal(canTransition('processing', 'failed'), true);
});

test('processing -> timeout is allowed', () => {
  assert.equal(canTransition('processing', 'timeout'), true);
});

for (const terminal of ['success', 'failed', 'cancelled', 'timeout']) {
  test(`${terminal} -> processing is not allowed (terminal state)`, () => {
    assert.equal(canTransition(terminal, 'processing'), false);
  });

  test(`isTerminalStatus(${terminal}) is true`, () => {
    assert.equal(isTerminalStatus(terminal), true);
  });
}

test('isTerminalStatus(pending) is false', () => {
  assert.equal(isTerminalStatus('pending'), false);
});

test('isTerminalStatus(processing) is false', () => {
  assert.equal(isTerminalStatus('processing'), false);
});
