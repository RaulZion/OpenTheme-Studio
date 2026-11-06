import type { CSSProperties, ReactNode } from 'react';
import { ArrowDown, Bell, BookOpen, Check, ChevronDown, ChevronRight, Code2, Files, GitBranch, MoreHorizontal, Search, Settings, Terminal, TriangleAlert, X } from 'lucide-react';
import type { SemanticRole, ThemeProject } from '../../../contracts/adapter-api';
import { effectiveColor, regions } from './development-adapters';
import type { EditorApp } from './development-adapters';

interface Props { project: ThemeProject; app: EditorApp; selected: SemanticRole; onSelect: (role: SemanticRole) => void; comparing: boolean }

export default function Preview({ project, app, selected, onSelect, comparing }: Props) {
  const variables = Object.fromEntries(regions.map(region => [`--theme-${region.role}`, effectiveColor(project, app, region)]));
  const style = { ...variables, '--syntax-keyword': project.syntax?.keywords ?? project.tokens.accent, '--syntax-string': project.syntax?.strings ?? project.tokens.success, '--syntax-comment': project.syntax?.comments ?? project.tokens.textMuted, '--syntax-number': project.syntax?.numbers ?? project.tokens.warning, '--syntax-type': project.syntax?.types ?? project.tokens.accent } as CSSProperties;
  const target = (role: SemanticRole, children: ReactNode, className = '') => (
    <button type="button" aria-label={`Edit ${regions.find(r => r.role === role)!.label}`} aria-pressed={!comparing && selected === role}
      className={`preview-target ${className} ${!comparing && selected === role ? 'selected-region' : ''}`} disabled={comparing} onClick={() => onSelect(role)}>{children}</button>
  );

  return <div className={`app-preview ${app}`} style={style} data-testid="preview" aria-label={`${app === 'vscode' ? 'VS Code' : 'Obsidian'} illustrative preview`}>
    <div className="window-top"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>{app === 'vscode' ? 'field-notes — Visual Studio Code' : 'Field Notes — Obsidian'}</span><MoreHorizontal size={16} aria-hidden="true" /></div>
    <div className="preview-body">
      <div className="activity-rail" aria-hidden="true"><Files /><Search /><GitBranch /><span className="rail-spacer" /><Settings /></div>
      {target('surface', <><span className="explorer-heading">{app === 'vscode' ? 'EXPLORER' : 'FIELD NOTES'}<MoreHorizontal size={14} /></span>
        <span className="folder-title"><ChevronDown size={12} /> {app === 'vscode' ? 'FIELD-NOTES' : 'My workspace'}</span>
        {app === 'vscode' ? <><span className="file-row"><ChevronRight size={12} /> public</span><span className="file-row"><ChevronDown size={12} /> src</span><span className="file-row file-active"><span className="file-icon">TS</span> theme.ts</span><span className="file-row"><span className="file-icon css-icon">#</span> styles.css</span><span className="file-row"><span className="file-icon json-icon">{'{ }'}</span> package.json</span><span className="file-row"><BookOpen size={13} /> README.md</span></>
          : <><span className="file-row"><ChevronDown size={12} /> Personal</span><span className="file-row file-active"><BookOpen size={13} /> A little room to think</span><span className="file-row"><BookOpen size={13} /> Daily notes</span><span className="file-row"><BookOpen size={13} /> Reading list</span><span className="file-row"><ChevronRight size={12} /> Projects</span><span className="file-row"><ChevronRight size={12} /> Archive</span></>}
        <span className="sidebar-bottom">{app === 'vscode' ? 'OUTLINE' : 'A space for your ideas'}</span></>, 'preview-sidebar')}
      <div className="editor-pane">
        {target('surfaceRaised', <><span>{app === 'vscode' ? <Code2 size={14} /> : <BookOpen size={14} />}{app === 'vscode' ? 'theme.ts' : 'A little room to think'}<X size={12} /></span><span className="inactive-tab">{app === 'vscode' ? 'README.md' : 'Daily notes'}</span></>, 'preview-tabs')}
        <div className="editor-content">
          {target('canvas', <span className="background-label">{selected === 'canvas' ? 'Editor background' : 'Edit background'}</span>, 'canvas-target')}
          <div className="scene-content">
            {app === 'vscode' ? <>
              {target('textMuted', <>src <ChevronRight size={11} /> theme.ts <ChevronRight size={11} /> createTheme</>, 'breadcrumbs')}
              <div className="code-lines" aria-label="Illustrative TypeScript sample">
                <div><em>1</em><span className="syntax-comment">{'// A workspace that feels like you.'}</span></div>
                <div><em>2</em><span><b>import</b> {'{ createTheme }'} <b>from</b> <q>'@field-notes/core'</q>;</span></div>
                <div><em>3</em></div>
                <div><em>4</em><span><b>const</b> theme = <span className="syntax-type">createTheme</span>({'{'}</span></div>
                <div><em>5</em><span>  name: <q>'A little room to create'</q>,</span></div>
                <div><em>6</em><span>  mode: <q>'{project.mode}'</q>,</span></div>
                <div><em>7</em><span>  colors: {'{'}</span></div>
                <div><em>8</em><span>    accent: <q>'{project.tokens.accent}'</q>,</span></div>
                <div><em>9</em><span>    background: <q>'{effectiveColor(project, app, regions[0])}'</q>,</span></div>
                <div><em>10</em><span>    inspiration: <span className="syntax-number">100</span>,</span></div>
                <div><em>11</em><span>  {'}'},</span></div>
                <div><em>12</em><span>{'}'});</span></div>
                <div><em>13</em></div>
                <div><em>14</em>{target('text', <span>{'  makeSomethingWonderful(theme);'}</span>, 'code-text')}</div>
                <div><em>15</em>{target('selection', <span>  Your next idea starts here.</span>, 'selection-sample')}</div>
                <div><em>16</em></div>
                <div><em>17</em><span className="syntax-comment">{'// Less noise. More possibility.'}</span></div>
              </div>
              <div className="code-minimap" aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ width: `${28 + (i * 17) % 60}%` }} />)}</div>
            </> : <>
              {target('textMuted', <>Personal <ChevronRight size={11} /> A little room to think</>, 'breadcrumbs')}
              <article className="note-content"><span className="note-eyebrow">THOUGHTS & POSSIBILITIES</span>
                {target('text', <h2>A little room to think.</h2>, 'note-heading')}
                <p>Some of our best ideas begin with a little space.<br />A quiet page. A fresh perspective. A color that feels right.</p>
                <blockquote>Make space for what matters.</blockquote>
                <h3>A few things on my mind</h3>
                <p><span className="note-checkbox" aria-hidden="true">✓</span> Find inspiration in the everyday</p>
                <p><span className="note-checkbox empty" aria-hidden="true" /> Leave room for the unexpected</p>
                {target('selection', <span>Follow the thread of a good idea.</span>, 'selection-sample')}
                <div className="note-tags"><span># small-moments</span><span># creative-practice</span></div>
              </article>
            </>}
            {target('accent', <>{app === 'vscode' ? 'Explore the possibilities' : '↗ A collection of good ideas'}<ArrowDown size={12} /></>, 'preview-link')}
          </div>
        </div>
        {target('border', <span />, 'border-target')}
        <div className="preview-terminal"><div className="terminal-title"><Terminal size={13} />{app === 'vscode' ? 'TERMINAL' : 'BACKLINKS'}<span className="terminal-detail">{app === 'vscode' ? 'zsh' : 'Linked mentions'}</span></div>
          <div className="terminal-line">{target('success', <><Check size={13} /> {app === 'vscode' ? 'Ready in 142 ms' : 'All thoughts connected'}</>, 'feedback success')}{target('error', <><X size={12} /> 0 errors</>, 'feedback')}{target('warning', <><TriangleAlert size={12} /> 0 warnings</>, 'feedback warning')}</div>
        </div>
      </div>
    </div>
    <div className="preview-status"><span><GitBranch size={12} /> main*</span><span>{app === 'vscode' ? 'UTF-8   TypeScript   Ln 14, Col 3' : '3 backlinks     126 words'}</span>{target('accentText', <><Check size={11} /> {project.mode}</>, 'accent-text-sample')}<Bell size={11} aria-hidden="true" /></div>
  </div>;
}
