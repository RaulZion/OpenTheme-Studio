/** Normative G0 TypeScript boundary. No runtime implementation here. */
export type AppId = 'vscode' | 'obsidian' | 'blender';
export type Severity = 'warning' | 'error';
export type SemanticRole =
  | 'canvas' | 'surface' | 'surfaceRaised' | 'text' | 'textMuted'
  | 'border' | 'accent' | 'accentText' | 'selection'
  | 'error' | 'warning' | 'success';
export type SyntaxRole = 'comments' | 'keywords' | 'strings' | 'numbers' | 'types';

export interface ThemeProject {
  schemaVersion: '1.0.0';
  projectId: string;
  name: string;
  mode: 'light' | 'dark';
  tokens: Record<SemanticRole, string>;
  syntax?: Partial<Record<SyntaxRole, string>>;
  appOverrides?: Partial<Record<AppId, Record<string, string>>>;
}

export type ColorBinding =
  | { scope: 'shared'; collection: 'tokens'; key: SemanticRole }
  | { scope: 'shared'; collection: 'syntax'; key: SyntaxRole }
  | { scope: 'app'; appId: AppId; key: string };

export interface ThemeControl {
  id: string;
  label: string;
  group: string;
  binding: ColorBinding;
  supported: boolean;
  /** Human-readable explanation when supported=false or preview differs. */
  note?: string;
}

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
}

export interface ExportFile {
  /** Relative POSIX path, never absolute or traversal, including within ZIPs. */
  path: string;
  content: string | Uint8Array;
  mimeType: string;
}

export interface ExportResult {
  files: ExportFile[];
  issues: ValidationIssue[];
  installSteps: string[];
  removeSteps: string[];
}

export interface ThemeAdapter {
  id: AppId;
  displayName: string;
  /** Explicit exact versions verified as declared targets, not wildcard promises. */
  supportedVersions: readonly string[];
  getControls(project: ThemeProject, targetVersion: string): ThemeControl[];
  validate(project: ThemeProject, targetVersion: string): ValidationIssue[];
  /** Reject without returning partial files if validation has error issues. */
  export(project: ThemeProject, targetVersion: string): Promise<ExportResult>;
}
