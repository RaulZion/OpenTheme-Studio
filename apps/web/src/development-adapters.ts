import type { ColorBinding, SemanticRole, SyntaxRole, ThemeAdapter, ThemeControl, ThemeProject } from '../../../contracts/adapter-api';
import targets from '../../../contracts/targets.json';

export type EditorApp = 'vscode' | 'obsidian';
export interface Region {
  role: SemanticRole;
  label: string;
  description: string;
  keys: Record<EditorApp, string>;
}

// Development-only preview mappings. These are not verified exporter capabilities.
export const regions: Region[] = [
  { role: 'canvas', label: 'Editor background', description: 'The quiet foundation behind your code or notes.', keys: { vscode: 'editor.background', obsidian: '--background-primary' } },
  { role: 'surface', label: 'Sidebar background', description: 'The background of navigation and supporting panels.', keys: { vscode: 'sideBar.background', obsidian: '--background-secondary' } },
  { role: 'surfaceRaised', label: 'Raised surface', description: 'Tabs, elevated panels, and secondary surfaces.', keys: { vscode: 'tab.inactiveBackground', obsidian: '--background-modifier-hover' } },
  { role: 'text', label: 'Primary text', description: 'Main content, headings, and readable body text.', keys: { vscode: 'editor.foreground', obsidian: '--text-normal' } },
  { role: 'textMuted', label: 'Secondary text', description: 'Supporting text, navigation labels, and subtle details.', keys: { vscode: 'descriptionForeground', obsidian: '--text-muted' } },
  { role: 'border', label: 'Borders', description: 'The subtle lines that separate your workspace.', keys: { vscode: 'panel.border', obsidian: '--background-modifier-border' } },
  { role: 'accent', label: 'Accent', description: 'Links, active elements, and a little personality.', keys: { vscode: 'textLink.foreground', obsidian: '--interactive-accent' } },
  { role: 'accentText', label: 'Text on accent', description: 'Text that sits on an accent-colored background.', keys: { vscode: 'button.foreground', obsidian: '--text-on-accent' } },
  { role: 'selection', label: 'Selection', description: 'A highlight for selected text and focused content.', keys: { vscode: 'editor.selectionBackground', obsidian: '--text-selection' } },
  { role: 'error', label: 'Error', description: 'Feedback that needs your attention.', keys: { vscode: 'editorError.foreground', obsidian: '--text-error' } },
  { role: 'warning', label: 'Warning', description: 'A gentle signal to take a closer look.', keys: { vscode: 'editorWarning.foreground', obsidian: '--text-warning' } },
  { role: 'success', label: 'Success', description: 'Positive feedback and completed actions.', keys: { vscode: 'testing.iconPassed', obsidian: '--text-success' } },
];
export const syntaxRoles: SyntaxRole[] = ['comments', 'keywords', 'strings', 'numbers', 'types'];
export const appNames = { vscode: 'VS Code', obsidian: 'Obsidian' };
export const targetVersion = (app: EditorApp) => targets.g1.find(target => target.id === app)!.version;
export const effectiveColor = (project: ThemeProject, app: EditorApp, region: Region) =>
  project.appOverrides?.[app]?.[region.keys[app]] ?? project.tokens[region.role];
export const regionBinding = (app: EditorApp, region: Region, scope: 'shared' | 'app'): ColorBinding => scope === 'app'
  ? { scope: 'app', appId: app, key: region.keys[app] }
  : { scope: 'shared', collection: 'tokens', key: region.role };

export function developmentAdapter(app: EditorApp): ThemeAdapter {
  return {
    id: app,
    displayName: `${appNames[app]} — development placeholder`,
    supportedVersions: [],
    getControls(_project, version): ThemeControl[] {
      if (version !== targetVersion(app)) return [];
      return regions.map(region => ({
        id: region.role, label: region.label, group: 'Illustrative preview',
        binding: regionBinding(app, region, 'shared'), supported: true,
        note: 'Editable in this development preview only. Native mapping and appearance are unverified.',
      }));
    },
    validate() { return [{ severity: 'error', code: 'DEVELOPMENT_PLACEHOLDER', message: 'Native export is not available. The production adapter has not been integrated.' }]; },
    async export() { throw new Error('Native export unavailable: development placeholder returns no files or installation instructions.'); },
  };
}
