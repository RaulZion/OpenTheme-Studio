import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import sample from '../../../contracts/sample.theme.json';
import type { ThemeProject } from '../../../contracts/adapter-api';
import { createNativeArchive, nativeAdapter } from './native-export';

const project = sample as ThemeProject;

describe('G1 native export bridge', () => {
  it.each(['vscode', 'obsidian'] as const)('packages %s native files in an installable folder', async app => {
    const { bytes, fileName, result } = await createNativeArchive(project, app);
    expect(fileName).toBe('midnight-sea-' + app + '-theme.zip');
    expect(result.issues.filter(issue => issue.severity === 'error')).toEqual([]);
    const paths = Object.keys(unzipSync(bytes));
    console.info('G1 ZIP diagnostic', app, 'zip bytes', bytes.length, 'prefix', Array.from(bytes.slice(0, 8)), 'entries', paths.length, 'first', paths.slice(0, 7));
    expect(paths).toHaveLength(3);
    expect(paths.every(path => path.startsWith('midnight-sea' + (app === 'vscode' ? '-0.0.1/' : '/')))).toBe(true);
    expect(nativeAdapter(app).supportedVersions.length).toBeGreaterThan(0);
    const unzipped = unzipSync(bytes);
    if (app === 'vscode') {
      const manifest = JSON.parse(strFromU8(unzipped['midnight-sea-0.0.1/package.json']));
      const theme = JSON.parse(strFromU8(unzipped['midnight-sea-0.0.1/themes/midnight-sea-color-theme.json']));
      expect(manifest.contributes.themes[0].path).toBe('./themes/midnight-sea-color-theme.json');
      expect(theme.colors['editor.background']).toBe(project.tokens.canvas);
    } else {
      const manifest = JSON.parse(strFromU8(unzipped['midnight-sea/manifest.json']));
      const css = strFromU8(unzipped['midnight-sea/theme.css']);
      expect(manifest.name).toBe(project.name);
      expect(css).toContain('--background-primary: ' + project.tokens.canvas);
      expect(css).not.toMatch(/@import|url\s*\(/i);
    }
  });

  it('isolates app-specific overrides in exported native bytes', async () => {
    const modified: ThemeProject = {
      ...project,
      appOverrides: {
        vscode: { 'editor.background': '#123456' },
        obsidian: { '--background-primary': '#789ABC' },
      },
    };
    const vs = unzipSync((await createNativeArchive(modified, 'vscode')).bytes);
    const ob = unzipSync((await createNativeArchive(modified, 'obsidian')).bytes);
    const theme = JSON.parse(strFromU8(vs['midnight-sea-0.0.1/themes/midnight-sea-color-theme.json']));
    const css = strFromU8(ob['midnight-sea/theme.css']);
    expect(theme.colors['editor.background']).toBe('#123456');
    expect(css).toContain('--background-primary: #789ABC;');
    expect(css).not.toContain('--background-primary: #123456;');
  });

  it('never packages unsafe output from invalid project metadata', async () => {
    await expect(createNativeArchive({ ...project, projectId: '../outside' }, 'obsidian')).rejects.toThrow();
    await expect(createNativeArchive({ ...project, tokens: { ...project.tokens, canvas: 'invalid' } }, 'vscode')).rejects.toThrow();
  });

  it('neutralizes CSS comment breakout in user-controlled theme names', async () => {
    const name = 'Night */ body{display:none} /*';
    const result = await createNativeArchive({ ...project, name }, 'obsidian');
    const css = strFromU8(unzipSync(result.bytes)['midnight-sea/theme.css']);
    expect(css).not.toContain('*/ body{display:none}');
    expect(css).toContain('.theme-dark {');
  });
});
