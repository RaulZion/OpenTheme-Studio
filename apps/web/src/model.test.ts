import { describe, expect, it } from 'vitest';
import sample from '../../../contracts/sample.theme.json';
import type { ThemeProject } from '../../../contracts/adapter-api';
import { commit, createHistory, parseProject, redo, resetApp, serializeProject, setColor, undo } from './model';

const fixture = () => structuredClone(sample) as ThemeProject;

describe('portable document editing', () => {
  it('edits a shared role without altering existing app overrides or original', () => {
    const before = fixture();
    const after = setColor(before, { scope: 'shared', collection: 'tokens', key: 'accent' }, '#123456');
    expect(after.tokens.accent).toBe('#123456');
    expect(after.appOverrides).toEqual(before.appOverrides);
    expect(before.tokens.accent).toBe('#91B1F1');
  });
  it('isolates an Obsidian override from globals and VS Code', () => {
    const before = fixture();
    before.appOverrides!.vscode = { 'editor.background': '#112233' };
    const after = setColor(before, { scope: 'app', appId: 'obsidian', key: '--background-primary' }, '#334455');
    expect(after.appOverrides!.obsidian!['--background-primary']).toBe('#334455');
    expect(after.tokens).toEqual(before.tokens);
    expect(after.appOverrides!.vscode).toEqual(before.appOverrides!.vscode);
    expect(before.appOverrides!.obsidian!['--background-primary']).toBe('#171C25');
  });
  it('resets only the selected app', () => {
    const before = fixture();
    before.appOverrides!.vscode = { 'editor.background': '#112233' };
    expect(resetApp(before, 'obsidian').appOverrides).toEqual({ vscode: { 'editor.background': '#112233' } });
  });
  it('rejects invalid color changes', () => {
    expect(() => setColor(fixture(), { scope: 'shared', collection: 'tokens', key: 'canvas' }, 'red')).toThrow(/six-digit/i);
  });
});

describe('history', () => {
  it('undoes and redoes whole documents, discarding redo after a new edit', () => {
    const first = fixture();
    const next = { ...first, name: 'Changed' };
    const history = commit(createHistory(first), next);
    expect(undo(history).present).toEqual(first);
    expect(redo(undo(history)).present).toEqual(next);
    const branch = commit(undo(history), { ...first, name: 'New branch' });
    expect(branch.future).toEqual([]);
    expect(branch.present.name).toBe('New branch');
  });
  it('ignores no-op changes and bounds document history', () => {
    let history = createHistory(fixture());
    expect(commit(history, structuredClone(history.present))).toBe(history);
    for (let i = 0; i < 125; i++) history = commit(history, { ...history.present, name: `Theme ${i}` });
    expect(history.past).toHaveLength(100);
  });
});

describe('canonical schema import', () => {
  it('round trips the canonical fixture exactly', () => {
    expect(parseProject(serializeProject(fixture()))).toEqual(fixture());
  });
  it('preserves unknown safe adapter overrides for future integrations', () => {
    const data = { ...fixture(), appOverrides: { 'future-app': { 'custom.role': '#123456' } } };
    expect(JSON.parse(serializeProject(parseProject(JSON.stringify(data))))).toEqual(data);
  });
  it.each([
    ['unknown version', { ...fixture(), schemaVersion: '2.0.0' }],
    ['unknown root key', { ...fixture(), executable: 'run' }],
    ['invalid color', { ...fixture(), tokens: { ...fixture().tokens, canvas: 'url(https://x)' } }],
    ['empty name', { ...fixture(), name: '   ' }],
    ['unsafe id', { ...fixture(), projectId: '../theme' }],
    ['unsafe override', { ...fixture(), appOverrides: { obsidian: { '../unsafe': '#123456' } } }],
    ['missing role', { ...fixture(), tokens: { canvas: '#123456' } }],
    ['invalid syntax', { ...fixture(), syntax: { executable: '#123456' } }],
    ['null', null],
  ])('rejects %s with a readable error', (_name, input) => {
    expect(() => parseProject(JSON.stringify(input))).toThrow(/project/i);
  });
  it('rejects malformed JSON and oversized files', () => {
    expect(() => parseProject('{')).toThrow(/JSON/i);
    expect(() => parseProject(' '.repeat(1_048_577))).toThrow(/1 MB/i);
  });
});
