import type { ThemeProject } from '../../../../contracts/adapter-api';
import type { LiveSink } from './vscode';
import { nativeAdapter } from '../native-export';
import { parseProject, serializeProject } from '../model';
import { targetVersion } from '../development-adapters';
export const SNIPPET_NAME = 'opentheme-studio.css';
export interface WritableSnippet { write(text: string): Promise<void>; close(): Promise<void>; abort(): Promise<void> }
export interface SnippetFile { getFile(): Promise<{ size: number; text(): Promise<string> }>; createWritable(): Promise<WritableSnippet> }
export interface ConfigDirectory {
  name: string;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<ConfigDirectory>;
  getFileHandle(name: string, options: { create: boolean }): Promise<SnippetFile>;
  removeEntry(name: string): Promise<void>;
}
export interface ObsidianSink extends LiveSink { remove(signal: AbortSignal): Promise<void> }

const LIMIT = 256 * 1024;
const header = /^\/\* OpenTheme Studio live snippet v1; sha256=([a-f0-9]{64}) \*\/\n/;
const missing = (error: unknown) => error instanceof DOMException && error.name === 'NotFoundError';
async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
async function checkOwned(file: SnippetFile): Promise<void> {
  const existing = await file.getFile();
  if (existing.size > LIMIT) throw new Error('Snippet ownership cannot be verified: existing file is too large. Leave it untouched.');
  const text = await existing.text();
  const match = header.exec(text);
  if (!match || await digest(text.slice(match[0].length)) !== match[1]) throw new Error('Snippet ownership check failed: foreign or manually modified file. Nothing overwritten or removed. Move your file to a safe backup yourself before reconnecting.');
}
async function exportedCss(project: ThemeProject): Promise<string> {
  const validated = parseProject(serializeProject(project));
  const adapter = nativeAdapter('obsidian');
  const parts: string[] = [];
  // Apply the selected palette in either native appearance mode, without changing appearance.json.
  for (const mode of ['dark', 'light'] as const) {
    const result = await adapter.export({ ...validated, mode }, targetVersion('obsidian'));
    const error = result.issues.find(issue => issue.severity === 'error');
    if (error) throw new Error(error.message);
    const css = result.files.find(file => file.path === 'theme.css');
    if (!css || typeof css.content !== 'string' || css.mimeType !== 'text/css' || css.content.length > LIMIT) throw new Error('Obsidian exporter did not return bounded CSS text.');
    // The safe exporter emits one selector and hex-only custom properties. Fail closed on any other text.
    if (!/^\/\*[^]*?\*\/\s*\.theme-(?:dark|light)\s*\{\s*(?:--[a-z][a-zA-Z0-9-]*:\s*#[a-fA-F0-9]{6};\s*)+\}\s*$/.test(css.content) || /@import|url\s*\(|expression\s*\(|<\s*\/?\s*(?:script|style)/i.test(css.content)) throw new Error('Obsidian exporter returned unexpected or unsafe CSS. Nothing written.');
    parts.push(css.content);
  }
  const body = parts.join('\n');
  const text = `/* OpenTheme Studio live snippet v1; sha256=${await digest(body)} */\n${body}`;
  if (new TextEncoder().encode(text).byteLength > LIMIT) throw new Error('Generated snippet exceeds 256 KiB.');
  return text;
}

export async function createObsidianSink(directory: ConfigDirectory): Promise<ObsidianSink> {
  if (directory.name !== '.obsidian') throw new Error('Choose the .obsidian configuration folder itself, not your vault or notes folder.');
  async function permission(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (typeof directory.queryPermission !== 'function' || await directory.queryPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('Obsidian folder permission is not granted or was revoked. Reconnect and select .obsidian again.');
    signal.throwIfAborted();
  }
  return {
    async apply(project, signal) {
      signal.throwIfAborted();
      const text = await exportedCss(project);
      await permission(signal);
      const snippets = await directory.getDirectoryHandle('snippets', { create: true });
      let file: SnippetFile;
      try { file = await snippets.getFileHandle(SNIPPET_NAME, { create: false }); await checkOwned(file); }
      catch (error) {
        if (!missing(error)) throw error;
        signal.throwIfAborted();
        file = await snippets.getFileHandle(SNIPPET_NAME, { create: true });
      }
      await permission(signal);
      const writable = await file.createWritable();
      try {
        signal.throwIfAborted(); await writable.write(text); signal.throwIfAborted(); await writable.close();
      } catch (error) { try { await writable.abort(); } catch { /* Original failure is reported. */ } throw error; }
      return { message: 'Connected folder · snippet saved. Obsidian running/enablement cannot be detected by the browser.' };
    },
    async remove(signal) {
      await permission(signal);
      let snippets: ConfigDirectory, file: SnippetFile;
      try {
        snippets = await directory.getDirectoryHandle('snippets', { create: false });
        file = await snippets.getFileHandle(SNIPPET_NAME, { create: false });
      } catch (error) { if (missing(error)) return; throw error; }
      await checkOwned(file); await permission(signal);
      await snippets.removeEntry(SNIPPET_NAME);
    },
  };
}
