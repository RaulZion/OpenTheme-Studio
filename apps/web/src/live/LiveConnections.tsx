import { useEffect, useRef, useState } from 'react';
import { Unplug } from 'lucide-react';
import type { ThemeProject } from '../../../../contracts/adapter-api';
import { Dialog } from '../Dialogs';
import { serializeProject } from '../model';
import { createObsidianSink } from './obsidian';
import type { ConfigDirectory, ObsidianSink } from './obsidian';
import { LiveSync } from './sync';
import type { LiveState } from './sync';
import { LOCAL_ORIGINS, requireLocalOrigin } from './vscode';
import type { Receipt } from './vscode';
import { initialVSState, PAIRING_STORAGE_KEY, RememberedVSCode } from './remembered-vscode';

declare global {
  interface Window { showDirectoryPicker?: (options: { id: string; mode: 'readwrite' }) => Promise<ConfigDirectory> }
}
const disconnected: LiveState = { phase: 'disconnected', message: 'Local edits only. Connect once to apply changes automatically.' };
const labels = { disconnected: 'Disconnected', connecting: 'Connecting…', pending: 'Changes pending', syncing: 'Applying…', connected: 'Connected', waiting: 'Waiting for VS Code', error: 'Sync paused — error' };
const active = (state: LiveState) => ['connected', 'pending', 'syncing'].includes(state.phase);
// The initial idle message repeats the band intro, so the card shows a short app-specific hint instead.
const quiet = (state: LiveState) => state.message === disconnected.message;
const errorMessage = (error: unknown) => error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)
  ? 'Folder permission denied or revoked. Reconnect in local Chromium and grant access to .obsidian.'
  : error instanceof Error ? error.message : 'Live application failed. Local edits are kept; reconnect to retry.';

