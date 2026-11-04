/**
 * Obsidian 1.15.0 public theme adapter for OpenTheme Studio.
 * Follows official Obsidian Theme guidelines and documented CSS variables:
 * https://docs.obsidian.md/Themes/App%20themes/Build%20a%20theme
 * https://docs.obsidian.md/Themes/App%20themes/Theme%20guidelines
 */

import {
  validateThemeProject,
  checkContrastIssues,
  normalizeHexColor,
  isValidHexColor,
  getEffectiveColor,
} from '../../../core/src/index.js';

export const OBSIDIAN_SUPPORTED_VERSION = '1.15.0';

/**
 * Checks for any prohibited or dangerous CSS constructs (injection, remote resources, scripts).
 * @param {string} text
 * @returns {string | null} Returns description of detected threat or null if safe.
 */
function detectCssInjectionThreat(text) {
  if (/@import\b/i.test(text)) return 'Prohibited CSS @import directive detected';
  if (/url\s*\(/i.test(text)) return 'Prohibited url(...) remote asset or reference detected';
  if (/expression\s*\(/i.test(text)) return 'Prohibited CSS expression() detected';
  if (/-moz-binding\b/i.test(text)) return 'Prohibited -moz-binding detected';
  if (/javascript\s*:/i.test(text)) return 'Prohibited javascript: URI detected';
  if (/<\s*\/?\s*style\b/i.test(text)) return 'Prohibited <style> tag sequence detected';
  if (/<\s*\/?\s*script\b/i.test(text)) return 'Prohibited <script> tag sequence detected';
  return null;
}

/**
 * Builds the Obsidian ThemeControls list for inspector/UI.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {import('../../../contracts/adapter-api.js').ThemeControl[]}
 */
export function getObsidianControls(project) {
  return [
    {
      id: 'obsidian.bg.primary',
      label: 'Primary Background',
      group: 'Backgrounds',
      binding: { scope: 'shared', collection: 'tokens', key: 'canvas' },
      supported: true,
      note: 'Mapped to --background-primary',
    },
    {
      id: 'obsidian.bg.secondary',
      label: 'Sidebars & Panels',
      group: 'Backgrounds',
      binding: { scope: 'shared', collection: 'tokens', key: 'surface' },
      supported: true,
      note: 'Mapped to --background-secondary',
    },
    {
      id: 'obsidian.bg.raised',
      label: 'Raised Elements & Cards',
      group: 'Backgrounds',
      binding: { scope: 'shared', collection: 'tokens', key: 'surfaceRaised' },
      supported: true,
      note: 'Mapped to --background-secondary-alt',
    },
    {
      id: 'obsidian.text.normal',
      label: 'Main Note Text',
      group: 'Text',
      binding: { scope: 'shared', collection: 'tokens', key: 'text' },
      supported: true,
      note: 'Mapped to --text-normal',
    },
    {
      id: 'obsidian.text.muted',
      label: 'Muted & Secondary Text',
      group: 'Text',
      binding: { scope: 'shared', collection: 'tokens', key: 'textMuted' },
      supported: true,
      note: 'Mapped to --text-muted',
    },
    {
      id: 'obsidian.accent',
      label: 'Interactive Accent',
      group: 'UI Elements',
      binding: { scope: 'shared', collection: 'tokens', key: 'accent' },
      supported: true,
      note: 'Mapped to --interactive-accent and --text-accent',
    },
    {
      id: 'obsidian.accentText',
      label: 'Text On Accent',
      group: 'UI Elements',
      binding: { scope: 'shared', collection: 'tokens', key: 'accentText' },
      supported: true,
      note: 'Mapped to --text-on-accent',
    },
    {
      id: 'obsidian.border',
      label: 'Borders & Dividers',
      group: 'UI Elements',
      binding: { scope: 'shared', collection: 'tokens', key: 'border' },
      supported: true,
      note: 'Mapped to --background-modifier-border',
    },
    {
      id: 'obsidian.selection',
      label: 'Text Selection',
      group: 'UI Elements',
      binding: { scope: 'shared', collection: 'tokens', key: 'selection' },
      supported: true,
      note: 'Mapped to --text-selection',
    },
    {
      id: 'obsidian.syntax.comments',
      label: 'Code Block Comments',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'comments' },
      supported: true,
      note: 'Mapped to --code-comment',
    },
    {
      id: 'obsidian.syntax.keywords',
      label: 'Code Block Keywords',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'keywords' },
      supported: true,
      note: 'Mapped to --code-keyword',
    },
    {
      id: 'obsidian.syntax.strings',
      label: 'Code Block Strings',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'strings' },
      supported: true,
      note: 'Mapped to --code-string',
    },
    {
      id: 'obsidian.syntax.numbers',
      label: 'Code Block Numbers',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'numbers' },
      supported: true,
      note: 'Mapped to --code-value',
    },
    {
      id: 'obsidian.syntax.types',
      label: 'Code Block Types',
      group: 'Syntax',
      binding: { scope: 'shared', collection: 'syntax', key: 'types' },
      supported: true,
      note: 'Mapped to --code-tag',
    },
  ];
}

