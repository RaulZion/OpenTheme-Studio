import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Check, ChevronDown, CircleHelp, Code2, Eye, Globe2, Layers3, Menu, Moon, MousePointer2, PanelRight, Redo2, Search, SlidersHorizontal, Sparkles, Sun, Undo2, X } from 'lucide-react';
import type { ColorBinding, SemanticRole, ThemeProject } from '../../../contracts/adapter-api';
import { appNames, developmentAdapter, regions, targetVersion } from './development-adapters';
import type { EditorApp } from './development-adapters';
import { commit, createHistory, parseProject, redo, resetApp, resetOverride, serializeProject, setColor, undo } from './model';
import { presets, starter } from './presets';
import Inspector from './Inspector';
import Preview from './Preview';
import { ExportDialog, HelpDialog } from './Dialogs';

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
  const baseline = useRef(initial.project);
  const region = regions.find(item => item.role === selected)!;
  const controls = developmentAdapter(app).getControls(project, targetVersion(app));
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
  const overrides = Object.keys(project.appOverrides?.[app] ?? {}).length;

  return <div className="studio" data-appearance={appearance} data-testid="studio">
    <a className="skip-link" href="#workspace">Skip to preview</a>
    <header className="studio-header">
      <a className="brand" href="#workspace" aria-label="OpenTheme Studio workspace"><span className="brand-symbol"><Layers3 size={23} /></span><span>OpenTheme<span className="brand-light"> Studio</span></span><span className="version-pill">MVP</span></a>
      <div className="header-right"><span className="local-badge"><span className="tiny-dot" /> LOCAL FIRST</span><button className="icon-button" aria-label={`Use ${appearance === 'dark' ? 'light' : 'dark'} studio appearance`} title="Toggle studio appearance" onClick={() => setAppearance(value => value === 'dark' ? 'light' : 'dark')}>{appearance === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button" aria-label="Editor help" onClick={() => setDialog('help')}><CircleHelp size={18} /></button></div>
    </header>
    <div className="project-toolbar"><div className="project-meta"><span className="project-avatar"><Sparkles size={17} /></span><div><ProjectName name={project.name} onChange={name => update({ ...project, name })} /><span className={`save-status ${!stored ? 'storage-warning' : ''}`}><span className="tiny-dot" />{stored ? 'Saved in this browser' : 'Memory only · download a backup'}</span></div></div>
      <div className="project-actions"><div className="history-actions"><button className="icon-button" aria-label="Undo" title="Undo · Ctrl/⌘ Z" disabled={!history.past.length} onClick={() => { setHistory(undo); setComparing(false); }}><Undo2 size={17} /></button><button className="icon-button" aria-label="Redo" title="Redo · Ctrl/⌘ Shift Z" disabled={!history.future.length} onClick={() => { setHistory(redo); setComparing(false); }}><Redo2 size={17} /></button></div><button className="toolbar-button" disabled={importing} onClick={() => importInput.current?.click()}><ArrowUpFromLine size={15} /><span>{importing ? 'Importing…' : 'Import'}</span></button><input ref={importInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import project JSON" tabIndex={-1} disabled={importing} onChange={event => void importProject(event.target.files?.[0])} /><button className="toolbar-button" onClick={saveProject}><ArrowDownToLine size={15} /><span>Save project</span></button><button className="primary-button" aria-label="Export theme" onClick={() => setDialog('export')}>Export theme<ArrowRight size={15} /></button></div>
    </div>
    <div className="mobile-panels"><button aria-expanded={navigationOpen} aria-controls="navigation-panel" onClick={() => setNavigationOpen(value => !value)}><Menu size={16} /> Applications & palette</button><button aria-expanded={inspectorOpen} aria-controls="inspector-panel" onClick={() => setInspectorOpen(value => !value)}><PanelRight size={16} /> Inspector</button></div>
    <div className={`editor-layout ${navigationOpen ? 'navigation-open' : ''} ${inspectorOpen ? 'inspector-open' : ''}`}>
      <nav className="navigation" id="navigation-panel" aria-label="Applications and palette">
        <div className="panel-label">APPLICATIONS<span className="count-badge">2</span></div>
        {(['vscode', 'obsidian'] as EditorApp[]).map(id => <button className={`app-choice ${app === id ? 'active-app' : ''}`} key={id} aria-pressed={app === id} onClick={() => changeApp(id)}><span className={`app-monogram ${id}`}>{id === 'vscode' ? <Code2 size={23} /> : <span className="obsidian-shape" />}</span><span><strong>{appNames[id]}</strong><small>{id === 'vscode' ? 'Code editor' : 'Notes & knowledge'}</small></span>{app === id && <span className="active-indicator" />}</button>)}
        <div className="navigation-divider" />
        <div className="panel-label">START WITH A PALETTE<Sparkles size={13} /></div>
        <div className="preset-list">{presets.map(preset => <button className="preset" key={preset.name} aria-label={`Apply ${preset.name} palette`} title="Changes shared palette and theme mode. Existing app overrides are kept. Undo is available." onClick={() => { update({ ...project, tokens: structuredClone(preset.tokens), syntax: structuredClone(preset.syntax), mode: preset.mode }); announce(`${preset.name} palette applied. Existing app overrides are kept.`); }}><span className="preset-colors">{[preset.tokens.canvas, preset.tokens.accent, preset.tokens.success, preset.tokens.warning].map((color, index) => <i key={index} style={{ background: color }} />)}</span><span><strong>{preset.name}</strong><small>{preset.tag}</small></span><ChevronDown size={12} className="preset-arrow" /></button>)}</div>
        <div className="navigation-divider" />
        <div className="panel-label">SHARED PALETTE<Globe2 size={13} /></div><label className="palette-search"><Search size={14} /><input aria-label="Search color roles" placeholder="Find a color role…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="palette-roles">{regions.filter(item => `${item.label} ${item.role}`.toLowerCase().includes(query.toLowerCase())).map(item => <button key={item.role} className={`palette-role ${item.role === selected ? 'selected-palette-role' : ''}`} onClick={() => { setSelected(item.role); setScope('shared'); setInspectorOpen(true); setFocusRequest(value => value + 1); }} aria-pressed={item.role === selected}><span className="color-dot" style={{ background: project.tokens[item.role] }} /><span>{item.label}</span><code>{project.tokens[item.role].toUpperCase()}</code></button>)}{!regions.some(item => `${item.label} ${item.role}`.toLowerCase().includes(query.toLowerCase())) && <p className="empty-search">No matching color roles.</p>}</div>
        <div className="local-note"><Globe2 size={16} /><div><strong>Yours, by design.</strong><p>No accounts. No uploads.<br />Your ideas stay in your browser.</p></div></div>
      </nav>
      <main className="workspace" id="workspace" tabIndex={-1}>
        <div className="workspace-heading"><div className="eyebrow"><span /> YOUR CREATIVE WORKSPACE</div><h1>A space that feels like you<span>.</span></h1><p>A few thoughtful colors. A whole different feeling.</p></div>
        <div className="preview-heading"><div><span className="preview-app-title">{appNames[app]}<span className="illustrative-badge"><Eye size={12} /> Illustrative preview</span></span><p>Click an outlined element to make it your own.</p></div><span className="scene-label">Workspace</span></div>
        <Preview project={comparing ? baseline.current : project} app={app} selected={selected} onSelect={chooseRegion} comparing={comparing} />
        <div className="preview-controls"><span><MousePointer2 size={14} />{comparing ? 'Original project · editing paused' : 'Click to select · Tab to explore'}</span><button className={`compare-button ${comparing ? 'comparing' : ''}`} aria-pressed={comparing} onClick={() => setComparing(value => !value)}><span className="compare-icon" />{comparing ? 'Back to your edits' : 'Compare original'}</button></div>
        <div className="palette-summary"><div><span className="palette-summary-icon"><Globe2 size={19} /></span><div><strong>Shared colors. Individual character.</strong><p>{overrides ? `${overrides} ${appNames[app]} override${overrides === 1 ? '' : 's'} kept separate from your palette.` : 'Your semantic palette travels across both applications.'}</p></div></div><div className="summary-swatches">{['accent', 'success', 'warning', 'error'].map(key => <i key={key} style={{ background: project.tokens[key as SemanticRole] }} />)}</div></div>
        <div className="compatibility-footer"><span><SlidersHorizontal size={13} /> {controls.length} editable preview roles</span><span>{appNames[app]} {targetVersion(app)} target · Native appearance unverified</span></div>
      </main>
      <Inspector project={project} app={app} region={region} scope={scope} focusRequest={focusRequest} onScope={setScope} onChange={changeColor} onReset={() => { update(resetOverride(project, app, region.keys[app])); setScope('shared'); }} onResetApp={() => { update(resetApp(project, app)); setScope('shared'); }} />
    </div>
    <footer className="studio-footer"><span><span className="tiny-dot" /> DEVELOPMENT PREVIEW</span><span>Made for a more personal workspace.</span><span>Project schema 1.0.0</span></footer>
    {notice && <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <CircleHelp size={17} /> : <Check size={17} />}<span>{notice}</span><button aria-label="Dismiss notification" className="icon-button" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {dialog === 'export' && <ExportDialog project={project} app={app} onClose={() => { setDialog(null); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('button[aria-label="Export theme"]')?.focus()); }} onSave={saveProject} />}
    {dialog === 'help' && <HelpDialog onClose={() => setDialog(null)} />}
  </div>;
}
