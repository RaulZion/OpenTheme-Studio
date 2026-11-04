import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, Info, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ColorBinding, ThemeProject } from '../../../contracts/adapter-api';
import { appNames, effectiveColor, regionBinding } from './development-adapters';
import type { EditorApp, Region } from './development-adapters';
import { contrastRatio, isColor } from './model';

interface Props {
  project: ThemeProject; app: EditorApp; region: Region; scope: 'shared' | 'app'; focusRequest: number;
  onScope: (scope: 'shared' | 'app') => void; onChange: (binding: ColorBinding, value: string) => void;
  onReset: () => void; onResetApp: () => void;
}
export default function Inspector({ project, app, region, scope, focusRequest, onScope, onChange, onReset, onResetApp }: Props) {
  const override = project.appOverrides?.[app]?.[region.keys[app]];
  const value = scope === 'shared' ? project.tokens[region.role] : effectiveColor(project, app, region);
  const [hex, setHex] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setHex(value); setInvalid(false); }, [value, region.role, app, scope]);
  useEffect(() => { if (focusRequest) { input.current?.focus(); input.current?.select(); } }, [focusRequest]);
  const apply = () => {
    if (!isColor(hex)) { setInvalid(true); return; }
    setInvalid(false); onChange(regionBinding(app, region, scope), hex.toUpperCase());
  };
  const ratio = contrastRatio(effectiveColor(project, app, { ...region, role: 'text', keys: { vscode: 'editor.foreground', obsidian: '--text-normal' } }), effectiveColor(project, app, { ...region, role: 'canvas', keys: { vscode: 'editor.background', obsidian: '--background-primary' } }));
  return <aside className="inspector" aria-label="Color inspector" id="inspector-panel">
    <div className="panel-label"><span>INSPECTOR</span><SlidersHorizontal size={14} /></div>
    <div className="selection-kicker"><span className="tiny-dot" /> SELECTED ELEMENT</div>
    <h2>{region.label}</h2><p className="description">{region.description}</p>
    <div className="scope-control" role="radiogroup" aria-label="Apply color to">
      <button role="radio" aria-checked={scope === 'shared'} onClick={() => onScope('shared')}><Globe2 size={13} /> Shared palette</button>
      <button role="radio" aria-checked={scope === 'app'} onClick={() => onScope('app')}>Only {appNames[app]}</button>
    </div>
    <p className="scope-help">{scope === 'shared' ? 'Updates both apps, except where an override is set.' : `An isolated override. Your shared palette stays the same.`}</p>
    <div className="color-field" style={{ backgroundColor: value }}><span style={{ color: contrastRatio('#FFFFFF', value) > contrastRatio('#171C25', value) ? '#FFFFFF' : '#171C25' }}>{value.toUpperCase()}</span><label className="color-picker-label">Choose color<input type="color" aria-label="Choose color" value={value} onChange={event => onChange(regionBinding(app, region, scope), event.target.value.toUpperCase())} /></label></div>
    <div className="field-heading"><label htmlFor="hex-color">Hex color</label><span>sRGB</span></div>
    <div className={`hex-field ${invalid ? 'invalid-field' : ''}`}><span className="color-dot" style={{ background: value }} /><input ref={input} id="hex-color" value={hex} spellCheck={false} maxLength={7} aria-invalid={invalid} aria-describedby={invalid ? 'hex-error' : undefined} onChange={event => { setHex(event.target.value); setInvalid(false); }} onBlur={apply} onKeyDown={event => { if (event.key === 'Enter') { apply(); event.currentTarget.blur(); } if (event.key === 'Escape') { setHex(value); setInvalid(false); event.currentTarget.blur(); } }} /><span>HEX</span></div>
    {invalid && <p className="field-error" id="hex-error">Enter a six-digit hex color, such as #91B1F1.</p>}
    <div className="quick-colors" aria-label="Colors from your palette">{['accent', 'canvas', 'surface', 'text', 'success', 'warning'].map(role => <button key={role} title={`Use ${role}`} aria-label={`Use ${role} color`} style={{ background: project.tokens[role as keyof typeof project.tokens] }} onClick={() => onChange(regionBinding(app, region, scope), project.tokens[role as keyof typeof project.tokens])} />)}</div>
    <div className="property-reset">{override ? <button className="text-button" onClick={onReset}><RotateCcw size={12} /> Reset selected override</button> : <span><Globe2 size={12} /> Using shared palette</span>}</div>
    {scope === 'shared' && override && <p className="callout">This app has an override for this role. Reset it to see shared changes here.</p>}
    <section className="contrast-card"><div><span>Text / editor contrast</span><strong>{ratio.toFixed(2)}:1</strong></div><p className={ratio < 4.5 ? 'contrast-warning' : ''}>{ratio < 4.5 ? <Info size={14} /> : <Check size={14} />}{ratio < 4.5 ? 'Below 4.5:1 for normal text' : 'Above 4.5:1 for normal text'}</p><small>Color-pair estimate, not an accessibility audit.</small></section>
    <details className="advanced-controls"><summary>Advanced mapping <ChevronDown size={14} /></summary><span className="eyebrow">SHARED ROLE</span><code>tokens.{region.role}</code><span className="eyebrow">DEVELOPMENT APP MAPPING</span><code>{region.keys[app]}</code><p>Preview mapping only. Native support must be confirmed by the production adapter.</p><button className="text-button" disabled={!Object.keys(project.appOverrides?.[app] ?? {}).length} onClick={onResetApp}><RotateCcw size={12} /> Reset all {appNames[app]} overrides</button></details>
    <div className="inspector-note"><Info size={15} /><p>One palette. A little personality in every app.</p></div>
  </aside>;
}
