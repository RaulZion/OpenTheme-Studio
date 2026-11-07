/**
 * OpenTheme Studio Live Sync VS Code Extension.
 * Provides live synchronization between OpenTheme Studio and the local VS Code desktop application.
 */

import { StateManager } from './state-manager.js';
import { LiveSyncServer, DEFAULT_PORT } from './server.js';

/** @type {LiveSyncServer | null} */
let activeServer = null;
/** @type {StateManager | null} */
let activeStateManager = null;
/** @type {any} */
let statusBarItem = null;

/**
 * Extension activation callback.
 * @param {any} context
 */
export async function activate(context) {
  let vscode;
  try {
    vscode = await import('vscode');
  } catch {
    // In test environment without vscode host
    return;
  }

  activeStateManager = new StateManager({
    storage: context.globalState,
  });

  activeServer = new LiveSyncServer({
    stateManager: activeStateManager,
    appVersion: vscode.version || '1.144.0',
  });

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'opentheme.enableLiveSync';
  context.subscriptions.push(statusBarItem);

  const enableCommand = vscode.commands.registerCommand(
    'opentheme.enableLiveSync',
    async () => {
      try {
        await activeServer.start(DEFAULT_PORT, '127.0.0.1');
        const code = activeStateManager.getPairingCode();

        statusBarItem.text = '$(sync~spin) OpenTheme: Live (43187)';
        statusBarItem.tooltip = `OpenTheme Studio Live Sync active on 127.0.0.1:${DEFAULT_PORT}. Click to view pairing code.`;
        statusBarItem.show();

        const action = await vscode.window.showInformationMessage(
          `OpenTheme Studio Live Sync active on 127.0.0.1:${DEFAULT_PORT}. Pairing code: ${code}`,
          'Copy Pairing Code',
          'Disconnect'
        );

        if (action === 'Copy Pairing Code') {
          await vscode.env.clipboard.writeText(code);
          vscode.window.showInformationMessage('Pairing code copied to clipboard!');
        } else if (action === 'Disconnect') {
          await vscode.commands.executeCommand('opentheme.disconnect');
        }
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to start OpenTheme Live Sync: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  );

  const regenerateCommand = vscode.commands.registerCommand(
    'opentheme.regenerateCode',
    async () => {
      if (!activeStateManager) return;
      const newCode = activeStateManager.regeneratePairingCode();
      const action = await vscode.window.showInformationMessage(
        `OpenTheme Studio: New pairing code generated: ${newCode}`,
        'Copy Pairing Code'
      );
      if (action === 'Copy Pairing Code') {
        await vscode.env.clipboard.writeText(newCode);
        vscode.window.showInformationMessage('New pairing code copied to clipboard!');
      }
    }
  );

  const restoreCommand = vscode.commands.registerCommand(
    'opentheme.restoreColors',
    async () => {
      if (!activeStateManager) return;
      try {
        const result = await activeStateManager.restoreOriginalColors();
        vscode.window.showInformationMessage(
          `OpenTheme Studio: Restored original colors (${result.restoredCount} settings reverted).`
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          `OpenTheme Studio: Failed to restore colors: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  );

  const disconnectCommand = vscode.commands.registerCommand(
    'opentheme.disconnect',
    async () => {
      if (activeServer) {
        await activeServer.stop();
      }
      if (statusBarItem) {
        statusBarItem.hide();
      }
      vscode.window.showInformationMessage('OpenTheme Studio: Live Sync disconnected.');
    }
  );

  context.subscriptions.push(
    enableCommand,
    regenerateCommand,
    restoreCommand,
    disconnectCommand
  );
}

/**
 * Extension deactivation callback.
 */
export async function deactivate() {
  if (activeServer) {
    await activeServer.stop();
    activeServer = null;
  }
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }
}
