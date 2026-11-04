/**
 * Deterministic serializer and safe deserializer for ThemeProject JSON.
 * Guarantees stable byte-for-byte serialization across runs.
 */

import { SEMANTIC_ROLES, SYNTAX_ROLES } from './tokens.js';
import { validateThemeProject } from './schema.js';
import { normalizeHexColor, isValidHexColor } from './color.js';

/**
 * Builds a canonical object with deterministically sorted keys and normalized hex colors.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {Record<string, unknown>}
 */
export function toCanonicalThemeProject(project) {
  const normColor = (hex) => (isValidHexColor(hex) ? normalizeHexColor(hex) : hex);

  const canonicalTokens = {};
  for (const role of SEMANTIC_ROLES) {
    if (project.tokens && Object.prototype.hasOwnProperty.call(project.tokens, role)) {
      canonicalTokens[role] = normColor(project.tokens[role]);
    }
  }

  const result = {
    schemaVersion: project.schemaVersion || '1.0.0',
    projectId: project.projectId,
    name: project.name,
    mode: project.mode,
    tokens: canonicalTokens,
  };

  if (project.syntax && Object.keys(project.syntax).length > 0) {
    const canonicalSyntax = {};
    for (const role of SYNTAX_ROLES) {
      if (Object.prototype.hasOwnProperty.call(project.syntax, role)) {
        canonicalSyntax[role] = normColor(project.syntax[role]);
      }
    }
    result.syntax = canonicalSyntax;
  }

  if (project.appOverrides && Object.keys(project.appOverrides).length > 0) {
    const canonicalOverrides = {};
    const sortedAppIds = Object.keys(project.appOverrides).sort();
    for (const appId of sortedAppIds) {
      const appMap = project.appOverrides[appId];
      if (appMap && typeof appMap === 'object') {
        const sortedPropKeys = Object.keys(appMap).sort();
        const sortedMap = {};
        for (const prop of sortedPropKeys) {
          sortedMap[prop] = normColor(appMap[prop]);
        }
        canonicalOverrides[appId] = sortedMap;
      }
    }
    result.appOverrides = canonicalOverrides;
  }

  return result;
}

/**
 * Deterministically serializes a ThemeProject into a stable JSON string with 2-space indentation and EOF newline.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {string}
 */
export function serializeThemeProject(project) {
  const canonical = toCanonicalThemeProject(project);
  return JSON.stringify(canonical, null, 2) + '\n';
}

/**
 * Safely parses and deserializes a ThemeProject from JSON text or raw object.
 * Returns parsed project (if syntactically valid) and all schema validation issues.
 *
 * @param {string | unknown} raw
 * @returns {{ project?: import('../../../contracts/adapter-api.js').ThemeProject, issues: import('../../../contracts/adapter-api.js').ValidationIssue[] }}
 */
export function deserializeThemeProject(raw) {
  /** @type {import('../../../contracts/adapter-api.js').ValidationIssue[]} */
  const issues = [];
  let parsed = null;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      issues.push({
        severity: 'error',
        code: 'JSON_PARSE_ERROR',
        message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
        path: '',
      });
      return { issues };
    }
  } else if (typeof raw === 'object' && raw !== null) {
    parsed = raw;
  } else {
    issues.push({
      severity: 'error',
      code: 'DESERIALIZE_INVALID_INPUT',
      message: 'Input must be a JSON string or non-null object',
      path: '',
    });
    return { issues };
  }

  const validationIssues = validateThemeProject(parsed);
  issues.push(...validationIssues);

  const hasErrors = validationIssues.some((i) => i.severity === 'error');
  if (hasErrors) {
    return { issues };
  }

  return {
    project: /** @type {import('../../../contracts/adapter-api.js').ThemeProject} */ (parsed),
    issues,
  };
}
