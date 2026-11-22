import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('integration manifest uses public integration links only', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'integration-manifest.json'), 'utf8'));
  assert.equal(manifest.sourceIssue, 'https://takeagent.ai/integrations/smartaccounting');
  assert.equal(manifest.repository, 'https://github.com/jongos/takeagent-smartaccounting');
  assert.ok(!String(manifest.sourceIssue).includes('jongos/takeagent/issues'));
});

test('readme and host release docs avoid private host issue links', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const hostRelease = readFileSync(join(root, 'docs/host-release-status.md'), 'utf8');
  assert.ok(readme.includes('https://takeagent.ai/integrations/smartaccounting'));
  assert.ok(!readme.includes('github.com/jongos/takeagent/issues'));
  assert.ok(!hostRelease.includes('github.com/jongos/takeagent'));
  assert.ok(!hostRelease.includes('src/lib/'));
  assert.ok(hostRelease.includes('https://takeagent.ai/integrations'));
});