/**
 * Visual Studio Code 1.144.0 stable theme adapter for OpenTheme Studio.
 * Follows official VS Code Color Theme Extension API:
 * https://code.visualstudio.com/api/extension-guides/color-theme
 * https://code.visualstudio.com/api/references/theme-color
 */

import {
  validateThemeProject,
  checkContrastIssues,
  normalizeHexColor,
  isValidHexColor,
  getEffectiveColor,
} from '../../../core/src/index.js';

export const VSCODE_SUPPORTED_VERSION = '1.144.0';

/**
 * Builds the VS Code ThemeControls list for inspector/UI.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {import('../../../contracts/adapter-api.js').ThemeControl[]}
 */
export function getVSCodeControls(project) {
  return [
    {
      id: 'vscode.editor.canvas',
      label: 'Editor Background',
      group: 'Editor',
      binding: { scope: 'shared', collection: 'tokens', key: 'canvas' },
      supported: true,
    },
    {
      id: 'vscode.editor.text',
      label: 'Editor Text',
      group: 'Editor',
      binding: { scope: 'shared', collection: 'tokens', key: 'text' },
      supported: true,
    },
    {
      id: 'vscode.editor.textMuted',
      label: 'Line Numbers & Inactive',
      group: 'Editor',
      binding: { scope: 'shared', collection: 'tokens', key: 'textMuted' },
      supported: true,
    },
    {
      id: 'vscode.editor.accent',
      label: 'Cursor & Highlights',
      group: 'Editor',
      binding: { scope: 'shared', collection: 'tokens', key: 'accent' },
      supported: true,
    },
    {
      id: 'vscode.editor.selection',
      label: 'Text Selection',
      group: 'Editor',
      binding: { scope: 'shared', collection: 'tokens', key: 'selection' },
      supported: true,
    },
    {
      id: 'vscode.activityBar.surface',
      label: 'Activity Bar Background',
      group: 'Activity Bar',
      binding: { scope: 'shared', collection: 'tokens', key: 'surface' },
      supported: true,
    },
    {
      id: 'vscode.sideBar.surface',
      label: 'Side Bar Background',
      group: 'Side Bar',
      binding: { scope: 'shared', collection: 'tokens', key: 'surface' },
      supported: true,
    },
    {
      id: 'vscode.sideBar.surfaceRaised',
      label: 'Side Bar Header Background',
      group: 'Side Bar',
      binding: { scope: 'shared', collection: 'tokens', key: 'surfaceRaised' },
      supported: true,
    },
    {
      id: 'vscode.titleBar.surface',
      label: 'Title Bar Background',
      group: 'Title Bar & Tabs',
      binding: { scope: 'shared', collection: 'tokens', key: 'surface' },
      supported: true,
    },
    {
      id: 'vscode.tab.active',
      label: 'Active Tab Background',
      group: 'Title Bar & Tabs',
      binding: { scope: 'shared', collection: 'tokens', key: 'canvas' },
      supported: true,
    },
    {
      id: 'vscode.tab.border',
      label: 'Tab & Container Border',
      group: 'Title Bar & Tabs',
      binding: { scope: 'shared', collection: 'tokens', key: 'border' },
      supported: true,
    },
    {
      id: 'vscode.statusBar.surface',
      label: 'Status Bar Background',
      group: 'Status Bar',
      binding: { scope: 'shared', collection: 'tokens', key: 'surface' },
      supported: true,
    },
    {
      id: 'vscode.button.accent',
      label: 'Button Background',
      group: 'Controls & Inputs',
      binding: { scope: 'shared', collection: 'tokens', key: 'accent' },
      supported: true,
    },
    {
      id: 'vscode.button.accentText',
      label: 'Button Text',
      group: 'Controls & Inputs',
      binding: { scope: 'shared', collection: 'tokens', key: 'accentText' },
      supported: true,
    },
    {
      id: 'vscode.syntax.comments',
      label: 'Code Comments',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'comments' },
      supported: true,
    },
    {
      id: 'vscode.syntax.keywords',
      label: 'Code Keywords',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'keywords' },
      supported: true,
    },
    {
      id: 'vscode.syntax.strings',
      label: 'Code Strings',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'strings' },
      supported: true,
    },
    {
      id: 'vscode.syntax.numbers',
      label: 'Code Numbers',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'numbers' },
      supported: true,
    },
    {
      id: 'vscode.syntax.types',
      label: 'Code Types',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'types' },
      supported: true,
    },
  ];
}

/**
 * Validates a theme project for the VS Code 1.144.0 adapter.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @param {string} targetVersion
 * @returns {import('../../../contracts/adapter-api.js').ValidationIssue[]}
 */
