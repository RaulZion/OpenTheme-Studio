import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownToLine, CircleHelp, Info, LockKeyhole, X } from 'lucide-react';
import type { ThemeProject } from '../../../contracts/adapter-api';
import { appNames, developmentAdapter, targetVersion } from './development-adapters';
import type { EditorApp } from './development-adapters';

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    container.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={container} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const elements = Array.from(container.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]'));
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}><button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button><div className="dialog-mark"><ArrowDownToLine size={24} /></div><h2 id="dialog-title">{title}</h2>{children}</div>
  </div>;
}

export function ExportDialog({ project, app, onClose, onSave }: { project: ThemeProject; app: EditorApp; onClose: () => void; onSave: () => void }) {
  const adapter = developmentAdapter(app);
  return <Dialog title="Export your theme" onClose={onClose}><p className="dialog-subtitle">Take your colors with you.</p>
    <div className="export-project"><span className="export-swatch" style={{ background: project.tokens.accent }} /><div><strong>{project.name}</strong><span>{appNames[app]} · {project.mode} theme</span></div></div>
    <div className="unavailable-notice"><LockKeyhole size={19} /><div><strong>Native export is not available</strong><p>{adapter.validate(project, targetVersion(app))[0].message}</p></div></div>
    <dl className="compatibility-list"><div><dt>Documentation target</dt><dd>{appNames[app]} {targetVersion(app)}</dd></div><div><dt>Native installation</dt><dd>Not tested</dd></div><div><dt>Preview appearance</dt><dd>Illustrative · not verified</dd></div><div><dt>Adapter</dt><dd>Development placeholder</dd></div></dl>
    <p className="dialog-note"><Info size={15} />No native files or installation steps are produced. Your project JSON is portable between OpenTheme Studio sessions; it is not an installable theme.</p>
    <button className="primary-button full-width" disabled><LockKeyhole size={15} /> Native export unavailable</button>
    <button className="secondary-button full-width" onClick={onSave}><ArrowDownToLine size={15} /> Download project JSON</button>
  </Dialog>;
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return <Dialog title="Make it feel like you" onClose={onClose}><p className="dialog-subtitle">A few small things to get you started.</p><ol className="help-steps"><li>Choose VS Code or Obsidian, then click an outlined preview region to select its color.</li><li>Edit the shared palette for both apps, or choose “Only this app” for an isolated override.</li><li>Download project JSON for a portable backup. Importing a project can be undone.</li></ol><div className="shortcut-list"><span>Undo document edit</span><kbd>Ctrl / ⌘ Z</kbd><span>Redo document edit</span><kbd>Ctrl / ⌘ ⇧ Z</kbd><span>Close dialog</span><kbd>Esc</kbd></div><p className="dialog-note"><CircleHelp size={16} />In text fields, standard text undo is preserved. Use the toolbar to undo document edits while typing. Edits are saved in this browser when local storage is available.</p><p className="dialog-note">All scenes are original illustrations. Syntax details and native app appearance may differ. The current development adapter cannot create native theme files.</p></Dialog>;
}