/**
 * Validates a theme project for the Obsidian 1.15.0 adapter.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @param {string} targetVersion
 * @returns {import('../../../contracts/adapter-api.js').ValidationIssue[]}
 */
export function validateObsidian(project, targetVersion) {
  /** @type {import('../../../contracts/adapter-api.js').ValidationIssue[]} */
  const issues = [];

  // Version check
  if (targetVersion !== OBSIDIAN_SUPPORTED_VERSION) {
    issues.push({
      severity: 'error',
      code: 'OBSIDIAN_UNSUPPORTED_VERSION',
      message: `Obsidian adapter only supports target version "${OBSIDIAN_SUPPORTED_VERSION}", received "${targetVersion}"`,
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
        code: 'OBSIDIAN_UNSAFE_PROJECT_ID',
        message: `projectId contains dangerous path characters: "${project.projectId}"`,
        path: 'projectId',
      });
    }
  }

  // Check project name for injection
  if (project.name) {
    const threat = detectCssInjectionThreat(project.name);
    if (threat) {
      issues.push({
        severity: 'error',
        code: 'OBSIDIAN_SECURITY_VIOLATION',
        message: `Security violation in project name: ${threat}`,
        path: 'name',
      });
    }
  }

  // Check appOverrides for Obsidian
  if (project.appOverrides?.obsidian) {
    const overrides = project.appOverrides.obsidian;
    for (const [key, val] of Object.entries(overrides)) {
      if (!/^--[a-z][a-zA-Z0-9-]*$/.test(key)) {
        issues.push({
          severity: 'error',
          code: 'OBSIDIAN_INVALID_OVERRIDE_KEY',
          message: `Obsidian override key "${key}" must be a valid CSS custom property starting with "--"`,
          path: `appOverrides.obsidian.${key}`,
        });
      }
      if (!isValidHexColor(val)) {
        issues.push({
          severity: 'error',
          code: 'OBSIDIAN_INVALID_OVERRIDE_COLOR',
          message: `Obsidian override color for "${key}" is not a valid 6-digit hex color: "${val}"`,
          path: `appOverrides.obsidian.${key}`,
        });
      }

      // Check values and keys for injection
      const keyThreat = detectCssInjectionThreat(key);
      if (keyThreat) {
        issues.push({
          severity: 'error',
          code: 'OBSIDIAN_SECURITY_VIOLATION',
          message: `Security violation in override key "${key}": ${keyThreat}`,
          path: `appOverrides.obsidian.${key}`,
        });
      }
      if (typeof val === 'string') {
        const valThreat = detectCssInjectionThreat(val);
        if (valThreat) {
          issues.push({
            severity: 'error',
            code: 'OBSIDIAN_SECURITY_VIOLATION',
            message: `Security violation in override value for "${key}": ${valThreat}`,
            path: `appOverrides.obsidian.${key}`,
          });
        }
      }
    }
  }

  // Contrast warnings
  const contrastWarnings = checkContrastIssues(project);
  issues.push(...contrastWarnings);

  return issues;
}

/**
 * Builds the Obsidian theme.css content.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {string}
 */
export function buildObsidianThemeCss(project) {
  const norm = (hex) => normalizeHexColor(hex);
  const color = (role) => norm(getEffectiveColor(project, 'obsidian', role));

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
  const cssVars = {
    '--background-primary': canvas,
    '--background-primary-alt': surface,
    '--background-secondary': surface,
    '--background-secondary-alt': surfaceRaised,
    '--background-modifier-border': border,
    '--background-modifier-border-focus': accent,
    '--background-modifier-form-field': surfaceRaised,
    '--background-modifier-hover': surfaceRaised,
    '--text-normal': text,
    '--text-muted': textMuted,
    '--text-faint': textMuted,
    '--text-accent': accent,
    '--text-accent-hover': accent,
    '--text-on-accent': accentText,
    '--interactive-normal': surface,
    '--interactive-hover': surfaceRaised,
    '--interactive-accent': accent,
    '--interactive-accent-hover': accent,
    '--text-selection': selection,
    '--text-error': error,
    '--text-warning': warning,
    '--text-success': success,
    '--code-comment': project.syntax?.comments ? norm(project.syntax.comments) : textMuted,
    '--code-keyword': project.syntax?.keywords ? norm(project.syntax.keywords) : accent,
    '--code-string': project.syntax?.strings ? norm(project.syntax.strings) : success,
    '--code-value': project.syntax?.numbers ? norm(project.syntax.numbers) : warning,
    '--code-tag': project.syntax?.types ? norm(project.syntax.types) : accent,
  };

  // Merge obsidian overrides
  if (project.appOverrides?.obsidian) {
    for (const [key, val] of Object.entries(project.appOverrides.obsidian)) {
      if (typeof val === 'string' && isValidHexColor(val)) {
        cssVars[key] = norm(val);
      }
    }
  }

  // Deterministically sort CSS variable declarations
  const sortedKeys = Object.keys(cssVars).sort();
  const selector = project.mode === 'light' ? '.theme-light' : '.theme-dark';

  const lines = [
    `/* OpenTheme Studio theme ${project.projectId} for Obsidian ${OBSIDIAN_SUPPORTED_VERSION} */`,
    `${selector} {`,
  ];

  for (const k of sortedKeys) {
    lines.push(`  ${k}: ${cssVars[k]};`);
  }

  lines.push('}\n');
  return lines.join('\n');
}

