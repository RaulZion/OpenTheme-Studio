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
  note?: string;
}

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
}

export interface ExportFile {
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
  supportedVersions: readonly string[];
  getControls(project: ThemeProject, targetVersion: string): ThemeControl[];
  validate(project: ThemeProject, targetVersion: string): ValidationIssue[];
  export(project: ThemeProject, targetVersion: string): Promise<ExportResult>;
}

export declare const SEMANTIC_ROLES: readonly SemanticRole[];
export declare const SYNTAX_ROLES: readonly SyntaxRole[];
export declare const PROJECT_ID_REGEX: RegExp;
export declare const APP_ID_REGEX: RegExp;
export declare const OVERRIDE_KEY_REGEX: RegExp;
export declare const CONTROL_CHAR_REGEX: RegExp;
export declare const HEX_COLOR_REGEX: RegExp;

export declare function isValidSlug(slug: string): boolean;
export declare function isValidProjectName(name: string): boolean;
export declare function toSafeSlug(input: string): string;
export declare function getEffectiveColor(project: ThemeProject, appId: string, key: string): string | undefined;

export declare function isValidHexColor(value: unknown): boolean;
export declare function normalizeHexColor(hex: string): string;
export declare function hexToRgb(hex: string): { r: number; g: number; b: number };
export declare function rgbToHex(r: number, g: number, b: number): string;
export declare function relativeLuminance(hex: string): number;
export declare function contrastRatio(hex1: string, hex2: string): number;
export declare function checkContrastIssues(project: ThemeProject): ValidationIssue[];

export declare function validateThemeProject(project: unknown): ValidationIssue[];
export declare function isValidThemeProject(project: unknown): boolean;

export declare function toCanonicalThemeProject(project: ThemeProject): Record<string, unknown>;
export declare function serializeThemeProject(project: ThemeProject): string;
export declare function deserializeThemeProject(raw: string | unknown): { project?: ThemeProject; issues: ValidationIssue[] };

export declare class AdapterRegistry {
  constructor();
  register(adapter: ThemeAdapter): void;
  get(id: string): ThemeAdapter | undefined;
  has(id: string): boolean;
  list(): ThemeAdapter[];
  checkVersionSupport(appId: string, targetVersion: string): { supported: boolean; issue?: ValidationIssue };
}

export declare const defaultRegistry: AdapterRegistry;
