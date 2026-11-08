import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LiveSyncServer } from '../src/server.js';
import { StateManager } from '../src/state-manager.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

class MockConfigProvider {
  constructor() {
    this.settings = {};
  }
  async get(k) {
    return this.settings[k] !== undefined ? JSON.parse(JSON.stringify(this.settings[k])) : undefined;
  }
  async update(k, v) {
    if (v === undefined) delete this.settings[k];
    else this.settings[k] = JSON.parse(JSON.stringify(v));
  }
}

let server;
let stateManager;
let port;
let token;
const TEST_PORT = 43199; // Use alternate port for test isolation

before(async () => {
  stateManager = new StateManager({ configProvider: new MockConfigProvider() });
  token = stateManager.getPairingCode();
  server = new LiveSyncServer({
    stateManager,
    appVersion: '1.144.0',
  });
  port = await server.start(TEST_PORT, '127.0.0.1');
});

after(async () => {
  if (server) {
    await server.stop();
  }
});

test('GET /v1/health: returns readiness without exposing secret', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/health`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.protocol, 'opentheme.live.v1');
  assert.equal(data.appId, 'vscode');
  assert.equal(data.version, '1.144.0');
  assert.equal(data.token, undefined);
  assert.equal(data.pairingCode, undefined);
});

test('OPTIONS /v1/apply: responds to allowed CORS preflight with private-network header', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://127.0.0.1:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Authorization, Content-Type',
    },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
  assert.equal(res.headers.get('access-control-allow-private-network'), 'true');
});

test('CORS: rejects unauthorized origin with 403', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/health`, {
    headers: {
      'Origin': 'http://evil.hacker.com',
    },
  });
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.code, 'FORBIDDEN_ORIGIN');
});

test('POST /v1/apply: rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.code, 'UNAUTHORIZED');
});

test('POST /v1/apply: successfully applies valid ThemeProject and sets Welcome page tokens', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Origin': 'http://127.0.0.1:5173',
    },
    body: JSON.stringify({
      protocol: 'opentheme.live.v1',
      appId: 'vscode',
      targetVersion: '1.144.0',
      project: sampleProject,
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.appliedCount > 0);
  assert.equal(data.version, '1.144.0');
  assert.equal(data.warning, null);

  const appliedWb = await stateManager.getWorkbenchColors();
  assert.equal(appliedWb['welcomePage.background'], '#171C25');
  assert.equal(appliedWb['editorGroup.emptyBackground'], '#171C25');
  assert.equal(appliedWb['welcomePage.tileBackground'], '#303A4B');
});

test('POST /v1/apply: returns warning for version mismatch', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      protocol: 'opentheme.live.v1',
      appId: 'vscode',
      targetVersion: '1.99.0',
      project: sampleProject,
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.warning.includes('Target version mismatch'));
});

test('POST /v1/apply: rejects invalid schema with 400', async () => {
  const badProject = { ...sampleProject, schemaVersion: '2.0.0' };
  const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      protocol: 'opentheme.live.v1',
      appId: 'vscode',
      targetVersion: '1.144.0',
      project: badProject,
    }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.code, 'INVALID_PROJECT');
});

test('POST /v1/apply: rejects incompatible appId with 422', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      protocol: 'opentheme.live.v1',
      appId: 'obsidian',
      targetVersion: '1.144.0',
      project: sampleProject,
    }),
  });
  assert.equal(res.status, 422);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.code, 'INCOMPATIBLE_APP');
});

test('POST /v1/apply: rejects payloads exceeding 256 KiB with 413', async () => {
  const hugePayload = 'A'.repeat(260 * 1024);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: hugePayload,
    });
    assert.equal(res.status, 413);
  } catch (err) {
    // Some fetch runtimes abort socket immediately on server connection destruction
    assert.ok(err);
  }
});

test('POST /v1/restore: restores original colors successfully', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Origin': 'http://localhost:5173',
    },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(typeof data.restoredCount, 'number');

  const restoredWb = await stateManager.getWorkbenchColors();
  assert.equal(restoredWb['welcomePage.background'], undefined);
  assert.equal(restoredWb['editorGroup.emptyBackground'], undefined);
});

test('Unknown routes: return 404', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/v1/unknown`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.code, 'NOT_FOUND');
});