/**
 * Builds the Obsidian manifest.json dictionary.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {Record<string, unknown>}
 */
export function buildObsidianManifestJson(project) {
  return {
    name: project.name,
    version: '1.0.0',
    minAppVersion: OBSIDIAN_SUPPORTED_VERSION,
    author: 'OpenTheme Studio',
  };
}

/**
 * Builds human-readable README and install instructions for Obsidian.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {string}
 */
export function buildObsidianReadme(project) {
  return `# ${project.name} (Obsidian Theme)

This theme was exported natively from OpenTheme Studio for Obsidian (${OBSIDIAN_SUPPORTED_VERSION} public).

## Manual Installation

1. Open your Obsidian vault in your file manager.
2. Navigate to the hidden configuration folder:
   - \`<your-vault>/.obsidian/themes/\`
   *(Create the \`themes\` directory if it does not already exist)*
3. Create a subfolder named **\`${project.projectId}\`**:
   - \`<your-vault>/.obsidian/themes/${project.projectId}/\`
4. Copy \`manifest.json\` and \`theme.css\` into that folder.
5. In Obsidian:
   - Go to **Settings > Appearance > Themes**
   - Click the reload icon next to Themes if needed
   - Select **${project.name}**

## Uninstallation / Removal

1. In Obsidian, go to **Settings > Appearance > Themes** and select **Default**.
2. In your file manager, delete the folder \`<your-vault>/.obsidian/themes/${project.projectId}/\`.
`;
}

/**
 * Obsidian Theme Adapter instance adhering to ThemeAdapter contract.
 * @type {import('../../../contracts/adapter-api.js').ThemeAdapter}
 */
export const obsidianAdapter = {
  id: 'obsidian',
  displayName: 'Obsidian',
  supportedVersions: /** @type {const} */ ([OBSIDIAN_SUPPORTED_VERSION]),

  getControls(project, targetVersion) {
    return getObsidianControls(project);
  },

  validate(project, targetVersion) {
    return validateObsidian(project, targetVersion);
  },

  async export(project, targetVersion) {
    const issues = validateObsidian(project, targetVersion);
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

    const manifestContent = JSON.stringify(buildObsidianManifestJson(project), null, 2) + '\n';
    const themeCssContent = buildObsidianThemeCss(project);
    const readmeContent = buildObsidianReadme(project);

    /** @type {import('../../../contracts/adapter-api.js').ExportFile[]} */
    const files = [
      {
        path: 'manifest.json',
        content: manifestContent,
        mimeType: 'application/json',
      },
      {
        path: 'theme.css',
        content: themeCssContent,
        mimeType: 'text/css',
      },
      {
        path: 'README.md',
        content: readmeContent,
        mimeType: 'text/markdown',
      },
    ];

    const installSteps = [
      `1. Open your Obsidian vault folder.`,
      `2. Navigate to ".obsidian/themes/" (create the "themes" directory if it does not exist).`,
      `3. Create a folder named "${project.projectId}" inside ".obsidian/themes/".`,
      `4. Copy "manifest.json" and "theme.css" into ".obsidian/themes/${project.projectId}/".`,
      `5. In Obsidian, open Settings -> Appearance -> Themes, and select "${project.name}".`,
    ];

    const removeSteps = [
      `1. In Obsidian, open Settings -> Appearance -> Themes, and switch back to "Default".`,
      `2. Delete the directory ".obsidian/themes/${project.projectId}/" from your vault.`,
    ];

    return {
      files,
      issues,
      installSteps,
      removeSteps,
    };
  },
};
