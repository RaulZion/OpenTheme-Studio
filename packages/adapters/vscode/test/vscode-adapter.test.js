import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  vsCodeAdapter,
  VSCODE_SUPPORTED_VERSION,
  buildVSCodeThemeJson,
  buildVSCodePackageJson,
} from '../src/index.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

test('vscodeAdapter: metadata and supported versions', () => {
  assert.equal(vsCodeAdapter.id, 'vscode');
  assert.equal(vsCodeAdapter.displayName, 'Visual Studio Code');
  assert.deepEqual(vsCodeAdapter.supportedVersions, ['1.144.0']);
});

test('vscodeAdapter: getControls returns editor and syntax controls', () => {
  const controls = vsCodeAdapter.getControls(sampleProject, VSCODE_SUPPORTED_VERSION);
  assert.ok(controls.length > 10);
  assert.ok(controls.every((c) => c.supported === true));

  const bgControl = controls.find((c) => c.id === 'vscode.editor.canvas');
  assert.ok(bgControl);
  assert.equal(bgControl.binding.scope, 'shared');
  assert.equal(bgControl.binding.key, 'canvas');
});

test('vscodeAdapter: validation succeeds for valid project and version', () => {
  const issues = vsCodeAdapter.validate(sampleProject, VSCODE_SUPPORTED_VERSION);
  const errors = issues.filter((i) => i.severity === 'error');
  assert.equal(errors.length, 0);
});

test('vscodeAdapter: rejects unsupported version', () => {
  const issues = vsCodeAdapter.validate(sampleProject, '1.99.0');
  assert.ok(issues.some((i) => i.code === 'VSCODE_UNSUPPORTED_VERSION'));
});

test('vscodeAdapter: rejects invalid override key', () => {
  const badProject = {
    ...sampleProject,
    appOverrides: {
      vscode: {
        'invalid key with spaces and symbols!': '#112233',
      },
    },
  };
  const issues = vsCodeAdapter.validate(badProject, VSCODE_SUPPORTED_VERSION);
  assert.ok(issues.some((i) => i.code === 'VSCODE_INVALID_OVERRIDE_KEY'));
});

test('vscodeAdapter: export succeeds and produces native extension files', async () => {
  const result = await vsCodeAdapter.export(sampleProject, VSCODE_SUPPORTED_VERSION);

  assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
  assert.equal(result.files.length, 3);

  const filePaths = result.files.map((f) => f.path);
  assert.ok(filePaths.includes('package.json'));
  assert.ok(filePaths.includes(`themes/${sampleProject.projectId}-color-theme.json`));
  assert.ok(filePaths.includes('README.md'));

  // Ensure no plain zip is labeled as vsix
  assert.ok(filePaths.every((p) => !p.endsWith('.vsix')));

  // Check package.json contents
  const pkgFile = result.files.find((f) => f.path === 'package.json');
  assert.ok(pkgFile);
  const pkg = JSON.parse(/** @type {string} */ (pkgFile.content));
  assert.equal(pkg.name, sampleProject.projectId);
  assert.equal(pkg.engines.vscode, `^${VSCODE_SUPPORTED_VERSION}`);
  assert.equal(pkg.contributes.themes[0].path, `./themes/${sampleProject.projectId}-color-theme.json`);
  assert.equal(pkg.contributes.themes[0].uiTheme, 'vs-dark');

  // Check theme JSON contents
  const themeFile = result.files.find((f) => f.path === `themes/${sampleProject.projectId}-color-theme.json`);
  assert.ok(themeFile);
  const themeJson = JSON.parse(/** @type {string} */ (themeFile.content));
  assert.equal(themeJson.$schema, 'vscode://schemas/color-theme');
  assert.equal(themeJson.name, sampleProject.name);
  assert.equal(themeJson.type, 'dark');
  assert.equal(themeJson.colors['editor.background'], sampleProject.tokens.canvas);
  assert.ok(themeJson.tokenColors.length > 0);

  // Check install & remove steps
  assert.ok(result.installSteps.length >= 3);
  assert.ok(result.removeSteps.length >= 2);
});

test('vscodeAdapter: export returns no partial files when validation fails', async () => {
  const badProject = {
    ...sampleProject,
    tokens: {
      ...sampleProject.tokens,
      canvas: 'not-a-color',
    },
  };

  const result = await vsCodeAdapter.export(badProject, VSCODE_SUPPORTED_VERSION);
  assert.equal(result.files.length, 0, 'Must not return partial files on error');
  assert.ok(result.issues.some((i) => i.severity === 'error'));
});

test('vscodeAdapter: deterministic export output across multiple runs', async () => {
  const res1 = await vsCodeAdapter.export(sampleProject, VSCODE_SUPPORTED_VERSION);
  const res2 = await vsCodeAdapter.export(sampleProject, VSCODE_SUPPORTED_VERSION);

  for (let i = 0; i < res1.files.length; i++) {
    assert.equal(res1.files[i].path, res2.files[i].path);
    assert.equal(res1.files[i].content, res2.files[i].content);
  }
});
