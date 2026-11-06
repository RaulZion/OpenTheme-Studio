import type {
  ThemeAdapter,
  ThemeProject,
  ThemeControl,
  ValidationIssue,
  ExportResult,
} from '@opentheme/core';

export declare const OBSIDIAN_SUPPORTED_VERSION: '1.15.0';

export declare function getObsidianControls(project: ThemeProject): ThemeControl[];
export declare function validateObsidian(project: ThemeProject, targetVersion: string): ValidationIssue[];
export declare function buildObsidianThemeCss(project: ThemeProject): string;
export declare function buildObsidianManifestJson(project: ThemeProject): Record<string, unknown>;
export declare function buildObsidianReadme(project: ThemeProject): string;

export declare const obsidianAdapter: ThemeAdapter;
