/**
 * Canonical JSON schema validator for OpenTheme Studio ThemeProject.
 * Corresponds strictly to contracts/theme.schema.json (schemaVersion 1.0.0).
 */

import {
  SEMANTIC_ROLES,
  SYNTAX_ROLES,
  PROJECT_ID_REGEX,
  APP_ID_REGEX,
  OVERRIDE_KEY_REGEX,
  CONTROL_CHAR_REGEX,
} from './tokens.js';
import { HEX_COLOR_REGEX } from './color.js';

const ROOT_ALLOWED_KEYS = new Set([
  'schemaVersion',
  'projectId',
  'name',
  'mode',
  'tokens',
  'syntax',
  'appOverrides',
]);

const SYNTAX_ALLOWED_KEYS = new Set(SYNTAX_ROLES);
const SEMANTIC_ALLOWED_KEYS = new Set(SEMANTIC_ROLES);

/**
 * Validates any candidate ThemeProject against the canonical 1.0.0 JSON schema.
 * Returns a list of structured ValidationIssues with severity 'error' or 'warning'.
 *
 * @param {unknown} project
 * @returns {import('../../../contracts/adapter-api.js').ValidationIssue[]}
 */
export function validateThemeProject(project) {
  /** @type {import('../../../contracts/adapter-api.js').ValidationIssue[]} */
  const issues = [];

  if (typeof project !== 'object' || project === null || Array.isArray(project)) {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_INVALID_TYPE',
      message: 'ThemeProject must be a non-null object',
      path: '',
    });
    return issues;
  }

  const p = /** @type {Record<string, unknown>} */ (project);

  // Check unexpected root properties (additionalProperties: false)
  for (const key of Object.keys(p)) {
    if (!ROOT_ALLOWED_KEYS.has(key)) {
      issues.push({
        severity: 'error',
        code: 'SCHEMA_UNEXPECTED_PROPERTY',
        message: `Unexpected property "${key}" in root ThemeProject`,
        path: key,
      });
    }
  }

  // 1. schemaVersion
  if (p.schemaVersion !== '1.0.0') {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_VERSION_INVALID',
      message: `schemaVersion must be exactly "1.0.0", received "${p.schemaVersion}"`,
      path: 'schemaVersion',
    });
  }

  // 2. projectId
  if (typeof p.projectId !== 'string') {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_PROJECT_ID_REQUIRED',
      message: 'projectId is required and must be a string',
      path: 'projectId',
    });
  } else if (!PROJECT_ID_REGEX.test(p.projectId)) {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_PROJECT_ID_INVALID',
      message: `projectId "${p.projectId}" must match pattern ^[a-z][a-z0-9-]{1,63}$`,
      path: 'projectId',
    });
  }

  // 3. name
  if (typeof p.name !== 'string') {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_NAME_REQUIRED',
      message: 'name is required and must be a string',
      path: 'name',
    });
  } else {
    if (p.name.length < 1 || p.name.length > 100) {
      issues.push({
        severity: 'error',
        code: 'SCHEMA_NAME_LENGTH',
        message: `name must be between 1 and 100 characters (length: ${p.name.length})`,
        path: 'name',
      });
    }
    if (!/\S/.test(p.name)) {
      issues.push({
        severity: 'error',
        code: 'SCHEMA_NAME_EMPTY',
        message: 'name must contain at least one non-whitespace character',
        path: 'name',
      });
    }
    if (CONTROL_CHAR_REGEX.test(p.name)) {
      issues.push({
        severity: 'error',
        code: 'SCHEMA_NAME_CONTROL_CHARS',
        message: 'name must not contain ASCII control characters',
        path: 'name',
      });
    }
  }

  // 4. mode
  if (p.mode !== 'light' && p.mode !== 'dark') {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_MODE_INVALID',
      message: `mode must be either "light" or "dark", received "${p.mode}"`,
      path: 'mode',
    });
  }

  // 5. tokens
  if (typeof p.tokens !== 'object' || p.tokens === null || Array.isArray(p.tokens)) {
    issues.push({
      severity: 'error',
      code: 'SCHEMA_TOKENS_REQUIRED',
      message: 'tokens is required and must be an object',
      path: 'tokens',
    });
  } else {
    const t = /** @type {Record<string, unknown>} */ (p.tokens);

    // Required roles
    for (const role of SEMANTIC_ROLES) {
      if (!Object.prototype.hasOwnProperty.call(t, role)) {
        issues.push({
          severity: 'error',
          code: 'SCHEMA_TOKEN_MISSING',
          message: `Missing required semantic token: "${role}"`,
          path: `tokens.${role}`,
        });
      } else {
        const val = t[role];
        if (typeof val !== 'string' || !HEX_COLOR_REGEX.test(val)) {
          issues.push({
            severity: 'error',
            code: 'SCHEMA_TOKEN_COLOR_INVALID',
            message: `Token "${role}" must be a 6-digit hex color (#RRGGBB), received "${val}"`,
            path: `tokens.${role}`,
          });
        }
      }
    }

    // Unexpected roles
    for (const key of Object.keys(t)) {
      if (!SEMANTIC_ALLOWED_KEYS.has(key)) {
        issues.push({
          severity: 'error',
          code: 'SCHEMA_TOKENS_UNEXPECTED_PROPERTY',
          message: `Unexpected property "${key}" in tokens`,
          path: `tokens.${key}`,
        });
      }
    }
  }

  // 6. syntax (optional)
  if (p.syntax !== undefined) {
    if (typeof p.syntax !== 'object' || p.syntax === null || Array.isArray(p.syntax)) {
      issues.push({
        severity: 'error',
        code: 'SCHEMA_SYNTAX_INVALID',
        message: 'syntax must be an object if present',
        path: 'syntax',
      });
    } else {
      const s = /** @type {Record<string, unknown>} */ (p.syntax);
      for (const [key, val] of Object.entries(s)) {
        if (!SYNTAX_ALLOWED_KEYS.has(key)) {
          issues.push({
            severity: 'error',
            code: 'SCHEMA_SYNTAX_UNEXPECTED_PROPERTY',
            message: `Unexpected property "${key}" in syntax`,
            path: `syntax.${key}`,
          });
        } else if (typeof val !== 'string' || !HEX_COLOR_REGEX.test(val)) {
          issues.push({
            severity: 'error',
            code: 'SCHEMA_SYNTAX_COLOR_INVALID',
            message: `Syntax role "${key}" must be a 6-digit hex color (#RRGGBB), received "${val}"`,
            path: `syntax.${key}`,
          });
        }
      }
    }
  }

  // 7. appOverrides (optional)
  if (p.appOverrides !== undefined) {
    if (typeof p.appOverrides !== 'object' || p.appOverrides === null || Array.isArray(p.appOverrides)) {
      issues.push({
        severity: 'error',
        code: 'SCHEMA_APP_OVERRIDES_INVALID',
        message: 'appOverrides must be an object if present',
        path: 'appOverrides',
      });
    } else {
      const overrides = /** @type {Record<string, unknown>} */ (p.appOverrides);
      for (const [appId, appMap] of Object.entries(overrides)) {
        if (!APP_ID_REGEX.test(appId)) {
          issues.push({
            severity: 'error',
            code: 'SCHEMA_OVERRIDE_APP_ID_INVALID',
            message: `appId "${appId}" in appOverrides must match pattern ^[a-z][a-z0-9-]{1,63}$`,
            path: `appOverrides.${appId}`,
          });
        }

        if (typeof appMap !== 'object' || appMap === null || Array.isArray(appMap)) {
          issues.push({
            severity: 'error',
            code: 'SCHEMA_OVERRIDE_MAP_INVALID',
            message: `Overrides for app "${appId}" must be an object`,
            path: `appOverrides.${appId}`,
          });
        } else {
          const map = /** @type {Record<string, unknown>} */ (appMap);
          for (const [propKey, propVal] of Object.entries(map)) {
            if (!OVERRIDE_KEY_REGEX.test(propKey)) {
              issues.push({
                severity: 'error',
                code: 'SCHEMA_OVERRIDE_KEY_INVALID',
                message: `Override property key "${propKey}" for app "${appId}" violates allowed propertyNames pattern`,
                path: `appOverrides.${appId}.${propKey}`,
              });
            }
            if (typeof propVal !== 'string' || !HEX_COLOR_REGEX.test(propVal)) {
              issues.push({
                severity: 'error',
                code: 'SCHEMA_OVERRIDE_COLOR_INVALID',
                message: `Override color for "${propKey}" in app "${appId}" must be a 6-digit hex color (#RRGGBB), received "${propVal}"`,
                path: `appOverrides.${appId}.${propKey}`,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

/**
 * Returns true if the project contains no error-severity validation issues.
 * @param {unknown} project
 * @returns {boolean}
 */
export function isValidThemeProject(project) {
  const issues = validateThemeProject(project);
  return !issues.some((issue) => issue.severity === 'error');
}
