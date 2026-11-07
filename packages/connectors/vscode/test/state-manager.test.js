import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { StateManager } from '../src/state-manager.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

/**
 * In-memory mock configuration provider simulating vscode.workspace.getConfiguration()
 */
class MockConfigProvider {
  constructor(initialSettings = {}) {
    this.settings = { ...initialSettings };
  }

  async get(section) {
    return this.settings[section] ? JSON.parse(JSON.stringify(this.settings[section])) : undefined;
  }

  async update(section, value) {
    if (value === undefined) {
      delete this.settings[section];
    } else {
      this.settings[section] = JSON.parse(JSON.stringify(value));
    }
  }
}

test('StateManager: generates high-entropy pairing code and verifies Bearer header', () => {
  const manager = new StateManager();
  const code = manager.getPairingCode();

  assert.ok(code);
  assert.equal(code.length, 32); // 16 bytes hex = 128 bits
  assert.match(code, /^[0-9a-f]{32}$/);

  // Verification
  assert.equal(manager.verifyToken(`Bearer ${code}`), true);
  assert.equal(manager.verifyToken('Bearer wrongtoken12345678901234567890'), false);
  assert.equal(manager.verifyToken('Basic something'), false);
  assert.equal(manager.verifyToken(''), false);
  assert.equal(manager.verifyToken(undefined), false);

  // Regeneration
  const newCode = manager.regeneratePairingCode();
  assert.notEqual(newCode, code);
  assert.equal(manager.verifyToken(`Bearer ${newCode}`), true);
  assert.equal(manager.verifyToken(`Bearer ${code}`), false);
});

test('StateManager: applyTheme non-destructively preserves unrelated user settings', async () => {
  const mockConfig = new MockConfigProvider({
    'workbench.colorCustomizations': {
      'custom.userSetting': '#112233',
      'editor.background': '#000000',
    },
    'editor.tokenColorCustomizations': {
      'userTokenSetting': '#445566',
    },
  });

  const manager = new StateManager({ configProvider: mockConfig });
  const result = await manager.applyTheme(sampleProject);

  assert.ok(result.appliedCount > 0);

  const appliedWorkbench = await mockConfig.get('workbench.colorCustomizations');
  const appliedToken = await mockConfig.get('editor.tokenColorCustomizations');

  // Unrelated user settings must be preserved
  assert.equal(appliedWorkbench['custom.userSetting'], '#112233');
  assert.equal(appliedToken['userTokenSetting'], '#445566');

  // OpenTheme settings must be applied
  assert.equal(appliedWorkbench['editor.background'], '#171C25');
  assert.equal(appliedWorkbench['editor.foreground'], '#F1F3F5');
  assert.equal(appliedToken['comments'], '#9AAABC');
});

test('StateManager: restoreOriginalColors safely restores original state and preserves manual user edits', async () => {
  const mockConfig = new MockConfigProvider({
    'workbench.colorCustomizations': {
      'custom.userSetting': '#112233',
      'editor.background': '#000000',
    },
    'editor.tokenColorCustomizations': {
      'userTokenSetting': '#445566',
    },
  });

  const manager = new StateManager({ configProvider: mockConfig });
  await manager.applyTheme(sampleProject);

  // Simulate user manually changing one color in settings after OpenTheme applied it
  const current = await mockConfig.get('workbench.colorCustomizations');
  current['statusBar.background'] = '#ABCDEF'; // User manual override
  await mockConfig.update('workbench.colorCustomizations', current);

  // Restore colors
  const restoreResult = await manager.restoreOriginalColors();
  assert.equal(restoreResult.ok, true);
  assert.ok(restoreResult.restoredCount > 0);

  const restoredWorkbench = await mockConfig.get('workbench.colorCustomizations');
  const restoredToken = await mockConfig.get('editor.tokenColorCustomizations');

  // Original user settings preserved
  assert.equal(restoredWorkbench['custom.userSetting'], '#112233');
  assert.equal(restoredToken['userTokenSetting'], '#445566');

  // editor.background restored to original pre-apply value (#000000)
  assert.equal(restoredWorkbench['editor.background'], '#000000');

  // User manual edit (#ABCDEF) MUST NOT be wiped out
  assert.equal(restoredWorkbench['statusBar.background'], '#ABCDEF');

  // Keys that did not exist before apply should be removed
  assert.equal(restoredWorkbench['focusBorder'], undefined);
});

test('StateManager: saved recovery snapshot survives extension restart and preserves manual edits', async () => {
  const mockConfig = new MockConfigProvider({
    'workbench.colorCustomizations': { 'editor.background': '#000000', 'unrelated.color': '#334455' },
    'editor.tokenColorCustomizations': { 'unrelatedToken': '#667788' },
  });
  const data = new Map();
  const storage = {
    get(key) { return data.get(key); },
    async update(key, value) {
      if (value === undefined) data.delete(key);
      else data.set(key, structuredClone(value));
    },
  };
  const first = new StateManager({ configProvider: mockConfig, storage });
  await first.applyTheme(sampleProject);
  assert.ok(data.size > 0, 'original values must be persisted before applying');
  const restarted = new StateManager({ configProvider: mockConfig, storage });
  assert.notEqual(first.getPairingCode(), restarted.getPairingCode(), 'pairing token is never persisted');

  const manuallyEdited = await mockConfig.get('workbench.colorCustomizations');
  manuallyEdited['statusBar.background'] = '#ABCDEF';
  await mockConfig.update('workbench.colorCustomizations', manuallyEdited);

  const result = await restarted.restoreOriginalColors();
  assert.ok(result.restoredCount > 0);
  const restored = await mockConfig.get('workbench.colorCustomizations');
  assert.equal(restored['editor.background'], '#000000');
  assert.equal(restored['unrelated.color'], '#334455');
  assert.equal(restored['statusBar.background'], '#ABCDEF', 'preserve a manual user edit');
  assert.equal(data.size, 0, 'successful restore clears persisted snapshot');

  const noOp = await new StateManager({ configProvider: mockConfig, storage }).restoreOriginalColors();
  assert.equal(noOp.restoredCount, 0);
  assert.equal((await mockConfig.get('workbench.colorCustomizations'))['statusBar.background'], '#ABCDEF');
});
