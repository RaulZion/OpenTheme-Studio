/**
 * Core token role definitions, regular expressions, and naming helpers.
 */

export const SEMANTIC_ROLES = /** @type {const} */ ([
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
]);

export const SYNTAX_ROLES = /** @type {const} */ ([
  'comments',
  'keywords',
  'strings',
  'numbers',
  'types',
]);

export const PROJECT_ID_REGEX = /^[a-z][a-z0-9-]{1,63}$/;
export const APP_ID_REGEX = /^[a-z][a-z0-9-]{1,63}$/;
export const OVERRIDE_KEY_REGEX = /^(?:--[a-z][a-zA-Z0-9-]{0,127}|[a-z][a-zA-Z0-9_.-]{0,127})$/;
export const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/;

/**
 * Checks whether a given string is a valid slug/projectId according to canonical schema.
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  return typeof slug === 'string' && PROJECT_ID_REGEX.test(slug);
}

/**
 * Checks whether a given project name meets the canonical schema constraints:
 * - 1 to 100 characters
 * - At least one non-whitespace character
 * - No control characters (\u0000-\u001f, \u007f)
 * @param {string} name
 * @returns {boolean}
 */
export function isValidProjectName(name) {
  if (typeof name !== 'string') return false;
  if (name.length < 1 || name.length > 100) return false;
  if (!/\S/.test(name)) return false;
  if (CONTROL_CHAR_REGEX.test(name)) return false;
  return true;
}

/**
 * Converts a human-readable title or arbitrary name into a valid, safe projectId slug.
 * Safe slugs match /^[a-z][a-z0-9-]{1,63}$/.
 * @param {string} input
 * @returns {string}
 */
export function toSafeSlug(input) {
  if (typeof input !== 'string') {
    return 'custom-theme';
  }

  let slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9-]+/g, '-')     // replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '')          // trim dashes
    .replace(/--+/g, '-');            // collapse multiple dashes

  // Must begin with a letter [a-z]
  if (!slug || !/^[a-z]/.test(slug)) {
    slug = `theme-${slug || 'project'}`.replace(/^-+|-+$/g, '');
  }

  // Must be between 2 and 64 characters
  if (slug.length < 2) {
    slug = `${slug}-theme`;
  }
  if (slug.length > 64) {
    slug = slug.slice(0, 64).replace(/-+$/, '');
    if (slug.length < 2) {
      slug = 'theme-project';
    }
  }

  return slug;
}

/**
 * Resolves the effective color for a given role or key in an app context.
 * Precedence:
 * 1. App-specific override in project.appOverrides[appId][key]
 * 2. Syntax color in project.syntax[key] (if key is a syntax role)
 * 3. Semantic token in project.tokens[key] (if key is a semantic role)
 * 4. undefined
 *
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @param {string} appId
 * @param {string} key
 * @returns {string | undefined}
 */
export function getEffectiveColor(project, appId, key) {
  if (!project) return undefined;

  // 1. App override
  const appMap = project.appOverrides?.[appId];
  if (appMap && Object.prototype.hasOwnProperty.call(appMap, key)) {
    const val = appMap[key];
    if (typeof val === 'string') return val;
  }

  // 2. Syntax role
  if (project.syntax && Object.prototype.hasOwnProperty.call(project.syntax, key)) {
    const val = project.syntax[key];
    if (typeof val === 'string') return val;
  }

  // 3. Semantic role
  if (project.tokens && Object.prototype.hasOwnProperty.call(project.tokens, key)) {
    const val = project.tokens[key];
    if (typeof val === 'string') return val;
  }

  return undefined;
}
