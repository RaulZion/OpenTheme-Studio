import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateThemeProject,
  isValidThemeProject,
  serializeThemeProject,
  deserializeThemeProject,
  isValidHexColor,
  normalizeHexColor,
  hexToRgb,
  rgbToHex,
  relativeLuminance,
  contrastRatio,
  checkContrastIssues,
  toSafeSlug,
  isValidSlug,
  isValidProjectName,
  getEffectiveColor,
  AdapterRegistry,
  defaultRegistry,
} from '../src/index.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

test('validateThemeProject: sample.theme.json is fully valid', () => {
  const issues = validateThemeProject(sampleProject);
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  assert.equal(isValidThemeProject(sampleProject), true);
});

test('validateThemeProject: detects non-object inputs', () => {
  const nonObjects = [null, undefined, 42, 'hello', [], true];
  for (const input of nonObjects) {
    const issues = validateThemeProject(input);
    assert.ok(issues.some((i) => i.code === 'SCHEMA_INVALID_TYPE'));
  }
});

test('validateThemeProject: rejects invalid schemaVersion', () => {
  const bad = { ...sampleProject, schemaVersion: '2.0.0' };
  const issues = validateThemeProject(bad);
  assert.ok(issues.some((i) => i.code === 'SCHEMA_VERSION_INVALID'));
});

test('validateThemeProject: validates projectId pattern', () => {
  const invalidIds = ['123-bad', 'BadName', 'a', 'has_underscore', '-start-dash', 'toolong'.repeat(12)];
  for (const id of invalidIds) {
    const bad = { ...sampleProject, projectId: id };
    const issues = validateThemeProject(bad);
    assert.ok(issues.some((i) => i.code === 'SCHEMA_PROJECT_ID_INVALID'), `Should reject projectId: ${id}`);
  }

  const validIds = ['ocean-dark', 'theme-1', 'a-b-c', 'minimal-123'];
  for (const id of validIds) {
    const good = { ...sampleProject, projectId: id };
    const issues = validateThemeProject(good);
    assert.equal(issues.filter((i) => i.code === 'SCHEMA_PROJECT_ID_INVALID').length, 0);
  }
});

test('validateThemeProject: validates project name constraints', () => {
  // Empty
  assert.ok(validateThemeProject({ ...sampleProject, name: '' }).some((i) => i.code === 'SCHEMA_NAME_LENGTH'));
  // Whitespace only
  assert.ok(validateThemeProject({ ...sampleProject, name: '    ' }).some((i) => i.code === 'SCHEMA_NAME_EMPTY'));
  // Control characters
  assert.ok(validateThemeProject({ ...sampleProject, name: 'Bad\u0000Name' }).some((i) => i.code === 'SCHEMA_NAME_CONTROL_CHARS'));
  assert.ok(validateThemeProject({ ...sampleProject, name: 'Esc\u001bName' }).some((i) => i.code === 'SCHEMA_NAME_CONTROL_CHARS'));
  // Over 100 chars
  assert.ok(validateThemeProject({ ...sampleProject, name: 'A'.repeat(101) }).some((i) => i.code === 'SCHEMA_NAME_LENGTH'));
  // Valid name
  assert.equal(isValidProjectName('Cool Dark & Light Theme 123!'), true);
  assert.equal(isValidProjectName('\t\n'), false);
});

test('validateThemeProject: validates mode enum', () => {
  assert.ok(validateThemeProject({ ...sampleProject, mode: 'sepia' }).some((i) => i.code === 'SCHEMA_MODE_INVALID'));
  assert.ok(isValidThemeProject({ ...sampleProject, mode: 'light' }));
  assert.ok(isValidThemeProject({ ...sampleProject, mode: 'dark' }));
});