export default function LiveConnections({ project }: { project: ThemeProject }) {
  const [vs, setVS] = useState(initialVSState);
  const [obsidian, setObsidian] = useState<LiveState>(disconnected);
  const [channels] = useState(() => ({ obsidian: new LiveSync(setObsidian) }));
  const [pairingOpen, setPairingOpen] = useState(false);
  const [code, setCode] = useState('');
  const [pairError, setPairError] = useState('');
  const [vscode] = useState(() => new RememberedVSCode(state => { setVS(state); if (state.phase === 'error') setPairError(state.message); }));
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const attempts = useRef<{ obsidian?: AbortController }>({});
  const sinks = useRef<{ obsidian?: ObsidianSink }>({});
  const latest = useRef(project);
  latest.current = project;
  const local = LOCAL_ORIGINS.includes(location.origin);
  const canPick = local && window.isSecureContext && typeof window.showDirectoryPicker === 'function';

  useEffect(() => { vscode.edit(project); channels.obsidian.edit(project); }, [channels, vscode, project]);
  useEffect(() => {
    vscode.start(latest.current);
    const storage = (event: StorageEvent) => { if (event.key === PAIRING_STORAGE_KEY || event.key === null) vscode.storageChanged(); };
    const wake = () => { if (!document.hidden) vscode.wake(); };
    window.addEventListener('storage', storage); window.addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
    return () => {
      window.removeEventListener('storage', storage); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake);
      vscode.dispose(); attempts.current.obsidian?.abort(); channels.obsidian.disconnect(false); sinks.current = {};
    };
  }, [channels, vscode]);

  function stop(app: 'vscode' | 'obsidian') {
    if (app === 'vscode') { vscode.forget(); return; }
    attempts.current[app]?.abort(); delete attempts.current[app];
    channels[app].disconnect();
  }
  function closePairing() {
    if (vs.phase === 'connecting') stop('vscode');
    setCode(''); setPairError(''); setPairingOpen(false);
  }
  function confirmed(app: 'obsidian', snapshot: ThemeProject, receipt: Receipt) {
    channels[app].connected(sinks.current[app]!, receipt);
    if (serializeProject(snapshot) !== serializeProject(latest.current)) channels[app].edit(latest.current);
  }
  async function connectVSCode() {
    const token = code.trim(); setCode(''); setPairError('');
    if (await vscode.pair(token, latest.current)) setPairingOpen(false);
  }
  async function connectObsidian() {
    attempts.current.obsidian?.abort();
    const controller = new AbortController(); attempts.current.obsidian = controller;
    setObsidian({ phase: 'connecting', message: 'Choose .obsidian and grant read/write access to the generated snippet.' });
    try {
      requireLocalOrigin();
      if (!canPick) throw new Error('Folder access requires local Chromium with the File System Access API.');
      // First asynchronous operation is the native picker, directly in this click's user activation.
      const directory = await window.showDirectoryPicker!({ id: 'opentheme-obsidian', mode: 'readwrite' });
      controller.signal.throwIfAborted();
      const sink = await createObsidianSink(directory);
      const snapshot = latest.current;
      sinks.current.obsidian = sink;
      const receipt = await sink.apply(snapshot, controller.signal);
      controller.signal.throwIfAborted(); confirmed('obsidian', snapshot, receipt);
    } catch (error) {
      if (controller.signal.aborted) return;
      channels.obsidian.disconnect(false);
      setObsidian(error instanceof DOMException && error.name === 'AbortError'
        ? { phase: 'disconnected', message: 'Folder selection canceled. No live connection.' }
        : { phase: 'error', message: errorMessage(error) });
    }
  }
  async function cleanup(app: 'vscode' | 'obsidian') {
    if (app === 'vscode') {
      setCleanupBusy(true);
      try { await vscode.restore(); } finally { setCleanupBusy(false); }
      return;
    }
    const sink = sinks.current[app]; if (!sink) return;
    setCleanupBusy(true);
    attempts.current[app]?.abort(); channels[app].disconnect(false);
    const publish = setObsidian;
    publish({ phase: 'syncing', message: 'Checking ownership before removing the generated snippet…' });
    try {
      await channels[app].idle();
      const signal = new AbortController().signal;
      await sink.remove(signal);
      delete sinks.current[app];
      publish({ phase: 'disconnected', message: 'Owned snippet removed. Sync stopped; no other file changed.' });
    } catch (error) { publish({ phase: 'error', message: errorMessage(error) }); }
    finally { setCleanupBusy(false); }
  }
  return <section className="live-connections" aria-label="Live application">
    <div className="live-intro"><strong>Connect your apps</strong><p>Connect once. Every edit, undo and import then applies automatically.</p>
      <details className="live-details"><summary>How it works</summary>
        <p><strong>VS Code.</strong> Studio talks only to the companion at 127.0.0.1:43187. Pairing is remembered for this browser profile and exact Studio address, and reconnects automatically after restarts. Clearing site data, revocation, Disconnect or Forget ends the saved pairing. Disconnect keeps the last colors; restore here first or use the extension's restore command.</p>
        <p><strong>Obsidian.</strong> Choose the <code>.obsidian</code> configuration folder. Enable <strong>opentheme-studio</strong> once in Obsidian’s CSS snippets settings; subsequent saves reload automatically. Only <code>snippets/opentheme-studio.css</code> is written. No vault notes are read. Keep Obsidian open; the browser cannot detect its running state or snippet enablement.</p>
      </details>
    </div>
    <div className="live-targets">
      <article className="live-target" aria-label="VS Code live connection">
        <div className="live-target-heading">
          <div className="live-name"><strong>VS Code</strong><span className={`live-phase live-${vs.phase}`}>{labels[vs.phase]}</span></div>
          <div className="live-actions">{active(vs) ? <button className="secondary-button" disabled={cleanupBusy} onClick={() => stop('vscode')}><Unplug size={18} /> Disconnect VS Code</button> : <button className="primary-button" disabled={!local || vs.phase === 'connecting' || cleanupBusy} onClick={() => { if (vs.hasPairing) vscode.reconnect(); else { setPairError(''); setPairingOpen(true); } }}>{vs.hasPairing ? 'Reconnect VS Code' : 'Connect VS Code'}</button>}
            {vs.canRestore && <button className="secondary-button" disabled={cleanupBusy} onClick={() => void cleanup('vscode')}>Restore VS Code colors</button>}
            {vs.hasPairing && !active(vs) && <button className="toolbar-button" disabled={cleanupBusy} onClick={() => stop('vscode')}>Forget VS Code connection</button>}</div>
        </div>
        <p className="live-message" aria-live="polite">{quiet(vs) ? '' : vs.message}</p>{vs.warning && <p className="live-warning">{vs.warning}</p>}
        {quiet(vs) && <p className="live-hint">Requires the OpenTheme Studio companion extension.</p>}
      </article>
      <article className="live-target" aria-label="Obsidian live connection">
        <div className="live-target-heading">
          <div className="live-name"><strong>Obsidian</strong><span className={`live-phase live-${obsidian.phase}`}>{labels[obsidian.phase]}</span></div>
          <div className="live-actions">{active(obsidian) ? <button className="secondary-button" disabled={cleanupBusy} onClick={() => stop('obsidian')}><Unplug size={18} /> Stop Obsidian sync</button> : <button className="primary-button" disabled={!canPick || obsidian.phase === 'connecting' || cleanupBusy} onClick={() => void connectObsidian()}>Connect Obsidian</button>}
            {sinks.current.obsidian && <button className="secondary-button" disabled={cleanupBusy} onClick={() => void cleanup('obsidian')}>Remove generated snippet</button>}</div>
        </div>
        <p className="live-message" aria-live="polite">{quiet(obsidian) ? '' : obsidian.message}</p>
        {!canPick ? <p className="live-warning">Folder access requires local Chromium with the File System Access API.</p> : quiet(obsidian) && <p className="live-hint">You will choose your vault’s <code>.obsidian</code> folder.</p>}
        {active(obsidian) && <p className="live-next">One-time step in Obsidian: enable <strong>opentheme-studio</strong> under <strong>Settings → Appearance → CSS snippets</strong>.</p>}
      </article>
    </div>
    {!local && <p className="live-warning live-origin">Live connections require http://127.0.0.1:5173 or http://localhost:5173. Local editing and optional ZIP sharing remain available here.</p>}
    {pairingOpen && <Dialog title="Connect VS Code" onClose={closePairing}>
      <p className="dialog-subtitle">One-time setup, then automatic color updates.</p>
      <ol className="help-steps"><li>Install the first-party OpenTheme Studio companion extension once in desktop VS Code.</li><li>Run <strong>OpenTheme Studio: Enable Live Sync</strong>, then <strong>Copy pairing code</strong>.</li><li>Paste the code below. Pairing applies your current project immediately using the extension's settings API.</li></ol>
      <form onSubmit={event => { event.preventDefault(); void connectVSCode(); }}><label className="pairing-label" htmlFor="live-pairing-code">Pairing code</label><input className="pairing-input" id="live-pairing-code" type="password" autoComplete="off" spellCheck={false} required maxLength={512} value={code} disabled={vs.phase === 'connecting'} onChange={event => setCode(event.target.value)} />
        {pairError && <p className="field-error" role="alert">{pairError}</p>}
        <button className="primary-button full-width" disabled={!code.trim() || vs.phase === 'connecting'} type="submit">{vs.phase === 'connecting' ? 'Waiting for companion…' : 'Pair, remember and apply'}</button></form>
      <p className="dialog-note">Pairing saves the code in this browser profile for this exact Studio address and applies the current project. It is never included in project JSON, URLs or logs. Clearing site data or using Forget removes the association. Health alone does not mean connected. Close this dialog to cancel pending pairing.</p>
    </Dialog>}
  </section>;
}
