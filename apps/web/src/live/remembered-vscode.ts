import type { ThemeProject } from '../../../../contracts/adapter-api';
import { serializeProject } from '../model';
import { LiveSync } from './sync';
import type { LiveState } from './sync';
import { checkVSCodeHealth, LIVE_PROTOCOL, LOCAL_ORIGINS, pairVSCode, VSCodeConnectionError } from './vscode';
import type { VSCodeSink } from './vscode';
export const PAIRING_STORAGE_KEY = 'opentheme.vscode.pairing.v1';
export interface RememberedVSState extends LiveState { hasPairing: boolean; remembered: boolean; canRestore: boolean }
export const initialVSState: RememberedVSState = { phase: 'disconnected', message: 'Local edits only. Connect once to apply changes automatically.', hasPairing: false, remembered: false, canRestore: false };
export class RememberedVSCode {
  private token?: string;
  private sink?: VSCodeSink;
  private project?: ThemeProject;
  private remembered = false;
  private storageWarning = '';
  private active = false;
  private waiting = false;
  private busy = false;
  private retryStep = 0;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private controller = new AbortController();
  private sync: LiveSync;

  constructor(private publish: (state: RememberedVSState) => void, private origin = location.origin) {
    this.sync = new LiveSync(state => this.emit(state), error => this.failed(error));
  }
  private emit(state: LiveState): void {
    const warning = [state.warning, this.storageWarning].filter(Boolean).join(' ') || undefined;
    this.publish({ ...state, warning, hasPairing: !!this.token, remembered: this.remembered, canRestore: !!this.sink });
  }
  private removeSaved(): boolean {
    try { localStorage.removeItem(PAIRING_STORAGE_KEY); this.remembered = false; this.storageWarning = ''; return true; }
    catch { this.storageWarning = 'Saved pairing could not be erased. Clear this site’s browser data or revoke the code in VS Code.'; return false; }
  }
  private readSaved(): string | null {
    try {
      const text = localStorage.getItem(PAIRING_STORAGE_KEY);
      if (!text) return null;
      const data = JSON.parse(text);
      if (!data || Object.keys(data).sort().join(',') !== 'origin,protocol,token,version' || data.version !== 1 || data.origin !== this.origin || data.protocol !== LIVE_PROTOCOL || typeof data.token !== 'string' || !data.token.length || data.token.length > 512 || /[^\x21-\x7e]/.test(data.token)) {
        this.removeSaved(); return null;
      }
      return data.token;
    } catch {
      this.storageWarning = 'Browser storage is unavailable or saved pairing is unreadable. Pair again; this tab can still connect.';
      return null;
    }
  }
  private save(): void {
    try {
      localStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify({ version: 1, origin: this.origin, protocol: LIVE_PROTOCOL, token: this.token }));
      this.remembered = true; this.storageWarning = '';
    } catch {
      this.remembered = false;
      this.storageWarning = 'Browser storage could not remember this pairing. Connected for this tab only; allow site storage to reconnect after restart.';
    }
  }
  private cancel(): void {
    clearTimeout(this.timer); this.timer = undefined;
    this.generation++; this.controller.abort(); this.controller = new AbortController();
    this.sync.disconnect(false); this.active = false; this.waiting = false; this.busy = false;
  }
  start(project: ThemeProject): void {
    this.project = project;
    if (!LOCAL_ORIGINS.includes(this.origin)) return;
    this.cancel();
    this.token = this.readSaved() ?? undefined;
    this.remembered = !!this.token;
    if (this.token) void this.attempt(this.token);
    else if (this.storageWarning) this.emit({ phase: 'disconnected', message: this.storageWarning });
  }
  edit(project: ThemeProject): void {
    this.project = project;
    if (this.active) this.sync.edit(project);
  }
  async pair(token: string, project: ThemeProject): Promise<boolean> {
    this.project = project;
    return this.attempt(token, true);
  }
  private async attempt(token: string, explicit = false): Promise<boolean> {
    this.cancel();
    const generation = this.generation, signal = this.controller.signal;
    this.busy = true;
    this.emit({ phase: 'connecting', message: 'Checking the companion and waiting for authenticated apply confirmation…' });
    try {
      await this.sync.idle(); signal.throwIfAborted();
      const snapshot = this.project!;
      const paired = await pairVSCode(token, snapshot, signal, this.origin);
      signal.throwIfAborted(); if (generation !== this.generation) return false;
      this.token = token; this.sink = paired.sink;
      if (explicit) this.save();
      this.active = true; this.retryStep = 0;
      this.sync.connected(paired.sink, paired.receipt);
      if (serializeProject(snapshot) !== serializeProject(this.project!)) this.sync.edit(this.project!);
      this.checkLater();
      return true;
    } catch (error) {
      if (generation === this.generation) this.failed(error, !explicit);
      return false;
    } finally { if (generation === this.generation) this.busy = false; }
  }
  private failed(error: unknown, retry = true): void {
    this.cancel();
    const message = error instanceof Error ? error.message : 'VS Code update failed. Reconnect to retry.';
    if (error instanceof VSCodeConnectionError && error.kind === 'unauthorized') {
      this.token = undefined; this.sink = undefined; this.removeSaved();
      this.emit({ phase: 'error', message: `${message} Pair again to remember a new code.` });
    } else if (retry && this.token && error instanceof VSCodeConnectionError && error.kind === 'unavailable') {
      const delays = [1000, 2000, 5000, 10000, 30000, 60000];
      const delay = delays[Math.min(this.retryStep++, delays.length - 1)];
      this.waiting = true;
      this.emit({ phase: 'waiting', message: `Waiting for VS Code. ${message} Retrying automatically in ${delay / 1000}s.` });
      this.timer = setTimeout(() => { if (this.token) void this.attempt(this.token); }, delay);
    } else {
      this.emit({ phase: 'error', message });
    }
  }
  private checkLater(): void {
    const generation = this.generation;
    this.timer = setTimeout(async () => {
      if (!this.active || !this.token) return;
      try {
        await checkVSCodeHealth(this.controller.signal, this.origin);
        if (generation === this.generation) this.checkLater();
      } catch (error) { if (generation === this.generation) this.failed(error); }
    }, 10000);
  }
  reconnect(): void { if (this.token) void this.attempt(this.token); }
  wake(): void { if (this.waiting && !this.busy) this.reconnect(); }
  storageChanged(): void {
    if (!LOCAL_ORIGINS.includes(this.origin)) return;
    const token = this.readSaved();
    if (token === this.token) return;
    this.cancel(); this.token = token ?? undefined; this.sink = undefined; this.remembered = !!token;
    if (token) void this.attempt(token);
    else this.emit({ phase: 'disconnected', message: 'Saved pairing removed. Automatic updates stopped.' });
  }
  forget(): void {
    this.cancel(); this.token = undefined; this.sink = undefined;
    const erased = this.removeSaved();
    this.emit({ phase: erased ? 'disconnected' : 'error', message: erased ? 'Pairing forgotten. Automatic updates stopped; last colors are kept.' : this.storageWarning });
  }
  dispose(): void { this.cancel(); this.token = undefined; this.sink = undefined; }
  async restore(): Promise<void> {
    const sink = this.sink; if (!sink) return;
    this.cancel();
    // A lost restore acknowledgment must never cause a later browser restart to reapply colors.
    // Keep the code in memory for an explicit retry, but end remembered automatic application now.
    this.removeSaved();
    const generation = this.generation, signal = this.controller.signal;
    this.emit({ phase: 'syncing', message: 'Waiting for safe restore confirmation…' });
    try {
      await this.sync.idle(); signal.throwIfAborted();
      await checkVSCodeHealth(signal, this.origin);
      await sink.restore(signal); signal.throwIfAborted();
      if (generation !== this.generation) return;
      this.token = undefined; this.sink = undefined;
      const erased = this.removeSaved();
      this.emit({ phase: erased ? 'disconnected' : 'error', message: erased ? 'Restore confirmed by companion. Disconnected; saved pairing forgotten.' : this.storageWarning });
    } catch (error) {
      if (generation === this.generation) this.failed(error, false);
    }
  }
}