export function validateVSCode(project, targetVersion) {
  /** @type {import('../../../contracts/adapter-api.js').ValidationIssue[]} */
  const issues = [];

  // Version check
  if (targetVersion !== VSCODE_SUPPORTED_VERSION) {
    issues.push({
      severity: 'error',
      code: 'VSCODE_UNSUPPORTED_VERSION',
      message: `VS Code adapter only supports target version "${VSCODE_SUPPORTED_VERSION}", received "${targetVersion}"`,
      path: 'targetVersion',
    });
  }

  // Schema check
  const schemaIssues = validateThemeProject(project);
  issues.push(...schemaIssues);

  if (!project || typeof project !== 'object') {
    return issues;
  }

  // Safe path validation for projectId
  if (project.projectId) {
    if (project.projectId.includes('..') || project.projectId.includes('/') || project.projectId.includes('\\')) {
      issues.push({
        severity: 'error',
        code: 'VSCODE_UNSAFE_PROJECT_ID',
        message: `projectId contains dangerous path characters: "${project.projectId}"`,
        path: 'projectId',
      });
    }
  }

  // AppOverrides validation for VS Code
  if (project.appOverrides?.vscode) {
    const overrides = project.appOverrides.vscode;
    for (const [key, val] of Object.entries(overrides)) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        issues.push({
          severity: 'error',
          code: 'VSCODE_INVALID_OVERRIDE_KEY',
          message: `VS Code override key "${key}" contains invalid characters. Must be a valid dotted theme color ID.`,
          path: `appOverrides.vscode.${key}`,
        });
      }
      if (!isValidHexColor(val)) {
        issues.push({
          severity: 'error',
          code: 'VSCODE_INVALID_OVERRIDE_COLOR',
          message: `VS Code override color for "${key}" is not a valid 6-digit hex color: "${val}"`,
          path: `appOverrides.vscode.${key}`,
        });
      }
    }
  }

  // Contrast warnings
  const contrastWarnings = checkContrastIssues(project);
  issues.push(...contrastWarnings);

  return issues;
}

/**
 * Builds the VS Code native color theme dictionary.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {Record<string, unknown>}
 */
export function buildVSCodeThemeJson(project) {
  const norm = (hex) => normalizeHexColor(hex);
  const color = (role) => norm(getEffectiveColor(project, 'vscode', role));

  const canvas = color('canvas');
  const surface = color('surface');
  const surfaceRaised = color('surfaceRaised');
  const text = color('text');
  const textMuted = color('textMuted');
  const border = color('border');
  const accent = color('accent');
  const accentText = color('accentText');
  const selection = color('selection');
  const error = color('error');
  const warning = color('warning');
  const success = color('success');

  /** @type {Record<string, string>} */
  const workbenchColors = {
    // Base & Editor
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

  // Apply VS Code specific overrides if provided
  if (project.appOverrides?.vscode) {
    for (const [key, val] of Object.entries(project.appOverrides.vscode)) {
      if (typeof val === 'string' && isValidHexColor(val)) {
        workbenchColors[key] = norm(val);
      }
    }
  }

  // Sort workbench colors deterministically
  const sortedColors = {};
  for (const k of Object.keys(workbenchColors).sort()) {
    sortedColors[k] = workbenchColors[k];
  }

  // Token colors (Syntax highlighting)
  const commentColor = project.syntax?.comments ? norm(project.syntax.comments) : textMuted;
  const keywordColor = project.syntax?.keywords ? norm(project.syntax.keywords) : accent;
  const stringColor = project.syntax?.strings ? norm(project.syntax.strings) : success;
  const numberColor = project.syntax?.numbers ? norm(project.syntax.numbers) : warning;
  const typeColor = project.syntax?.types ? norm(project.syntax.types) : accent;

  const tokenColors = [
    {
      name: 'Comments',
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: commentColor },
    },
    {
      name: 'Keywords & Storage',
      scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
      settings: { foreground: keywordColor },
    },
    {
      name: 'Strings',
      scope: ['string', 'string.quoted', 'punctuation.definition.string'],
      settings: { foreground: stringColor },
    },
    {
      name: 'Numbers & Constants',
      scope: ['constant.numeric', 'constant.language', 'constant.character'],
      settings: { foreground: numberColor },
    },
    {
      name: 'Types & Classes',
      scope: ['entity.name.type', 'support.type', 'support.class'],
      settings: { foreground: typeColor },
    },
    {
      name: 'Functions & Methods',
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: accent },
    },
    {
      name: 'Variables',
      scope: ['variable', 'entity.name.variable'],
      settings: { foreground: text },
    },
  ];

  return {
    $schema: 'vscode://schemas/color-theme',
    name: project.name,
    type: project.mode,
    colors: sortedColors,
    tokenColors,
  };
}

