import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceScope } from './workspace-scope';

test('a response remains valid during edits and language changes in the same workspace', () => {
  const scope = new WorkspaceScope();
  scope.select('account:synthetic-a');
  const request = scope.capture();
  scope.select('account:synthetic-a');
  assert(scope.accepts(request));
});

test('an outstanding reply cannot modify another account or a guest workspace', () => {
  for (const next of ['account:synthetic-b', 'guest', 'pending']) {
    const scope = new WorkspaceScope();
    scope.select('account:synthetic-a');
    const request = scope.capture();
    scope.select(next);
    assert(!scope.accepts(request));
  }
});

test('leaving and returning to the same identity still rejects the old session reply', () => {
  const scope = new WorkspaceScope();
  scope.select('account:synthetic-a');
  const request = scope.capture();
  scope.select('guest');
  scope.select('account:synthetic-a');
  assert(!scope.accepts(request));
  assert(scope.accepts(scope.capture()));
});
