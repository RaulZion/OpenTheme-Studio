/**
 * Color mapping from canonical OpenTheme Studio ThemeProject to VS Code
 * workbench.colorCustomizations and editor.tokenColorCustomizations.
 */

import { HEX_COLOR_REGEX } from './validator.js';

/**
 * Normalizes a hex color to uppercase #RRGGBB.
 * @param {string} hex
 * @returns {string}
 */
export function normalizeHex(hex) {
  if (typeof hex !== 'string' || !HEX_COLOR_REGEX.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return hex.toUpperCase();
}

/**
 * Resolves the effective color for a given role or key in VS Code context.
 * Precedence:
 * 1. project.appOverrides.vscode[role]
 * 2. project.syntax[role]
 * 3. project.tokens[role]
 *
 * @param {any} project
 * @param {string} role
 * @returns {string}
 */
export function resolveEffectiveColor(project, role) {
  if (project.appOverrides?.vscode && typeof project.appOverrides.vscode[role] === 'string') {
    return normalizeHex(project.appOverrides.vscode[role]);
  }
  if (project.syntax && typeof project.syntax[role] === 'string') {
    return normalizeHex(project.syntax[role]);
  }
  if (project.tokens && typeof project.tokens[role] === 'string') {
    return normalizeHex(project.tokens[role]);
  }
  throw new Error(`Could not resolve role: ${role}`);
}

/**
 * Maps a ThemeProject to a dictionary of VS Code workbench color IDs.
 * @param {any} project
 * @returns {Record<string, string>}
 */
export function mapWorkbenchColors(project) {
  const c = (role) => resolveEffectiveColor(project, role);

  const canvas = c('canvas');
  const surface = c('surface');
  const surfaceRaised = c('surfaceRaised');
  const text = c('text');
  const textMuted = c('textMuted');
  const border = c('border');
  const accent = c('accent');
  const accentText = c('accentText');
  const selection = c('selection');
  const error = c('error');
  const warning = c('warning');
  const success = c('success');

  /** @type {Record<string, string>} */
  const colors = {
    // Editor & Base
    'focusBorder': accent,
    'foreground': text,
    'editor.background': canvas,
    'editor.foreground': text,
    'editorLineNumber.foreground': textMuted,
    'editorLineNumber.activeForeground': text,
    'editorCursor.foreground': accent,
    'editor.selectionBackground': selection,
    'editor.inactiveSelectionBackground': selection,
    'editor.selectionHighlightBackground': selection,
    'editor.wordHighlightBackground': surfaceRaised,
    'editor.findMatchBackground': accent,
    'editor.findMatchHighlightBackground': surfaceRaised,

    // Activity Bar
    'activityBar.background': surface,
    'activityBar.foreground': text,
    'activityBar.inactiveForeground': textMuted,
    'activityBar.border': border,
    'activityBarBadge.background': accent,
    'activityBarBadge.foreground': accentText,

    // Side Bar
    'sideBar.background': surface,
    'sideBar.foreground': text,
    'sideBar.border': border,
    'sideBarTitle.foreground': text,
    'sideBarSectionHeader.background': surfaceRaised,
    'sideBarSectionHeader.foreground': text,
    'sideBarSectionHeader.border': border,

    // Title Bar & Tabs
    'titleBar.activeBackground': surfaceRaised,
    'titleBar.activeForeground': text,
    'titleBar.inactiveBackground': surface,
    'titleBar.inactiveForeground': textMuted,
    'titleBar.border': border,
    'editorGroupHeader.tabsBackground': surface,
    'editorGroupHeader.tabsBorder': border,
    'tab.activeBackground': canvas,
    'tab.activeForeground': text,
    'tab.inactiveBackground': surface,
    'tab.inactiveForeground': textMuted,
    'tab.border': border,
    'tab.activeBorderTop': accent,

    // Status Bar
    'statusBar.background': surface,
    'statusBar.foreground': text,
    'statusBar.border': border,
    'statusBar.noFolderBackground': surface,
    'statusBar.debuggingBackground': surfaceRaised,
    'statusBarItem.remoteBackground': accent,
    'statusBarItem.remoteForeground': accentText,

    // Widgets & Panels
    'editorWidget.background': surfaceRaised,
    'editorWidget.border': border,
    'editorHoverWidget.background': surfaceRaised,
    'editorHoverWidget.border': border,
    'panel.background': canvas,
    'panel.border': border,
    'panelTitle.activeForeground': text,
    'panelTitle.inactiveForeground': textMuted,

    // Inputs & Buttons
    'input.background': surfaceRaised,
    'input.foreground': text,
    'input.border': border,
    'input.placeholderForeground': textMuted,
    'button.background': accent,
    'button.foreground': accentText,
    'button.hoverBackground': accent,
    'badge.background': accent,
    'badge.foreground': accentText,

    // Lists
    'list.activeSelectionBackground': selection,
    'list.activeSelectionForeground': text,
    'list.inactiveSelectionBackground': surfaceRaised,
    'list.inactiveSelectionForeground': text,
    'list.hoverBackground': surfaceRaised,
    'list.highlightForeground': accent,

    // Status & Diagnostics
    'errorForeground': error,
    'editorError.foreground': error,
    'editorWarning.foreground': warning,
    'editorInfo.foreground': accent,
    'gitDecoration.modifiedResourceForeground': warning,
    'gitDecoration.deletedResourceForeground': error,
    'gitDecoration.addedResourceForeground': success,
  };

  // Explicit appOverrides for VS Code take precedence
  if (project.appOverrides?.vscode) {
    for (const [key, val] of Object.entries(project.appOverrides.vscode)) {
      if (typeof val === 'string' && HEX_COLOR_REGEX.test(val)) {
        colors[key] = normalizeHex(val);
      }
    }
  }

  // Sort keys deterministically
  const sorted = {};
  for (const k of Object.keys(colors).sort()) {
    sorted[k] = colors[k];
  }
  return sorted;
}

/**
 * Maps a ThemeProject syntax roles to VS Code editor.tokenColorCustomizations.
 * @param {any} project
 * @returns {Record<string, unknown>}
 */
export function mapTokenColors(project) {
  const norm = (hex) => normalizeHex(hex);
  const textMuted = norm(project.tokens.textMuted);
  const accent = norm(project.tokens.accent);
  const success = norm(project.tokens.success);
  const warning = norm(project.tokens.warning);
  const text = norm(project.tokens.text);

  const commentColor = project.syntax?.comments ? norm(project.syntax.comments) : textMuted;
  const keywordColor = project.syntax?.keywords ? norm(project.syntax.keywords) : accent;
  const stringColor = project.syntax?.strings ? norm(project.syntax.strings) : success;
  const numberColor = project.syntax?.numbers ? norm(project.syntax.numbers) : warning;
  const typeColor = project.syntax?.types ? norm(project.syntax.types) : accent;

  return {
    comments: commentColor,
    keywords: keywordColor,
    strings: stringColor,
    numbers: numberColor,
    types: typeColor,
    textMateRules: [
      {
        scope: ['comment', 'punctuation.definition.comment'],
        settings: { foreground: commentColor },
      },
      {
        scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
        settings: { foreground: keywordColor },
      },
      {
        scope: ['string', 'string.quoted', 'punctuation.definition.string'],
        settings: { foreground: stringColor },
      },
      {
        scope: ['constant.numeric', 'constant.language', 'constant.character'],
        settings: { foreground: numberColor },
      },
      {
        scope: ['entity.name.type', 'support.type', 'support.class'],
        settings: { foreground: typeColor },
      },
      {
        scope: ['variable', 'entity.name.variable'],
        settings: { foreground: text },
      },
    ],
  };
}
