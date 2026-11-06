import type {
  ThemeAdapter,
  ThemeProject,
  ThemeControl,
  ValidationIssue,
  ExportResult,
} from '@opentheme/core';

export declare const VSCODE_SUPPORTED_VERSION: '1.144.0';

export declare function getVSCodeControls(project: ThemeProject): ThemeControl[];
export declare function validateVSCode(project: ThemeProject, targetVersion: string): ValidationIssue[];
export declare function buildVSCodeThemeJson(project: ThemeProject): Record<string, unknown>;
export declare function buildVSCodePackageJson(project: ThemeProject): Record<string, unknown>;
export declare function buildVSCodeReadme(project: ThemeProject): string;

export declare const vsCodeAdapter: ThemeAdapter;