test('validateThemeProject: validates required semantic tokens and rejects extra tokens', () => {
  // Missing canvas
  const missingCanvas = { ...sampleProject, tokens: { ...sampleProject.tokens } };
  delete missingCanvas.tokens.canvas;
  assert.ok(validateThemeProject(missingCanvas).some((i) => i.code === 'SCHEMA_TOKEN_MISSING'));

  // Invalid hex format
  const badHex = { ...sampleProject, tokens: { ...sampleProject.tokens, canvas: '#123' } };
  assert.ok(validateThemeProject(badHex).some((i) => i.code === 'SCHEMA_TOKEN_COLOR_INVALID'));

  // Extra unknown token
  const extraToken = { ...sampleProject, tokens: { ...sampleProject.tokens, extraRole: '#112233' } };
  assert.ok(validateThemeProject(extraToken).some((i) => i.code === 'SCHEMA_TOKENS_UNEXPECTED_PROPERTY'));

  // Extra unknown root property
  const extraRoot = { ...sampleProject, hackerPayload: 'malicious' };
  assert.ok(validateThemeProject(extraRoot).some((i) => i.code === 'SCHEMA_UNEXPECTED_PROPERTY'));
});

test('validateThemeProject: validates syntax and appOverrides', () => {
  // Valid syntax
  const validSyntax = {
    ...sampleProject,
    syntax: { comments: '#112233', keywords: '#445566' },
  };
  assert.ok(isValidThemeProject(validSyntax));

  // Invalid syntax role
  const badSyntax = {
    ...sampleProject,
    syntax: { invalidRole: '#112233' },
  };
  assert.ok(validateThemeProject(badSyntax).some((i) => i.code === 'SCHEMA_SYNTAX_UNEXPECTED_PROPERTY'));

  // Invalid appOverrides key
  const badOverride = {
    ...sampleProject,
    appOverrides: {
      obsidian: {
        'invalid override key with spaces!': '#112233',
      },
    },
  };
  assert.ok(validateThemeProject(badOverride).some((i) => i.code === 'SCHEMA_OVERRIDE_KEY_INVALID'));

  // Valid appOverrides CSS variable format and dotted format
  const goodOverride = {
    ...sampleProject,
    appOverrides: {
      obsidian: { '--background-primary': '#112233' },
      vscode: { 'editor.background': '#112233' },
    },
  };
  assert.ok(isValidThemeProject(goodOverride));
});

test('color utilities: hex conversions and normalization', () => {
  assert.equal(isValidHexColor('#1A2B3C'), true);
  assert.equal(isValidHexColor('#1a2b3c'), true);
  assert.equal(isValidHexColor('#123'), false);
  assert.equal(isValidHexColor('1a2b3c'), false);
  assert.equal(isValidHexColor('#GGGGGG'), false);

  assert.equal(normalizeHexColor('#1a2b3c'), '#1A2B3C');
  assert.throws(() => normalizeHexColor('bad'));

  const rgb = hexToRgb('#FF8000');
  assert.deepEqual(rgb, { r: 255, g: 128, b: 0 });
  assert.equal(rgbToHex(255, 128, 0), '#FF8000');
});

test('color utilities: luminance and contrast calculation', () => {
  assert.equal(relativeLuminance('#000000'), 0);
  assert.equal(relativeLuminance('#FFFFFF'), 1);

  const whiteOnBlack = contrastRatio('#FFFFFF', '#000000');
  assert.equal(whiteOnBlack, 21);

  const same = contrastRatio('#123456', '#123456');
  assert.equal(same, 1);

  // Low contrast detection
  const lowContrastProject = {
    ...sampleProject,
    tokens: {
      ...sampleProject.tokens,
      canvas: '#202020',
      text: '#222222', // very low contrast against canvas
    },
  };
  const issues = checkContrastIssues(lowContrastProject);
  assert.ok(issues.some((i) => i.code === 'CONTRAST_LOW_TEXT_CANVAS'));
});

test('slug helper: toSafeSlug produces valid slugs', () => {
  assert.equal(toSafeSlug('My Cool Theme!'), 'my-cool-theme');
  assert.equal(toSafeSlug('  123 Number Start  '), 'theme-123-number-start');
  assert.equal(toSafeSlug('Café & Thé'), 'cafe-the');
  assert.equal(toSafeSlug('A'), 'a-theme');
  assert.equal(isValidSlug(toSafeSlug('My Cool Theme!')), true);
  assert.equal(isValidSlug(toSafeSlug('123')), true);
  assert.equal(isValidSlug(toSafeSlug('A'.repeat(100))), true);
});

