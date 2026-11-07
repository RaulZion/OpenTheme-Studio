import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, CircleHelp, Code2, Eye, Layers3, Menu, Moon, MoreHorizontal, MousePointer2, PanelRight, Redo2, Search, Sun, Undo2, X } from 'lucide-react';
import type { ColorBinding, SemanticRole, ThemeProject } from '../../../contracts/adapter-api';
import { appNames, regions, targetVersion } from './development-adapters';
import type { EditorApp } from './development-adapters';
import { commit, createHistory, parseProject, redo, resetApp, resetOverride, serializeProject, setColor, undo } from './model';
import { presets, starter } from './presets';
import Inspector from './Inspector';
import Preview from './Preview';
import { ExportDialog, HelpDialog } from './Dialogs';
import LiveConnections from './live/LiveConnections';

const STORAGE_KEY = 'opentheme.project.v1';
function loadProject() {
  try { const saved = localStorage.getItem(STORAGE_KEY); return { project: saved ? parseProject(saved) : structuredClone(starter), error: '' }; }
  catch { return { project: structuredClone(starter), error: 'Could not restore this browser’s saved project. Saved data is untouched; this session stays in memory. Download a JSON backup of your edits.' }; }
}

function ProjectName({ name, onChange }: { name: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  return <input className="project-name" aria-label="Project name" value={draft} maxLength={100} spellCheck={false} onChange={event => setDraft(event.target.value)} onBlur={() => { const value = draft.trim(); if (value && !/[\u0000-\u001f\u007f]/.test(value)) onChange(value); else setDraft(name); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setDraft(name); event.currentTarget.blur(); } }} />;
}

