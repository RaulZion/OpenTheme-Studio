/**
 * State and configuration manager for OpenTheme Studio Live Sync in VS Code.
 * Handles one-time pairing token lifecycle, non-destructive configuration updates,
 * base theme alignment (dark/light), and safe rollback of applied color customizations.
 */

import { randomBytes } from 'node:crypto';
import { mapWorkbenchColors, mapTokenColors } from './color-mapper.js';

const TRACKING_KEY = 'opentheme.live.lastApplied.v1';

export class StateManager {
  /**
   * @param {object} [options]
   * @param {any} [options.configProvider] Optional custom configuration provider (for testing)
   * @param {any} [options.storage] Optional persistent storage (e.g. ExtensionContext.globalState)
   * @param {any} [options.secrets] Optional secure credential storage (e.g. ExtensionContext.secrets)
   * @param {any} [options.themeProvider] Optional theme kind provider (for testing)
   */
  constructor(options = {}) {
    this.configProvider = options.configProvider || null;
    this.storage = options.storage || null;
    this.secrets = options.secrets || null;
    this.themeProvider = options.themeProvider || null;

    /** @type {string | null} */
    this._pairingToken = null;

    /** @type {string | null | undefined} */
    this.originalColorTheme = null;
    /** @type {string | null} */
    this.lastAppliedColorTheme = null;

    /** @type {Record<string, string> | null} */
    this.originalWorkbenchColors = null;
    /** @type {Record<string, unknown> | null} */
    this.originalTokenColors = null;

    /** @type {Record<string, string> | null} */
    this.lastAppliedWorkbenchColors = null;
    /** @type {Record<string, unknown> | null} */
    this.lastAppliedTokenColors = null;

    // VS Code globalState persists across extension-host restarts. Persisting
    // the original values is required for safe restoration after reconnect.
    const saved = this.storage?.get?.(TRACKING_KEY);
    if (
      saved &&
      saved.version === 1 &&
      ['originalWorkbenchColors', 'originalTokenColors', 'lastAppliedWorkbenchColors', 'lastAppliedTokenColors'].every(
        (key) => saved[key] && typeof saved[key] === 'object' && !Array.isArray(saved[key])
      )
    ) {
      this.originalWorkbenchColors = saved.originalWorkbenchColors;
      this.originalTokenColors = saved.originalTokenColors;
      this.lastAppliedWorkbenchColors = saved.lastAppliedWorkbenchColors;
      this.lastAppliedTokenColors = saved.lastAppliedTokenColors;
      this.originalColorTheme = saved.originalColorTheme !== undefined ? saved.originalColorTheme : null;
      this.lastAppliedColorTheme = typeof saved.lastAppliedColorTheme === 'string' ? saved.lastAppliedColorTheme : null;
    }

    // When no secrets provider is given (e.g. sync caller or standalone test), generate immediately
    if (!this.secrets) {
      this._pairingToken = randomBytes(16).toString('hex');
    }
  }

  /**
   * Initializes pairing token from secure secrets storage if available.
   * If token is already stored, reuses it. Otherwise generates and stores a new one.
   * @returns {Promise<string>}
   */
  async init() {
    if (this.secrets?.get) {
      try {
        const stored = await this.secrets.get('opentheme.pairingToken');
        if (stored && typeof stored === 'string' && /^[0-9a-fA-F]{32,}$/.test(stored)) {
          this._pairingToken = stored;
          return this._pairingToken;
        }
      } catch {
        // Fall back to generating if secret retrieval fails
      }
    }

    if (!this._pairingToken) {
      this._pairingToken = randomBytes(16).toString('hex');
    }

    if (this.secrets?.store) {
      try {
        await this.secrets.store('opentheme.pairingToken', this._pairingToken);
      } catch {
        // Ignore secret store failure
      }
    }
    return this._pairingToken;
  }

  async persistTracking() {
    if (!this.storage?.update) return;
    await this.storage.update(TRACKING_KEY, {
      version: 1,
      originalWorkbenchColors: this.originalWorkbenchColors,
      originalTokenColors: this.originalTokenColors,
      lastAppliedWorkbenchColors: this.lastAppliedWorkbenchColors,
      lastAppliedTokenColors: this.lastAppliedTokenColors,
      originalColorTheme: this.originalColorTheme,
      lastAppliedColorTheme: this.lastAppliedColorTheme,
    });
  }

  /**
   * Generates a new cryptographically secure 128-bit pairing token and persists it to secrets.
   * @returns {Promise<string>}
   */
  async regeneratePairingCode() {
    this._pairingToken = randomBytes(16).toString('hex');
    if (this.secrets?.store) {
      try {
        await this.secrets.store('opentheme.pairingToken', this._pairingToken);
      } catch {
        // Ignore store errors
      }
    }
    return this._pairingToken;
  }