/**
 * Builds the VS Code extension manifest (package.json).
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {Record<string, unknown>}
 */
export function buildVSCodePackageJson(project) {
  return {
    name: project.projectId,
    displayName: project.name,
    description: `Native theme ${project.name} exported from OpenTheme Studio`,
    version: '0.0.1',
    publisher: 'opentheme-studio',
    engines: {
      vscode: `^${VSCODE_SUPPORTED_VERSION}`,
    },
    categories: ['Themes'],
    contributes: {
      themes: [
        {
          label: project.name,
          uiTheme: project.mode === 'dark' ? 'vs-dark' : 'vs',
          path: `./themes/${project.projectId}-color-theme.json`,
        },
      ],
    },
  };
}

/**
 * Generates human-readable README and install instructions.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {string}
 */
export function buildVSCodeReadme(project) {
  return `# ${project.name} (VS Code Theme)

This color theme was exported natively from OpenTheme Studio for Visual Studio Code (${VSCODE_SUPPORTED_VERSION} stable).

## Manual Installation

1. Copy this extension directory to your VS Code extensions folder:
   - **Windows**: \`%USERPROFILE%\\.vscode\\extensions\\${project.projectId}-0.0.1\`
   - **macOS / Linux**: \`~/.vscode/extensions/${project.projectId}-0.0.1\`
2. Reload Visual Studio Code:
   - Open Command Palette (\`Ctrl+Shift+P\` or \`Cmd+Shift+P\`)
   - Run: \`Developer: Reload Window\`
3. Select the theme:
   - Go to \`File > Preferences > Theme > Color Theme\` (\`Ctrl+K Ctrl+T\` / \`Cmd+K Cmd+T\`)
   - Select **${project.name}**

## Uninstallation / Removal

1. Switch to a different color theme in VS Code.
2. Delete the \`${project.projectId}-0.0.1\` folder from your extensions directory.
3. Reload the Visual Studio Code window.
`;
}

/**
 * VS Code Theme Adapter instance adhering to ThemeAdapter contract.
 * @type {import('../../../contracts/adapter-api.js').ThemeAdapter}
 */
export const vsCodeAdapter = {
  id: 'vscode',
  displayName: 'Visual Studio Code',
  supportedVersions: /** @type {const} */ ([VSCODE_SUPPORTED_VERSION]),

  getControls(project, targetVersion) {
    return getVSCodeControls(project);
  },

  validate(project, targetVersion) {
    return validateVSCode(project, targetVersion);
  },

  async export(project, targetVersion) {
    const issues = validateVSCode(project, targetVersion);
    const hasErrors = issues.some((i) => i.severity === 'error');

    // Reject without returning partial files if validation has error issues
    if (hasErrors) {
      return {
        files: [],
        issues,
        installSteps: [],
        removeSteps: [],
      };
    }

    const packageJsonContent = JSON.stringify(buildVSCodePackageJson(project), null, 2) + '\n';
    const themeJsonContent = JSON.stringify(buildVSCodeThemeJson(project), null, 2) + '\n';
    const readmeContent = buildVSCodeReadme(project);

    /** @type {import('../../../contracts/adapter-api.js').ExportFile[]} */
    const files = [
      {
        path: 'package.json',
        content: packageJsonContent,
        mimeType: 'application/json',
      },
      {
        path: `themes/${project.projectId}-color-theme.json`,
        content: themeJsonContent,
        mimeType: 'application/json',
      },
      {
        path: 'README.md',
        content: readmeContent,
        mimeType: 'text/markdown',
      },
    ];

    const installSteps = [
      `1. Copy the extension folder to your VS Code extensions directory:`,
      `   - Windows: %USERPROFILE%\\.vscode\\extensions\\${project.projectId}-0.0.1`,
      `   - macOS/Linux: ~/.vscode/extensions/${project.projectId}-0.0.1`,
      `2. Reload Visual Studio Code (press Ctrl+Shift+P / Cmd+Shift+P and run "Developer: Reload Window").`,
      `3. Open Preferences: Color Theme (Ctrl+K Ctrl+T / Cmd+K Cmd+T) and select "${project.name}".`,
    ];

    const removeSteps = [
      `1. Switch to another theme in Visual Studio Code.`,
      `2. Remove the directory "${project.projectId}-0.0.1" from your VS Code extensions folder.`,
      `3. Reload the Visual Studio Code window.`,
    ];

    return {
      files,
      issues,
      installSteps,
      removeSteps,
    };
  },
};