export default function App() {
  const [initial] = useState(loadProject);
  const [history, setHistory] = useState(() => createHistory(initial.project));
  const project = history.present;
  const [app, setApp] = useState<EditorApp>('vscode');
  const [selected, setSelected] = useState<SemanticRole>('canvas');
  const [scope, setScope] = useState<'shared' | 'app'>('shared');
  const [focusRequest, setFocusRequest] = useState(0);
  const [appearance, setAppearance] = useState<'dark' | 'light'>('dark');
  const [dialog, setDialog] = useState<'export' | 'help' | null>(null);
  const [notice, setNotice] = useState(initial.error);
  const [error, setError] = useState(!!initial.error);
  const [stored, setStored] = useState(false);
  const [query, setQuery] = useState('');
  const [comparing, setComparing] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const exportTrigger = useRef<HTMLButtonElement>(null);
  const baseline = useRef(initial.project);
  const region = regions.find(item => item.role === selected)!;
  const update = (next: ThemeProject) => { setHistory(current => commit(current, next)); setComparing(false); };
  const announce = (message: string, failed = false) => { setNotice(message); setError(failed); };

  useEffect(() => {
    if (initial.error) { setStored(false); return; }
    try { localStorage.setItem(STORAGE_KEY, serializeProject(project)); setStored(true); }
    catch { setStored(false); }
  }, [project, initial.error]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (dialog || target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'z') {
        event.preventDefault(); setComparing(false); setHistory(event.shiftKey ? redo : undo);
      } else if (event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'y') {
        event.preventDefault(); setComparing(false); setHistory(redo);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialog]);

  const chooseRegion = (role: SemanticRole) => {
    const chosen = regions.find(item => item.role === role)!;
    setSelected(role); setScope(project.appOverrides?.[app]?.[chosen.keys[app]] ? 'app' : 'shared');
    setInspectorOpen(true); setFocusRequest(count => count + 1);
  };
  const changeApp = (value: EditorApp) => {
    setApp(value); setScope(project.appOverrides?.[value]?.[region.keys[value]] ? 'app' : 'shared');
    setNavigationOpen(false);
  };
  const changeColor = (binding: ColorBinding, value: string) => update(setColor(project, binding, value));
  const saveProject = () => {
    try {
      const json = serializeProject(parseProject(serializeProject(project)));
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `${project.projectId}.theme.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
      announce('Project JSON download started. Keep it as your portable backup.');
    } catch (reason) { announce(`Download failed: ${reason instanceof Error ? reason.message : 'Please try again.'}`, true); }
  };
  const importProject = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > 1_048_576) throw new Error('Project files must be smaller than 1 MB.');
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this file.')); reader.readAsText(file);
      });
      update(parseProject(text)); announce('Project imported. Undo is available to return to your previous project.');
    } catch (reason) { announce(`Import failed: ${reason instanceof Error ? reason.message : 'Unknown error.'} Your current project is unchanged.`, true); }
    finally { setImporting(false); if (importInput.current) importInput.current.value = ''; }
  };
  const matchingRoles = regions.filter(item => `${item.label} ${item.role}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="studio" data-appearance={appearance} data-testid="studio">
    <a className="skip-link" href="#workspace">Skip to preview</a>
    <header className="studio-header">
      <a className="brand" href="#workspace" aria-label="OpenTheme Studio workspace"><span className="brand-symbol"><Layers3 size={24} /></span><span>OpenTheme<span className="brand-light"> Studio</span></span></a>
      <div className="project-meta">
        <ProjectName name={project.name} onChange={name => update({ ...project, name })} />
        <span className={`save-status ${!stored ? 'storage-warning' : ''}`}>{stored ? 'Saved in this browser' : 'Memory only · download a backup'}</span>
      </div>
      <div className="project-actions">
        <div className="history-actions">
          <button className="icon-button" aria-label="Undo" title="Undo · Ctrl/⌘ Z" disabled={!history.past.length} onClick={() => { setHistory(undo); setComparing(false); }}><Undo2 size={20} /></button>
          <button className="icon-button" aria-label="Redo" title="Redo · Ctrl/⌘ Shift Z" disabled={!history.future.length} onClick={() => { setHistory(redo); setComparing(false); }}><Redo2 size={20} /></button>
        </div>
        <button className="toolbar-button" title="Import project JSON" disabled={importing} onClick={() => importInput.current?.click()}><ArrowUpFromLine size={18} /><span className="button-label">{importing ? 'Importing…' : 'Import'}</span></button>
        <input ref={importInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import project JSON" tabIndex={-1} disabled={importing} onChange={event => void importProject(event.target.files?.[0])} />
        <button className="toolbar-button" title="Download project JSON" onClick={saveProject}><ArrowDownToLine size={18} /><span className="button-label">Save project</span></button>
        <details className="share-menu"><summary>Share / advanced<ChevronDown className="share-chevron" size={16} aria-hidden="true" /><MoreHorizontal className="share-more" size={20} aria-hidden="true" /></summary>
          <div className="share-popover"><button ref={exportTrigger} className="menu-item" aria-label="Export theme" onClick={() => setDialog('export')}>Export theme ZIP</button></div>
        </details>
      </div>
      <div className="header-tools">
        <button className="icon-button" aria-label={`Use ${appearance === 'dark' ? 'light' : 'dark'} studio appearance`} title="Toggle studio appearance" onClick={() => setAppearance(value => value === 'dark' ? 'light' : 'dark')}>{appearance === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
        <button className="icon-button" aria-label="Editor help" title="Help" onClick={() => setDialog('help')}><CircleHelp size={20} /></button>
      </div>
    </header>
    <LiveConnections project={project} />
    <div className="mobile-panels"><button aria-expanded={navigationOpen} aria-controls="navigation-panel" onClick={() => setNavigationOpen(value => !value)}><Menu size={20} /> Applications & palette</button><button aria-expanded={inspectorOpen} aria-controls="inspector-panel" onClick={() => setInspectorOpen(value => !value)}><PanelRight size={20} /> Inspector</button></div>
    <div className={`editor-layout ${navigationOpen ? 'navigation-open' : ''} ${inspectorOpen ? 'inspector-open' : ''}`}>
      <nav className="navigation" id="navigation-panel" aria-label="Applications and palette">
        <p className="panel-label">Applications</p>
        <div className="app-list">{(['vscode', 'obsidian'] as EditorApp[]).map(id => <button className={`app-choice ${app === id ? 'active-app' : ''}`} key={id} aria-pressed={app === id} onClick={() => changeApp(id)}><span className={`app-monogram ${id}`}>{id === 'vscode' ? <Code2 size={22} /> : <span className="obsidian-shape" />}</span><span><strong>{appNames[id]}</strong><small>{id === 'vscode' ? 'Code editor' : 'Notes app'}</small></span></button>)}</div>
        <p className="panel-label">Palettes</p>
        <div className="preset-list">{presets.map(preset => <button className="preset" key={preset.name} aria-label={`Apply ${preset.name} palette`} title="Changes shared palette and theme mode. Existing app overrides are kept. Undo is available." onClick={() => { update({ ...project, tokens: structuredClone(preset.tokens), syntax: structuredClone(preset.syntax), mode: preset.mode }); announce(`${preset.name} palette applied. Existing app overrides are kept.`); }}><span className="preset-colors" aria-hidden="true">{[preset.tokens.canvas, preset.tokens.accent, preset.tokens.success, preset.tokens.warning].map((color, index) => <i key={index} style={{ background: color }} />)}</span><span><strong>{preset.name}</strong><small>{preset.mode === 'dark' ? 'Dark' : 'Light'}</small></span></button>)}</div>
        <details className="all-colors"><summary>All colors<ChevronDown size={18} aria-hidden="true" /></summary>
          <label className="palette-search"><Search size={18} aria-hidden="true" /><input aria-label="Search color roles" placeholder="Find a color…" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className="palette-roles">{matchingRoles.map(item => <button key={item.role} className={`palette-role ${item.role === selected ? 'selected-palette-role' : ''}`} onClick={() => { setSelected(item.role); setScope('shared'); setInspectorOpen(true); setFocusRequest(value => value + 1); }} aria-pressed={item.role === selected}><span className="color-dot" style={{ background: project.tokens[item.role] }} /><span>{item.label}</span><code>{project.tokens[item.role].toUpperCase()}</code></button>)}{!matchingRoles.length && <p className="empty-search">No matching colors.</p>}</div>
        </details>
      </nav>
      <main className="workspace" id="workspace" tabIndex={-1}>
        <div className="preview-heading">
          <div className="preview-title"><h1>{appNames[app]}</h1><span className="preview-note"><Eye size={16} aria-hidden="true" /> Illustrative preview</span></div>
          <button className={`compare-button ${comparing ? 'comparing' : ''}`} aria-pressed={comparing} onClick={() => setComparing(value => !value)}><span className="compare-icon" aria-hidden="true" />{comparing ? 'Back to your edits' : 'Compare original'}</button>
        </div>
        <Preview project={comparing ? baseline.current : project} app={app} selected={selected} onSelect={chooseRegion} comparing={comparing} />
        <div className="preview-footer">
          <p className="preview-hint"><MousePointer2 size={18} aria-hidden="true" />{comparing ? 'Showing your original project. Editing is paused.' : 'Click any outlined area to edit its color.'}</p>
          <p className="preview-limits">{appNames[app]} {targetVersion(app)} target · Native appearance unverified</p>
        </div>
      </main>
      <Inspector project={project} app={app} region={region} scope={scope} focusRequest={focusRequest} onScope={setScope} onChange={changeColor} onReset={() => { update(resetOverride(project, app, region.keys[app])); setScope('shared'); }} onResetApp={() => { update(resetApp(project, app)); setScope('shared'); }} />
    </div>
    {notice && <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <CircleHelp size={20} /> : <Check size={20} />}<span>{notice}</span><button aria-label="Dismiss notification" className="icon-button" onClick={() => setNotice('')}><X size={18} /></button></div>}
    {dialog === 'export' && <ExportDialog project={project} app={app} onClose={() => { const trigger = exportTrigger.current; setDialog(null); requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus(); }); }} onSave={saveProject} />}
    {dialog === 'help' && <HelpDialog onClose={() => setDialog(null)} />}
  </div>;
}