  /**
   * Returns current pairing token for user display or copy.
   * @returns {string}
   */
  getPairingCode() {
    if (!this._pairingToken) {
      this._pairingToken = randomBytes(16).toString('hex');
      if (this.secrets?.store) {
        this.secrets.store('opentheme.pairingToken', this._pairingToken).then(null, () => {});
      }
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
    return Boolean(this._pairingToken && provided === this._pairingToken);
  }

  /**
   * Reads workbench.colorTheme via the active configuration provider.
   * @returns {Promise<string | undefined>}
   */
  async getColorTheme() {
    if (this.configProvider) {
      return await this.configProvider.get('workbench.colorTheme');
    }
    try {
      const vscode = await import('vscode');
      const cfg = vscode.workspace.getConfiguration();
      return cfg.get('workbench.colorTheme');
    } catch {
      return undefined;
    }
  }

  /**
   * Updates workbench.colorTheme via the active configuration provider.
   * @param {string | undefined} themeName
   */
  async updateColorTheme(themeName) {
    if (this.configProvider) {
      await this.configProvider.update('workbench.colorTheme', themeName);
      return;
    }
    const vscode = await import('vscode');
    const cfg = vscode.workspace.getConfiguration();
    await cfg.update('workbench.colorTheme', themeName, vscode.ConfigurationTarget.Global);
  }

  /**
   * Detects whether the active theme is light or dark.
   * Uses themeProvider, vscode.window.activeColorTheme.kind, or workbench.colorTheme inspection.
   * @returns {Promise<'light' | 'dark'>}
   */
  async getActiveThemeKind() {
    if (this.themeProvider?.getThemeKind) {
      return this.themeProvider.getThemeKind();
    }
    try {
      const vscode = await import('vscode');
      if (vscode.window?.activeColorTheme) {
        const kind = vscode.window.activeColorTheme.kind;
        // ColorThemeKind: Light=1, Dark=2, HighContrast=3, HighContrastLight=4
        if (kind === 1 || kind === 4) return 'light';
        if (kind === 2 || kind === 3) return 'dark';
      }
    } catch {
      // In environment without vscode host
    }
    const themeName = await this.getColorTheme();
    if (themeName && typeof themeName === 'string') {
      if (/light/i.test(themeName)) return 'light';
      if (/dark/i.test(themeName)) return 'dark';
    }
    return 'dark';
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
   * Also aligns base theme (Default Dark Modern / Default Light Modern) when needed to prevent
   * mixed-theme artifacts or white Welcome webview surfaces.
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

    // Align base colorTheme (light vs dark) so native surfaces (Welcome webview, icons, scrollbars)
    // match project mode coherently without leaving bright white backgrounds or low-contrast text.
    const activeKind = await this.getActiveThemeKind();
    const projectMode = project.mode === 'light' ? 'light' : 'dark';

    if (activeKind !== projectMode) {
      if (this.originalColorTheme === null) {
        this.originalColorTheme = await this.getColorTheme();
      }
      const targetBaseTheme = projectMode === 'light' ? 'Default Light Modern' : 'Default Dark Modern';
      this.lastAppliedColorTheme = targetBaseTheme;
      await this.updateColorTheme(targetBaseTheme);
    }

    // Merge non-destructively: keep unrelated user keys, overwrite only OpenTheme keys
    const mergedWorkbench = { ...currentWorkbench, ...targetWorkbench };
    const mergedToken = { ...currentToken, ...targetToken };

    // Persist the intended last-written values BEFORE mutating native settings
    // so a host crash after either update remains safely recoverable.
    this.lastAppliedWorkbenchColors = { ...targetWorkbench };
    this.lastAppliedTokenColors = { ...targetToken };
    await this.persistTracking();

    await this.updateWorkbenchColors(mergedWorkbench);
    await this.updateTokenColors(mergedToken);

    const appliedCount = Object.keys(targetWorkbench).length + Object.keys(targetToken).length;
    return { appliedCount };
  }

  /**
   * Restores original colors, reverting only keys touched by OpenTheme Studio that still equal
   * their last applied values. If the user changed a key manually, that key is preserved.
   * Also restores base theme if modified and not manually changed by user.
   * @returns {Promise<{ ok: boolean, restoredCount: number }>}
   */
  async restoreOriginalColors() {
    if (!this.lastAppliedWorkbenchColors && !this.lastAppliedTokenColors && !this.lastAppliedColorTheme) {
      return { ok: true, restoredCount: 0 };
    }
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

    // Restore base theme if it was modified by OpenTheme Studio and has not been manually changed by the user
    if (this.lastAppliedColorTheme) {
      const currentTheme = await this.getColorTheme();
      if (currentTheme === this.lastAppliedColorTheme) {
        await this.updateColorTheme(this.originalColorTheme);
        restoredCount++;
      }
    }

    await this.updateWorkbenchColors(nextWorkbench);
    await this.updateTokenColors(nextToken);

    // Clear persistent recovery data only once native settings restore.
    if (this.storage?.update) await this.storage.update(TRACKING_KEY, undefined);

    // Reset applied tracking
    this.lastAppliedWorkbenchColors = null;
    this.lastAppliedTokenColors = null;
    this.originalWorkbenchColors = null;
    this.originalTokenColors = null;
    this.originalColorTheme = null;
    this.lastAppliedColorTheme = null;

    return { ok: true, restoredCount };
  }
}
