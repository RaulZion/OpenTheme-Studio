import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Info, RotateCcw } from 'lucide-react';
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
  const overrideCount = Object.keys(project.appOverrides?.[app] ?? {}).length;
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
  const low = ratio < 4.5;
  return <aside className="inspector" aria-label="Color inspector" id="inspector-panel">
    <p className="inspector-kicker">Selected area</p>
    <h2>{region.label}</h2>
    <p className="description">{region.description}</p>
    <div className="scope-control" role="radiogroup" aria-label="Apply color to">
      <button role="radio" aria-checked={scope === 'shared'} onClick={() => onScope('shared')}>Shared palette</button>
      <button role="radio" aria-checked={scope === 'app'} onClick={() => onScope('app')}>Only {appNames[app]}</button>
    </div>
    <p className="scope-help">{scope === 'shared' ? 'Changes both apps, except where an app has its own color.' : `Changes only ${appNames[app]}. Your shared palette stays the same.`}</p>
    <div className="color-field" style={{ backgroundColor: value }}><span style={{ color: contrastRatio('#FFFFFF', value) > contrastRatio('#171C25', value) ? '#FFFFFF' : '#171C25' }}>{value.toUpperCase()}</span><label className="color-picker-label">Choose color<input type="color" aria-label="Choose color" value={value} onChange={event => onChange(regionBinding(app, region, scope), event.target.value.toUpperCase())} /></label></div>
    <label className="field-label" htmlFor="hex-color">Hex color</label>
    <div className={`hex-field ${invalid ? 'invalid-field' : ''}`}><input ref={input} id="hex-color" value={hex} spellCheck={false} maxLength={7} aria-invalid={invalid} aria-describedby={invalid ? 'hex-error' : undefined} onChange={event => { setHex(event.target.value); setInvalid(false); }} onBlur={apply} onKeyDown={event => { if (event.key === 'Enter') { apply(); event.currentTarget.blur(); } if (event.key === 'Escape') { setHex(value); setInvalid(false); event.currentTarget.blur(); } }} /></div>
    {invalid && <p className="field-error" id="hex-error">Enter a six-digit hex color, such as #91B1F1.</p>}
    <p className="field-label quick-colors-label" id="quick-colors-label">From your palette</p>
    <div className="quick-colors" role="group" aria-labelledby="quick-colors-label">{['accent', 'canvas', 'surface', 'text', 'success', 'warning'].map(role => <button key={role} title={`Use ${role}`} aria-label={`Use ${role} color`} style={{ background: project.tokens[role as keyof typeof project.tokens] }} onClick={() => onChange(regionBinding(app, region, scope), project.tokens[role as keyof typeof project.tokens])} />)}</div>
    {override && <button className="text-button" onClick={onReset}><RotateCcw size={16} /> Reset selected override</button>}
    {scope === 'shared' && override && <p className="callout">{appNames[app]} has its own color here. Reset it to see shared changes.</p>}
    <div className="contrast">
      <div className="contrast-row"><span>Text contrast</span><strong>{ratio.toFixed(2)}:1</strong></div>
      <p className={`contrast-status ${low ? 'contrast-warning' : ''}`}>{low ? <Info size={16} /> : <Check size={16} />}{low ? 'Below 4.5:1 for normal text' : 'Above 4.5:1 for normal text'}</p>
      <small>Estimate for this color pair, not an accessibility audit.</small>
    </div>
    <details className="advanced-controls"><summary>Advanced<ChevronDown size={18} aria-hidden="true" /></summary>
      <dl className="mapping-list"><div><dt>Shared role</dt><dd><code>tokens.{region.role}</code></dd></div><div><dt>{appNames[app]} preview mapping</dt><dd><code>{region.keys[app]}</code></dd></div></dl>
      <p>Preview mapping only. Native support must be confirmed by the production adapter.</p>
      <p>{overrideCount ? `${overrideCount} ${appNames[app]}-only color${overrideCount === 1 ? '' : 's'} kept separate from your palette.` : `No ${appNames[app]}-only colors yet.`}</p>
      <button className="text-button" disabled={!overrideCount} onClick={onResetApp}><RotateCcw size={16} /> Reset all {appNames[app]} overrides</button>
    </details>
  </aside>;
}
