import { expect, it } from 'vitest';
import { developmentAdapter, effectiveColor, regions, targetVersion } from './development-adapters';
import { starter } from './presets';

it.each(['vscode', 'obsidian'] as const)('%s placeholder cannot produce or claim native exports', async app => {
  const adapter = developmentAdapter(app);
  expect(adapter.supportedVersions).toEqual([]);
  expect(adapter.validate(starter, targetVersion(app))).toEqual([expect.objectContaining({ severity: 'error', code: 'DEVELOPMENT_PLACEHOLDER' })]);
  await expect(adapter.export(starter, targetVersion(app))).rejects.toThrow(/Native export unavailable/);
  expect(adapter.getControls(starter, 'unknown')).toEqual([]);
  expect(adapter.getControls(starter, targetVersion(app))).toHaveLength(12);
});

it('uses only the chosen app override when resolving preview colors', () => {
  const project = { ...starter, appOverrides: { obsidian: { '--background-primary': '#123456' } } };
  expect(effectiveColor(project, 'obsidian', regions[0])).toBe('#123456');
  expect(effectiveColor(project, 'vscode', regions[0])).toBe(project.tokens.canvas);
});
