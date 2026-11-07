import type { ThemeProject } from '../../../../contracts/adapter-api';
import type { LiveSink, Receipt } from './vscode';
export interface LiveState { phase: 'disconnected' | 'connecting' | 'pending' | 'syncing' | 'connected' | 'error'; message: string; warning?: string }
export class LiveSync {
  private sink?: LiveSink;
  private latest?: ThemeProject;
  private timer?: ReturnType<typeof setTimeout>;
  private revision = 0;
  private generation = 0;
  private due = false;
  private inFlight?: Promise<void>;
  private controller = new AbortController();
  constructor(private publish: (state: LiveState) => void) {}

  connected(sink: LiveSink, receipt: Receipt): void {
    this.disconnect(false);
    this.sink = sink;
    this.publish({ phase: 'connected', ...receipt });
  }
  edit(project: ThemeProject): void {
    if (!this.sink) return;
    this.latest = structuredClone(project);
    this.revision++;
    this.due = false;
    clearTimeout(this.timer);
    this.publish({ phase: 'pending', message: 'Changes pending — not yet applied.' });
    this.timer = setTimeout(() => { this.due = true; this.flush(); }, 300);
  }
  private flush(): void {
    if (!this.sink || !this.latest || this.inFlight || !this.due) return;
    this.due = false;
    const sink = this.sink, project = this.latest, revision = this.revision, generation = this.generation;
    this.publish({ phase: 'syncing', message: 'Applying changes… waiting for confirmation.' });
    this.inFlight = (async () => {
      try {
        const receipt = await sink.apply(project, this.controller.signal);
        if (generation === this.generation && revision === this.revision) this.publish({ phase: 'connected', ...receipt });
      } catch (error) {
        if (generation !== this.generation) return;
        this.disconnect(false);
        this.publish({ phase: 'error', message: error instanceof Error ? error.message : 'Live update failed. Reconnect to retry.' });
      }
    })().finally(() => {
      this.inFlight = undefined;
      this.flush();
    });
  }
  disconnect(notify = true): void {
    clearTimeout(this.timer);
    this.generation++; this.due = false; this.sink = undefined; this.latest = undefined;
    this.controller.abort(); this.controller = new AbortController();
    if (notify) this.publish({ phase: 'disconnected', message: 'Disconnected. Automatic updates stopped; last applied colors are kept.' });
  }
  async idle(): Promise<void> { await this.inFlight; }
}
