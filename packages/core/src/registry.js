/**
 * Central AdapterRegistry for OpenTheme Studio.
 * Manages official and modular adapters with target version checks.
 */

export class AdapterRegistry {
  constructor() {
    /** @type {Map<string, import('../../../contracts/adapter-api.js').ThemeAdapter>} */
    this._adapters = new Map();
  }

  /**
   * Registers a ThemeAdapter.
   * @param {import('../../../contracts/adapter-api.js').ThemeAdapter} adapter
   */
  register(adapter) {
    if (!adapter || typeof adapter.id !== 'string') {
      throw new Error('Adapter must provide a valid string id');
    }
    this._adapters.set(adapter.id, adapter);
  }

  /**
   * Retrieves an adapter by its AppId.
   * @param {string} id
   * @returns {import('../../../contracts/adapter-api.js').ThemeAdapter | undefined}
   */
  get(id) {
    return this._adapters.get(id);
  }

  /**
   * Checks whether an adapter is registered.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._adapters.has(id);
  }

  /**
   * Returns a list of all registered adapters.
   * @returns {import('../../../contracts/adapter-api.js').ThemeAdapter[]}
   */
  list() {
    return Array.from(this._adapters.values());
  }

  /**
   * Validates whether a specific app and target version are supported by the registered adapters.
   * @param {string} appId
   * @param {string} targetVersion
   * @returns {{ supported: boolean, issue?: import('../../../contracts/adapter-api.js').ValidationIssue }}
   */
  checkVersionSupport(appId, targetVersion) {
    const adapter = this.get(appId);
    if (!adapter) {
      return {
        supported: false,
        issue: {
          severity: 'error',
          code: 'ADAPTER_NOT_FOUND',
          message: `No adapter registered for application "${appId}"`,
          path: `appOverrides.${appId}`,
        },
      };
    }

    if (!adapter.supportedVersions.includes(targetVersion)) {
      return {
        supported: false,
        issue: {
          severity: 'error',
          code: 'ADAPTER_VERSION_UNSUPPORTED',
          message: `Version "${targetVersion}" is not supported by adapter "${appId}". Supported versions: ${adapter.supportedVersions.join(', ')}`,
          path: 'version',
        },
      };
    }

    return { supported: true };
  }
}

/** Global default registry instance */
export const defaultRegistry = new AdapterRegistry();
