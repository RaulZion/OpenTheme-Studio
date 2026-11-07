import { useEffect, useRef, useState } from 'react';
import { Plug, Unplug } from 'lucide-react';
import type { ThemeProject } from '../../../../contracts/adapter-api';
import { Dialog } from '../Dialogs';
import { serializeProject } from '../model';
import { createObsidianSink } from './obsidian';
import type { ConfigDirectory, ObsidianSink } from './obsidian';
import { LiveSync } from './sync';
import type { LiveState } from './sync';
import { LOCAL_ORIGINS, pairVSCode, requireLocalOrigin } from './vscode';
import type { Receipt, VSCodeSink } from './vscode';

declare global {
  interface Window { showDirectoryPicker?: (options: { id: string; mode: 'readwrite' }) => Promise<ConfigDirectory> }
}
const disconnected: LiveState = { phase: 'disconnected', message: 'Local edits only. Connect once to apply changes automatically.' };
const labels = { disconnected: 'Disconnected', connecting: 'Connecting…', pending: 'Changes pending', syncing: 'Applying…', connected: 'Connected', error: 'Sync paused — error' };
const active = (state: LiveState) => ['connected', 'pending', 'syncing'].includes(state.phase);
const errorMessage = (error: unknown) => error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)
  ? 'Folder permission denied or revoked. Reconnect in local Chromium and grant access to .obsidian.'
  : error instanceof Error ? error.message : 'Live application failed. Local edits are kept; reconnect to retry.';

