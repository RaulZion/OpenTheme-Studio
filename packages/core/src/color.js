/**
 * Hex color validation, normalization, sRGB color science, and WCAG contrast calculations.
 */

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Checks whether a given string is a valid six-digit sRGB hex color (#RRGGBB).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value);
}

/**
 * Normalizes a six-digit hex color to canonical uppercase format (#RRGGBB).
 * @param {string} hex
 * @returns {string}
 */
export function normalizeHexColor(hex) {
  if (!isValidHexColor(hex)) {
    throw new Error(`Invalid 6-digit hex color: ${hex}`);
  }
  return hex.toUpperCase();
}

/**
 * Converts a 6-digit hex string to RGB components in 0..255.
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  if (!isValidHexColor(hex)) {
    throw new Error(`Invalid 6-digit hex color: ${hex}`);
  }
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts RGB components (0..255) to canonical 6-digit hex string (#RRGGBB).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB component in 0..255.
 * @param {number} c8
 * @returns {number}
 */
function sRgbToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Computes WCAG relative luminance (0..1) for a 6-digit hex color.
 * @param {string} hex
 * @returns {number}
 */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Computes WCAG 2.1 contrast ratio between two hex colors (1..21).
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Evaluates semantic color contrast pairs in a ThemeProject and emits warning issues for low contrast.
 * @param {import('../../../contracts/adapter-api.js').ThemeProject} project
 * @returns {import('../../../contracts/adapter-api.js').ValidationIssue[]}
 */
export function checkContrastIssues(project) {
  /** @type {import('../../../contracts/adapter-api.js').ValidationIssue[]} */
  const issues = [];
  if (!project || !project.tokens) return issues;

  const { canvas, surface, text, textMuted, accent, accentText } = project.tokens;

  // text on canvas
  if (isValidHexColor(text) && isValidHexColor(canvas)) {
    const ratio = contrastRatio(text, canvas);
    if (ratio < 4.5) {
      issues.push({
        severity: 'warning',
        code: 'CONTRAST_LOW_TEXT_CANVAS',
        message: `Contrast ratio between text (${text}) and canvas (${canvas}) is ${ratio}:1, below WCAG AA recommended 4.5:1`,
        path: 'tokens.text',
      });
    }
  }

  // text on surface
  if (isValidHexColor(text) && isValidHexColor(surface)) {
    const ratio = contrastRatio(text, surface);
    if (ratio < 4.5) {
      issues.push({
        severity: 'warning',
        code: 'CONTRAST_LOW_TEXT_SURFACE',
        message: `Contrast ratio between text (${text}) and surface (${surface}) is ${ratio}:1, below WCAG AA recommended 4.5:1`,
        path: 'tokens.text',
      });
    }
  }

  // accentText on accent
  if (isValidHexColor(accentText) && isValidHexColor(accent)) {
    const ratio = contrastRatio(accentText, accent);
    if (ratio < 3.0) {
      issues.push({
        severity: 'warning',
        code: 'CONTRAST_LOW_ACCENT_TEXT',
        message: `Contrast ratio between accentText (${accentText}) and accent (${accent}) is ${ratio}:1, below recommended 3.0:1`,
        path: 'tokens.accentText',
      });
    }
  }

  // textMuted on canvas
  if (isValidHexColor(textMuted) && isValidHexColor(canvas)) {
    const ratio = contrastRatio(textMuted, canvas);
    if (ratio < 3.0) {
      issues.push({
        severity: 'warning',
        code: 'CONTRAST_LOW_TEXT_MUTED',
        message: `Contrast ratio between textMuted (${textMuted}) and canvas (${canvas}) is ${ratio}:1, below recommended 3.0:1`,
        path: 'tokens.textMuted',
      });
    }
  }

  return issues;
}
