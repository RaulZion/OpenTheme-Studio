import { zipSync, strToU8 } from 'fflate';
import type { ExportFile, ExportResult, ThemeAdapter, ThemeProject } from '../../../contracts/adapter-api';
import { vsCodeAdapter } from '@opentheme/adapter-vscode';
import { obsidianAdapter } from '@opentheme/adapter-obsidian';
import { targetVersion } from './development-adapters';
import type { EditorApp } from './development-adapters';

export function nativeAdapter(app: EditorApp): ThemeAdapter {
  return app === 'vscode' ? vsCodeAdapter : obsidianAdapter;
}

export interface NativeArchive {
  bytes: Uint8Array;
  fileName: string;
  result: ExportResult;
}

function safeMemberPath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || /[\u0000-\u001f\u007f]/.test(path)) return false;
  return path.split('/').every(component => component && component !== '.' && component !== '..');
}

export async function createNativeArchive(project: ThemeProject, app: EditorApp): Promise<NativeArchive> {
  const adapter = nativeAdapter(app);
  const version = targetVersion(app);
  const result = await adapter.export(project, version);
  const blocker = result.issues.find(issue => issue.severity === 'error');
  if (blocker) throw new Error(blocker.message);
  if (!result.files.length) throw new Error('Adapter did not produce native theme files.');

  // Project IDs are constrained by the canonical ThemeProject schema and validated again here.
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(project.projectId)) {
    throw new Error('Invalid project ID for a theme archive.');
  }
  const folder = app === 'vscode' ? project.projectId + '-0.0.1' : project.projectId;
  const members: Record<string, Uint8Array> = {};
  const seen = new Set<string>();
  for (const file of result.files as ExportFile[]) {
    if (!safeMemberPath(file.path) || seen.has(file.path)) {
      throw new Error('The exporter returned an unsafe or duplicate file path.');
    }
    seen.add(file.path);
    members[folder + '/' + file.path] =
      typeof file.content === 'string' ? strToU8(file.content) : strToU8(new TextDecoder().decode(file.content));
  }

  const bytes = zipSync(members, { level: 0, mtime: new Date('1980-01-01T00:00:00Z') });
  return { bytes, fileName: project.projectId + '-' + app + '-theme.zip', result };
}

export function downloadNativeArchive(archive: NativeArchive): void {
  const blob = new Blob([new Uint8Array(archive.bytes)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = archive.fileName;
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
