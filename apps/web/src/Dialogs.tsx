import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownToLine, CircleHelp, Info, X } from 'lucide-react';
import type { ThemeProject } from '../../../contracts/adapter-api';
import { appNames, targetVersion } from './development-adapters';
import { createNativeArchive, downloadNativeArchive, nativeAdapter } from './native-export';
import type { EditorApp } from './development-adapters';

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    container.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    // A browser download can move keyboard focus outside the dialog.
    // Keep Escape functional while this modal remains mounted.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={container} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const elements = Array.from(container.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]'));
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}><button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><X size={20} /></button><h2 id="dialog-title">{title}</h2>{children}</div>
  </div>;
}

export function ExportDialog({ project, app, onClose, onSave }: { project: ThemeProject; app: EditorApp; onClose: () => void; onSave: () => void }) {
  const adapter = nativeAdapter(app);
  const issues = adapter.validate(project, targetVersion(app));
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [installSteps, setInstallSteps] = useState<string[]>([]);

  async function startExport() {
    setBusy(true);
    setMessage('');
    try {
      const archive = await createNativeArchive(project, app);
      downloadNativeArchive(archive);
      setInstallSteps(archive.result.installSteps);
      setMessage('Native theme ZIP downloaded. Follow README.md inside the archive for manual installation.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Theme export failed.');
    } finally {
      setBusy(false);
    }
  }

  return <Dialog title="Export your theme" onClose={onClose}>
    <p className="dialog-subtitle">Take your colors into your apps. Install manually.</p>
    <div className="export-project"><span className="export-swatch" style={{ background: project.tokens.accent }} /><div><strong>{project.name}</strong><span>{appNames[app]} · {project.mode} theme</span></div></div>
    <div className="unavailable-notice"><Info size={19} /><div>
      <strong>Native theme files ready</strong>
      <p>Download a standard ZIP with the app's native files and an installation README. It is not a VSIX or an automatic installer.</p>
    </div></div>
    <dl className="compatibility-list">
      <div><dt>Documentation target</dt><dd>{appNames[app]} {targetVersion(app)}</dd></div>
      <div><dt>Native installation</dt><dd>Target version not independently verified</dd></div>
      <div><dt>Preview appearance</dt><dd>Illustrative · not pixel-verified</dd></div>
      <div><dt>Adapter</dt><dd>Native file exporter</dd></div>
    </dl>
    {warnings.length > 0 && <p className="dialog-note" role="status"><Info size={15} />{warnings.length} contrast or compatibility warning(s). Check color readability in the actual app.</p>}
    {errors.length > 0 && <p className="dialog-note" role="alert">{errors[0].message}</p>}
    {message && <p className="dialog-note" role={message.startsWith('Native theme ZIP') ? 'status' : 'alert'}>{message}</p>}
    {installSteps.length > 0 && <div className="dialog-note"><strong>Install after extraction:</strong><ol>{installSteps.map((step, index) => <li key={index}>{step.replace(/^\d+\.\s*/, '')}</li>)}</ol></div>}
    <button className="primary-button full-width" disabled={busy || errors.length > 0} onClick={() => void startExport()}>
      <ArrowDownToLine size={15} /> {busy ? 'Packaging theme…' : 'Download ' + appNames[app] + ' theme ZIP'}
    </button>
    <button className="secondary-button full-width" onClick={onSave}><ArrowDownToLine size={15} /> Download project JSON</button>
  </Dialog>;
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return <Dialog title="Make it feel like you" onClose={onClose}><p className="dialog-subtitle">A few small things to get you started.</p><ol className="help-steps"><li>Choose VS Code or Obsidian, then click an outlined preview region to select its color.</li><li>Edit the shared palette for both apps, or choose “Only this app” for an isolated override.</li><li>Download project JSON for a portable backup. Importing a project can be undone.</li></ol><div className="shortcut-list"><span>Undo document edit</span><kbd>Ctrl / ⌘ Z</kbd><span>Redo document edit</span><kbd>Ctrl / ⌘ ⇧ Z</kbd><span>Close dialog</span><kbd>Esc</kbd></div><p className="dialog-note"><CircleHelp size={16} />In text fields, standard text undo is preserved. Use the toolbar to undo document edits while typing. Edits are saved in this browser when local storage is available.</p><p className="dialog-note">All scenes are original illustrations. Syntax details and native app appearance may differ. Native ZIP exports contain installable app theme files and manual instructions; native appearance is still unverified.</p></Dialog>;
}
