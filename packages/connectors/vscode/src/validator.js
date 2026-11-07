/**
 * Validation logic for OpenTheme Studio Live Sync protocol and ThemeProject payloads.
 * Conforms strictly to contracts/LIVE_SYNC_V1.md and contracts/theme.schema.json.
 */

export const SUPPORTED_PROTOCOL = 'opentheme.live.v1';
export const SUPPORTED_APP_ID = 'vscode';
export const TARGET_VERSION = '1.144.0';

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
export const PROJECT_ID_REGEX = /^[a-z][a-z0-9-]{1,63}$/;
export const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/;
export const OVERRIDE_KEY_REGEX = /^[a-zA-Z0-9_.-]+$/;

export const SEMANTIC_ROLES = [
  'canvas',
  'surface',
  'surfaceRaised',
  'text',
  'textMuted',
  'border',
  'accent',
  'accentText',
  'selection',
  'error',
  'warning',
  'success',
];

export const SYNTAX_ROLES = [
  'comments',
  'keywords',
  'strings',
  'numbers',
  'types',
];

const SEMANTIC_SET = new Set(SEMANTIC_ROLES);
const SYNTAX_SET = new Set(SYNTAX_ROLES);
const ROOT_ALLOWED_KEYS = new Set([
  'schemaVersion',
  'projectId',
  'name',
  'mode',
  'tokens',
  'syntax',
  'appOverrides',
]);

/**
 * Validates the protocol identifier in request bodies.
 * @param {unknown} protocol
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
export function validateProtocol(protocol) {
  if (protocol !== SUPPORTED_PROTOCOL) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROTOCOL',
        message: `Unsupported protocol "${protocol}". Expected "${SUPPORTED_PROTOCOL}".`,
      },
    };
  }
  return { valid: true };
}

/**
 * Validates the application ID in request bodies.
 * @param {unknown} appId
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
export function validateAppId(appId) {
  if (appId !== SUPPORTED_APP_ID) {
    return {
      valid: false,
      error: {
        code: 'INCOMPATIBLE_APP',
        message: `Incompatible appId "${appId}". Expected "${SUPPORTED_APP_ID}".`,
      },
    };
  }
  return { valid: true };
}

/**
 * Evaluates target version match against the adapter's declared target (1.144.0).
 * @param {unknown} version
 * @returns {{ valid: boolean, warning: string | null }}
 */
export function validateTargetVersion(version) {
  if (typeof version !== 'string' || !version) {
    return {
      valid: true,
      warning: `Target version omitted or non-string; defaulting to ${TARGET_VERSION}.`,
    };
  }
  if (version !== TARGET_VERSION) {
    return {
      valid: true,
      warning: `Target version mismatch: requested "${version}", active adapter "${TARGET_VERSION}".`,
    };
  }
  return { valid: true, warning: null };
}