test('effective color resolution respects app overrides', () => {
  const project = {
    ...sampleProject,
    tokens: { ...sampleProject.tokens, canvas: '#111111' },
    syntax: { comments: '#222222' },
    appOverrides: {
      vscode: { canvas: '#333333' },
    },
  };

  // vscode override takes precedence
  assert.equal(getEffectiveColor(project, 'vscode', 'canvas'), '#333333');
  // obsidian has no override, falls back to token
  assert.equal(getEffectiveColor(project, 'obsidian', 'canvas'), '#111111');
  // syntax role resolution
  assert.equal(getEffectiveColor(project, 'vscode', 'comments'), '#222222');
});

test('deterministic serialization: stable byte-for-byte output regardless of key insertion order', () => {
  const p1 = {
    appOverrides: {
      obsidian: { '--background-primary': '#171c25' },
    },
    syntax: {
      types: '#91b1f1',
      comments: '#9aaabc',
    },
    tokens: {
      success: '#8CC9AD',
      canvas: '#171c25',
      surface: '#202734',
      surfaceRaised: '#303A4B',
      text: '#F1F3F5',
      textMuted: '#ACBBCB',
      border: '#495568',
      accent: '#91B1F1',
      accentText: '#101723',
      selection: '#48698F',
      error: '#EC8B99',
      warning: '#E1BD79',
    },
    mode: 'dark',
    name: 'Midnight Sea',
    projectId: 'midnight-sea',
    schemaVersion: '1.0.0',
  };

  const p2 = {
    schemaVersion: '1.0.0',
    projectId: 'midnight-sea',
    name: 'Midnight Sea',
    mode: 'dark',
    tokens: {
      canvas: '#171C25',
      surface: '#202734',
      surfaceRaised: '#303A4B',
      text: '#F1F3F5',
      textMuted: '#ACBBCB',
      border: '#495568',
      accent: '#91B1F1',
      accentText: '#101723',
      selection: '#48698F',
      error: '#EC8B99',
      warning: '#E1BD79',
      success: '#8CC9AD',
    },
    syntax: {
      comments: '#9AAABC',
      types: '#91B1F1',
    },
    appOverrides: {
      obsidian: { '--background-primary': '#171C25' },
    },
  };

  const s1 = serializeThemeProject(p1);
  const s2 = serializeThemeProject(p2);
  assert.equal(s1, s2);
  assert.ok(s1.endsWith('\n'));

  // Deserialization round-trip
  const { project, issues } = deserializeThemeProject(s1);
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  assert.ok(project);
  assert.equal(project.projectId, 'midnight-sea');
});

test('deserializeThemeProject: handles invalid JSON gracefully', () => {
  const res = deserializeThemeProject('{ invalid json');
  assert.equal(res.project, undefined);
  assert.ok(res.issues.some((i) => i.code === 'JSON_PARSE_ERROR'));
});

test('AdapterRegistry: registers, lists, and checks version support', () => {
  const registry = new AdapterRegistry();
  const mockAdapter = {
    id: 'vscode',
    displayName: 'Visual Studio Code',
    supportedVersions: ['1.144.0'],
    getControls: () => [],
    validate: () => [],
    export: async () => ({ files: [], issues: [], installSteps: [], removeSteps: [] }),
  };

  registry.register(mockAdapter);
  assert.equal(registry.has('vscode'), true);
  assert.equal(registry.get('vscode'), mockAdapter);
  assert.equal(registry.list().length, 1);

  // Check version support
  const supported = registry.checkVersionSupport('vscode', '1.144.0');
  assert.equal(supported.supported, true);

  const unsupportedVer = registry.checkVersionSupport('vscode', '1.99.0');
  assert.equal(unsupportedVer.supported, false);
  assert.equal(unsupportedVer.issue?.code, 'ADAPTER_VERSION_UNSUPPORTED');

  const unsupportedApp = registry.checkVersionSupport('unknown-app', '1.0.0');
  assert.equal(unsupportedApp.supported, false);
  assert.equal(unsupportedApp.issue?.code, 'ADAPTER_NOT_FOUND');
});
