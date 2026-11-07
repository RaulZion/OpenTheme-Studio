/**
 * State and configuration manager for OpenTheme Studio Live Sync in VS Code.
 * Handles one-time pairing token lifecycle, non-destructive configuration updates,
 * and safe rollback of applied color customizations.
 */

import { randomBytes } from 'node:crypto';
import { mapWorkbenchColors, mapTokenColors } from './color-mapper.js';

export class StateManager {
  /**
   * @param {object} [options]
   * @param {any} [options.configProvider] Optional custom configuration provider (for testing)
   * @param {any} [options.storage] Optional persistent storage (e.g. ExtensionContext.globalState)
   */
  constructor(options = {}) {
    this.configProvider = options.configProvider || null;
    this.storage = options.storage || null;

    /** @type {string | null} */
    this._pairingToken = null;

    /** @type {Record<string, string> | null} */
    this.originalWorkbenchColors = null;
    /** @type {Record<string, unknown> | null} */
    this.originalTokenColors = null;

    /** @type {Record<string, string> | null} */
    this.lastAppliedWorkbenchColors = null;
    /** @type {Record<string, unknown> | null} */
    this.lastAppliedTokenColors = null;

    this.regeneratePairingCode();
  }

  /**
   * Generates a new cryptographically secure 128-bit pairing token.
   * @returns {string}
   */
  regeneratePairingCode() {
    this._pairingToken = randomBytes(16).toString('hex');
    return this._pairingToken;
  }

  /**
   * Returns current pairing token for user display or copy.
   * @returns {string}
   */
  getPairingCode() {
    if (!this._pairingToken) {
      this.regeneratePairingCode();
    }
    return /** @type {string} */ (this._pairingToken);
  }

  /**
   * Verifies an Authorization header against current pairing token.
   * @param {string | undefined} authHeader
   * @returns {boolean}
   */
  verifyToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') return false;
    const match = authHeader.match(/^Bearer\s+([0-9a-fA-F]{32,})$/);
    if (!match) return false;
    const provided = match[1];
    return provided === this._pairingToken;
  }

  /**
   * Reads workbench.colorCustomizations via the active configuration provider.
   * @returns {Promise<Record<string, any>>}
   */
  async getWorkbenchColors() {
    if (this.configProvider) {
      return (await this.configProvider.get('workbench.colorCustomizations')) || {};
    }
    try {
      const vscode = await import('vscode');
      const cfg = vscode.workspace.getConfiguration();
      return { ...(cfg.get('workbench.colorCustomizations') || {}) };
    } catch {
      return {};
    }
  }

  /**
   * Updates workbench.colorCustomizations via the active configuration provider.
   * @param {Record<string, any>} colors
   */
  async updateWorkbenchColors(colors) {
    if (this.configProvider) {
      await this.configProvider.update('workbench.colorCustomizations', colors);
      return;
    }
    const vscode = await import('vscode');
    const cfg = vscode.workspace.getConfiguration();
    // Empty object is passed as undefined to clean up cleanly if needed
    const val = Object.keys(colors).length > 0 ? colors : undefined;
    await cfg.update('workbench.colorCustomizations', val, vscode.ConfigurationTarget.Global);
  }

  /**
   * Reads editor.tokenColorCustomizations via the active configuration provider.
   * @returns {Promise<Record<string, any>>}
   */
  async getTokenColors() {
    if (this.configProvider) {
      return (await this.configProvider.get('editor.tokenColorCustomizations')) || {};
    }
    try {
      const vscode = await import('vscode');
      const cfg = vscode.workspace.getConfiguration();
      return { ...(cfg.get('editor.tokenColorCustomizations') || {}) };
    } catch {
      return {};
    }
  }

  /**
   * Updates editor.tokenColorCustomizations via the active configuration provider.
   * @param {Record<string, any>} tokens
   */
  async updateTokenColors(tokens) {
    if (this.configProvider) {
      await this.configProvider.update('editor.tokenColorCustomizations', tokens);
      return;
    }
    const vscode = await import('vscode');
    const cfg = vscode.workspace.getConfiguration();
    const val = Object.keys(tokens).length > 0 ? tokens : undefined;
    await cfg.update('editor.tokenColorCustomizations', val, vscode.ConfigurationTarget.Global);
  }

  /**
   * Applies the theme project colors into VS Code while strictly preserving unrelated user settings.
   * @param {any} project Validated canonical ThemeProject
   * @returns {Promise<{ appliedCount: number }>}
   */
  async applyTheme(project) {
    const targetWorkbench = mapWorkbenchColors(project);
    const targetToken = mapTokenColors(project);

    const currentWorkbench = await this.getWorkbenchColors();
    const currentToken = await this.getTokenColors();

    // Snapshot pre-existing settings on very first apply to enable exact rollback
    if (this.originalWorkbenchColors === null) {
      this.originalWorkbenchColors = { ...currentWorkbench };
    }
    if (this.originalTokenColors === null) {
      this.originalTokenColors = { ...currentToken };
    }

    // Merge non-destructively: keep unrelated user keys, overwrite only OpenTheme keys
    const mergedWorkbench = { ...currentWorkbench, ...targetWorkbench };
    const mergedToken = { ...currentToken, ...targetToken };

    await this.updateWorkbenchColors(mergedWorkbench);
    await this.updateTokenColors(mergedToken);

    this.lastAppliedWorkbenchColors = { ...targetWorkbench };
    this.lastAppliedTokenColors = { ...targetToken };

    const appliedCount = Object.keys(targetWorkbench).length + Object.keys(targetToken).length;
    return { appliedCount };
  }

  /**
   * Restores original colors, reverting only keys touched by OpenTheme Studio that still equal
   * their last applied values. If the user changed a key manually, that key is preserved.
   * @returns {Promise<{ ok: boolean, restoredCount: number }>}
   */
  async restoreOriginalColors() {
    let restoredCount = 0;

    const currentWorkbench = await this.getWorkbenchColors();
    const nextWorkbench = { ...currentWorkbench };

    if (this.lastAppliedWorkbenchColors) {
      for (const [key, lastVal] of Object.entries(this.lastAppliedWorkbenchColors)) {
        // Only revert if current setting still matches what OpenTheme Studio applied
        if (currentWorkbench[key] === lastVal) {
          if (
            this.originalWorkbenchColors &&
            Object.prototype.hasOwnProperty.call(this.originalWorkbenchColors, key)
          ) {
            nextWorkbench[key] = this.originalWorkbenchColors[key];
          } else {
            delete nextWorkbench[key];
          }
          restoredCount++;
        }
      }
    }

    const currentToken = await this.getTokenColors();
    const nextToken = { ...currentToken };

    if (this.lastAppliedTokenColors) {
      for (const [key, lastVal] of Object.entries(this.lastAppliedTokenColors)) {
        const lastValStr = JSON.stringify(lastVal);
        const currValStr = JSON.stringify(currentToken[key]);
        if (currValStr === lastValStr) {
          if (
            this.originalTokenColors &&
            Object.prototype.hasOwnProperty.call(this.originalTokenColors, key)
          ) {
            nextToken[key] = this.originalTokenColors[key];
          } else {
            delete nextToken[key];
          }
          restoredCount++;
        }
      }
    }

    await this.updateWorkbenchColors(nextWorkbench);
    await this.updateTokenColors(nextToken);

    // Reset applied tracking
    this.lastAppliedWorkbenchColors = null;
    this.lastAppliedTokenColors = null;
    this.originalWorkbenchColors = null;
    this.originalTokenColors = null;

    return { ok: true, restoredCount };
  }
}