/**
 * Validates a canonical ThemeProject object against contracts/theme.schema.json.
 * @param {unknown} project
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
export function validateProject(project) {
  if (typeof project !== 'object' || project === null || Array.isArray(project)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT',
        message: 'ThemeProject must be a non-null object.',
      },
    };
  }

  const p = /** @type {Record<string, unknown>} */ (project);

  // Check unexpected root keys
  for (const k of Object.keys(p)) {
    if (!ROOT_ALLOWED_KEYS.has(k)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROJECT',
          message: `Unexpected root property "${k}" in ThemeProject.`,
        },
      };
    }
  }

  // 1. schemaVersion
  if (p.schemaVersion !== '1.0.0') {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT',
        message: `schemaVersion must be "1.0.0", received "${p.schemaVersion}".`,
      },
    };
  }

  // 2. projectId
  if (typeof p.projectId !== 'string' || !PROJECT_ID_REGEX.test(p.projectId)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT',
        message: `projectId must match pattern ^[a-z][a-z0-9-]{1,63}$, received "${p.projectId}".`,
      },
    };
  }

  // 3. name
  if (
    typeof p.name !== 'string' ||
    p.name.length < 1 ||
    p.name.length > 100 ||
    !/\S/.test(p.name) ||
    CONTROL_CHAR_REGEX.test(p.name)
  ) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT',
        message: 'name must be 1-100 characters, non-empty, and contain no control characters.',
      },
    };
  }

  // 4. mode
  if (p.mode !== 'light' && p.mode !== 'dark') {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT',
        message: `mode must be "light" or "dark", received "${p.mode}".`,
      },
    };
  }

  // 5. tokens
  if (typeof p.tokens !== 'object' || p.tokens === null || Array.isArray(p.tokens)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PROJECT',
        message: 'tokens is required and must be an object.',
      },
    };
  }

  const tokens = /** @type {Record<string, unknown>} */ (p.tokens);
  for (const role of SEMANTIC_ROLES) {
    if (!Object.prototype.hasOwnProperty.call(tokens, role)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROJECT',
          message: `Missing required semantic token: "${role}".`,
        },
      };
    }
    const val = tokens[role];
    if (typeof val !== 'string' || !HEX_COLOR_REGEX.test(val)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROJECT',
          message: `Token "${role}" must be a 6-digit hex color (#RRGGBB), received "${val}".`,
        },
      };
    }
  }

  for (const k of Object.keys(tokens)) {
    if (!SEMANTIC_SET.has(k)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROJECT',
          message: `Unexpected token property "${k}".`,
        },
      };
    }
  }

  // 6. syntax (optional)
  if (p.syntax !== undefined) {
    if (typeof p.syntax !== 'object' || p.syntax === null || Array.isArray(p.syntax)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROJECT',
          message: 'syntax must be an object if present.',
        },
      };
    }
    const syntax = /** @type {Record<string, unknown>} */ (p.syntax);
    for (const [k, v] of Object.entries(syntax)) {
      if (!SYNTAX_SET.has(k)) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PROJECT',
            message: `Unexpected syntax role "${k}".`,
          },
        };
      }
      if (typeof v !== 'string' || !HEX_COLOR_REGEX.test(v)) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PROJECT',
            message: `Syntax role "${k}" must be a 6-digit hex color (#RRGGBB), received "${v}".`,
          },
        };
      }
    }
  }

  // 7. appOverrides (optional)
  if (p.appOverrides !== undefined) {
    if (typeof p.appOverrides !== 'object' || p.appOverrides === null || Array.isArray(p.appOverrides)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PROJECT',
          message: 'appOverrides must be an object if present.',
        },
      };
    }

    const overrides = /** @type {Record<string, unknown>} */ (p.appOverrides);
    for (const [appKey, appMap] of Object.entries(overrides)) {
      if (!PROJECT_ID_REGEX.test(appKey)) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PROJECT',
            message: `Invalid appId "${appKey}" in appOverrides.`,
          },
        };
      }
      if (typeof appMap !== 'object' || appMap === null || Array.isArray(appMap)) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PROJECT',
            message: `Overrides for "${appKey}" must be an object.`,
          },
        };
      }

      if (appKey === 'vscode') {
        const vscodeMap = /** @type {Record<string, unknown>} */ (appMap);
        for (const propKey of Object.getOwnPropertyNames(vscodeMap)) {
          if (!OVERRIDE_KEY_REGEX.test(propKey) || propKey === '__proto__' || propKey === 'constructor') {
            return {
              valid: false,
              error: {
                code: 'INVALID_PROJECT',
                message: `Invalid VS Code override property key "${propKey}".`,
              },
            };
          }
          const propVal = vscodeMap[propKey];
          if (typeof propVal !== 'string' || !HEX_COLOR_REGEX.test(propVal)) {
            return {
              valid: false,
              error: {
                code: 'INVALID_PROJECT',
                message: `VS Code override color for "${propKey}" must be a 6-digit hex color, received "${propVal}".`,
              },
            };
          }
        }
      }
    }
  }

  return { valid: true };
}