export default function LiveConnections({ project }: { project: ThemeProject }) {
  const [vs, setVS] = useState<LiveState>(disconnected);
  const [obsidian, setObsidian] = useState<LiveState>(disconnected);
  const [channels] = useState(() => ({ vscode: new LiveSync(setVS), obsidian: new LiveSync(setObsidian) }));
  const [pairingOpen, setPairingOpen] = useState(false);
  const [code, setCode] = useState('');
  const [pairError, setPairError] = useState('');
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const attempts = useRef<Partial<Record<'vscode' | 'obsidian', AbortController>>>({});
  const sinks = useRef<{ vscode?: VSCodeSink; obsidian?: ObsidianSink }>({});
  const latest = useRef(project);
  latest.current = project;
  const local = LOCAL_ORIGINS.includes(location.origin);
  const canPick = local && window.isSecureContext && typeof window.showDirectoryPicker === 'function';

  useEffect(() => { channels.vscode.edit(project); channels.obsidian.edit(project); }, [channels, project]);
  useEffect(() => () => {
    attempts.current.vscode?.abort(); attempts.current.obsidian?.abort();
    channels.vscode.disconnect(false); channels.obsidian.disconnect(false);
    sinks.current = {};
  }, [channels]);

  function stop(app: 'vscode' | 'obsidian') {
    attempts.current[app]?.abort(); delete attempts.current[app];
    channels[app].disconnect();
    if (app === 'vscode') delete sinks.current.vscode;
  }
  function closePairing() {
    if (vs.phase === 'connecting') stop('vscode');
    setCode(''); setPairError(''); setPairingOpen(false);
  }
  function confirmed(app: 'vscode' | 'obsidian', snapshot: ThemeProject, receipt: Receipt) {
    channels[app].connected(sinks.current[app]!, receipt);
    if (serializeProject(snapshot) !== serializeProject(latest.current)) channels[app].edit(latest.current);
  }
  async function connectVSCode() {
    const token = code.trim(); setCode(''); setPairError('');
    attempts.current.vscode?.abort();
    const controller = new AbortController(); attempts.current.vscode = controller;
    setVS({ phase: 'connecting', message: 'Checking the companion, then authenticating and applying the current project…' });
    try {
      const snapshot = latest.current;
      const paired = await pairVSCode(token, snapshot, controller.signal);
      controller.signal.throwIfAborted();
      sinks.current.vscode = paired.sink; confirmed('vscode', snapshot, paired.receipt);
      setPairingOpen(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = errorMessage(error);
      channels.vscode.disconnect(false); delete sinks.current.vscode;
      setVS({ phase: 'error', message }); setPairError(message);
    }
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
    const sink = sinks.current[app]; if (!sink) return;
    setCleanupBusy(true);
    attempts.current[app]?.abort(); channels[app].disconnect(false);
    const publish = app === 'vscode' ? setVS : setObsidian;
    publish({ phase: 'syncing', message: app === 'vscode' ? 'Waiting for safe restore confirmation…' : 'Checking ownership before removing the generated snippet…' });
    try {
      await channels[app].idle();
      const signal = new AbortController().signal;
      if (app === 'vscode') await (sink as VSCodeSink).restore(signal);
      else await (sink as ObsidianSink).remove(signal);
      delete sinks.current[app];
      publish({ phase: 'disconnected', message: app === 'vscode' ? 'Restore confirmed by companion. Disconnected; pairing code forgotten.' : 'Owned snippet removed. Sync stopped; no other file changed.' });
    } catch (error) { publish({ phase: 'error', message: errorMessage(error) }); }
    finally { setCleanupBusy(false); }
  }
  return <section className="live-connections" aria-label="Live application">
    <div className="live-intro"><strong><Plug size={16} /> Live application</strong><span>Connect once. Edits, undo and imports apply automatically.</span></div>
    <div className="live-targets">
      <article className="live-target" aria-label="VS Code live connection">
        <div className="live-target-heading"><strong>VS Code</strong><span className={`live-phase live-${vs.phase}`}>{labels[vs.phase]}</span></div>
        <p aria-live="polite">{vs.message}</p>{vs.warning && <p className="live-warning">{vs.warning}</p>}
        <div className="live-actions">{active(vs) ? <button className="secondary-button" disabled={cleanupBusy} onClick={() => stop('vscode')}><Unplug size={14} /> Disconnect VS Code</button> : <button className="primary-button" disabled={!local || vs.phase === 'connecting' || cleanupBusy} onClick={() => { setPairError(''); setPairingOpen(true); }}>Connect VS Code</button>}
          {sinks.current.vscode && <button className="toolbar-button" disabled={cleanupBusy} onClick={() => void cleanup('vscode')}>Restore VS Code colors</button>}
          {sinks.current.vscode && vs.phase === 'error' && <button className="toolbar-button" onClick={() => stop('vscode')}>Forget VS Code connection</button>}</div>
        <small>Companion at 127.0.0.1:43187. Session-only pairing; disconnect forgets the code and keeps the last colors. Restore here before disconnecting, or use the extension's restore command.</small>
      </article>
      <article className="live-target" aria-label="Obsidian live connection">
        <div className="live-target-heading"><strong>Obsidian</strong><span className={`live-phase live-${obsidian.phase}`}>{labels[obsidian.phase]}</span></div>
        <p aria-live="polite">{obsidian.message}</p>
        <div className="live-actions">{active(obsidian) ? <button className="secondary-button" disabled={cleanupBusy} onClick={() => stop('obsidian')}><Unplug size={14} /> Stop Obsidian sync</button> : <button className="primary-button" disabled={!canPick || obsidian.phase === 'connecting' || cleanupBusy} onClick={() => void connectObsidian()}>Connect Obsidian</button>}
          {sinks.current.obsidian && <button className="toolbar-button" disabled={cleanupBusy} onClick={() => void cleanup('obsidian')}>Remove generated snippet</button>}</div>
        <small>{!canPick && 'Folder access requires local Chromium with the File System Access API. '}Choose the <code>.obsidian</code> configuration folder. Enable <strong>opentheme-studio</strong> once in <strong>Settings → Appearance → CSS snippets</strong>; subsequent saves reload automatically. Only <code>snippets/opentheme-studio.css</code> is written. No vault notes are read. Keep Obsidian open; the browser cannot detect its running state or snippet enablement.</small>
      </article>
    </div>
    {!local && <p className="live-warning">Live connections require http://127.0.0.1:5173 or http://localhost:5173. Local editing and optional ZIP sharing remain available here.</p>}
    {pairingOpen && <Dialog title="Connect VS Code" onClose={closePairing}>
      <p className="dialog-subtitle">One-time setup, then automatic color updates.</p>
      <ol className="help-steps"><li>Install the first-party OpenTheme Studio companion extension once in desktop VS Code.</li><li>Run <strong>OpenTheme Studio: Enable Live Sync</strong>, then <strong>Copy pairing code</strong>.</li><li>Paste the code below. Pairing applies your current project immediately using the extension's settings API.</li></ol>
      <form onSubmit={event => { event.preventDefault(); void connectVSCode(); }}><label className="pairing-label" htmlFor="live-pairing-code">Pairing code</label><input className="pairing-input" id="live-pairing-code" type="password" autoComplete="off" spellCheck={false} required maxLength={512} value={code} disabled={vs.phase === 'connecting'} onChange={event => setCode(event.target.value)} />
        {pairError && <p className="field-error" role="alert">{pairError}</p>}
        <button className="primary-button full-width" disabled={!code.trim() || vs.phase === 'connecting'} type="submit">{vs.phase === 'connecting' ? 'Waiting for companion…' : 'Pair and apply'}</button></form>
      <p className="dialog-note">The code stays in this tab's memory and is never saved in project JSON or browser storage. Health alone does not mean connected. Close this dialog to cancel a pending pairing.</p>
    </Dialog>}
  </section>;
}
