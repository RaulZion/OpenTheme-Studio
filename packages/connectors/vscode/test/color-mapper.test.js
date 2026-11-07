import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  mapWorkbenchColors,
  mapTokenColors,
  resolveEffectiveColor,
  normalizeHex,
} from '../src/color-mapper.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

test('normalizeHex: accepts valid 6-digit hex and converts to uppercase', () => {
  assert.equal(normalizeHex('#1a2b3c'), '#1A2B3C');
  assert.equal(normalizeHex('#FFFFFF'), '#FFFFFF');
  assert.throws(() => normalizeHex('invalid'));
  assert.throws(() => normalizeHex('#123'));
});

test('resolveEffectiveColor: resolves from tokens, syntax, and appOverrides', () => {
  assert.equal(resolveEffectiveColor(sampleProject, 'canvas'), '#171C25');
  assert.equal(resolveEffectiveColor(sampleProject, 'comments'), '#9AAABC');

  const withOverride = {
    ...sampleProject,
    appOverrides: {
      vscode: {
        canvas: '#334455',
      },
    },
  };
  assert.equal(resolveEffectiveColor(withOverride, 'canvas'), '#334455');
});

test('mapWorkbenchColors: produces comprehensive VS Code workbench colors', () => {
  const colors = mapWorkbenchColors(sampleProject);

  assert.equal(typeof colors, 'object');
  assert.equal(colors['editor.background'], '#171C25');
  assert.equal(colors['editor.foreground'], '#F1F3F5');
  assert.equal(colors['activityBar.background'], '#202734');
  assert.equal(colors['sideBar.background'], '#202734');
  assert.equal(colors['statusBar.background'], '#202734');
  assert.equal(colors['focusBorder'], '#91B1F1');
  assert.equal(colors['editorError.foreground'], '#EC8B99');
  assert.equal(colors['editorWarning.foreground'], '#E1BD79');
  assert.ok(Object.keys(colors).length >= 40);
});

test('mapWorkbenchColors: applies VS Code appOverrides with precedence', () => {
  const project = {
    ...sampleProject,
    appOverrides: {
      vscode: {
        'editorCursor.foreground': '#00FF00',
        'editor.background': '#010203',
      },
    },
  };
  const colors = mapWorkbenchColors(project);
  assert.equal(colors['editorCursor.foreground'], '#00FF00');
  assert.equal(colors['editor.background'], '#010203');
});

test('mapTokenColors: maps syntax tokens to editor.tokenColorCustomizations', () => {
  const tokens = mapTokenColors(sampleProject);
  assert.equal(tokens.comments, '#9AAABC');
  assert.equal(tokens.keywords, '#BD9DE8');
  assert.equal(tokens.strings, '#8CC9AD');
  assert.equal(tokens.numbers, '#E1BD79');
  assert.equal(tokens.types, '#91B1F1');
  assert.ok(Array.isArray(tokens.textMateRules));
  assert.ok(tokens.textMateRules.length >= 5);
});
