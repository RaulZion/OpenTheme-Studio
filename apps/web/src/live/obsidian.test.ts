import { webcrypto } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
import { starter } from '../presets';
import { createObsidianSink, SNIPPET_NAME } from './obsidian';
import type { ConfigDirectory } from './obsidian';

function folder(initial?: string) {
  let content = initial;
  let permission: PermissionState = 'granted';
  const paths: string[] = [];
  const directory: ConfigDirectory = {
    name: '.obsidian',
    async queryPermission() { return permission; },
    async getDirectoryHandle(name) { paths.push(`directory:${name}`); return directory; },
    async getFileHandle(name, options) {
      paths.push(`file:${name}`);
      if (content === undefined && !options.create) throw new DOMException('Missing', 'NotFoundError');
      return {
        async getFile() { return { size: content?.length ?? 0, async text() { return content ?? ''; } }; },
        async createWritable() { let draft = ''; return { async write(text: string) { draft = text; }, async close() { content = draft; }, async abort() {} }; },
      };
    },
    async removeEntry(name) { paths.push(`remove:${name}`); content = undefined; },
  };
  return { directory, paths, read: () => content, tamper: (text: string) => { content = text; }, revoke: () => { permission = 'denied'; } };
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
const signal = () => new AbortController().signal;
it('writes only the named snippet, using exported palette CSS in both appearance modes', async () => {
  const disk = folder();
  const sink = await createObsidianSink(disk.directory);
  await sink.apply(starter, signal());
  expect(disk.read()).toMatch(/^\/\* OpenTheme Studio live snippet v1; sha256=[a-f0-9]{64} \*\//);
  expect(disk.read()).toContain('.theme-dark {');
  expect(disk.read()).toContain('.theme-light {');
  expect(disk.read()).toContain('--interactive-accent: #91B1F1;');
  expect(disk.paths.every(path => path === 'directory:snippets' || path === `file:${SNIPPET_NAME}`)).toBe(true);
  await sink.apply({ ...starter, tokens: { ...starter.tokens, accent: '#123456' } }, signal());
  expect(disk.read()).toContain('--interactive-accent: #123456;');
  await sink.remove(signal()); expect(disk.read()).toBeUndefined();
});
it('refuses a foreign file without writing, deleting, or reading other files', async () => {
  const disk = folder('/* someone else */ body { color: red; }');
  const sink = await createObsidianSink(disk.directory);
  await expect(sink.apply(starter, signal())).rejects.toThrow(/ownership|foreign/i);
  await expect(sink.remove(signal())).rejects.toThrow(/ownership|foreign/i);
  expect(disk.read()).toBe('/* someone else */ body { color: red; }');
});
it('detects manual changes even if the ownership marker remains', async () => {
  const disk = folder();
  const sink = await createObsidianSink(disk.directory);
  await sink.apply(starter, signal());
  const changed = disk.read()! + '\n/* user edit */'; disk.tamper(changed);
  await expect(sink.apply(starter, signal())).rejects.toThrow(/modified|ownership/i);
  await expect(sink.remove(signal())).rejects.toThrow(/modified|ownership/i);
  expect(disk.read()).toBe(changed);
});
it('rejects a vault root and permission revocation', async () => {
  const disk = folder();
  await expect(createObsidianSink({ ...disk.directory, name: 'my-vault' })).rejects.toThrow(/\.obsidian/);
  const sink = await createObsidianSink(disk.directory); disk.revoke();
  await expect(sink.apply(starter, signal())).rejects.toThrow(/permission/i);
  expect(disk.paths).toEqual([]);
});
it('validates before touching the directory and stops aborted writes', async () => {
  const disk = folder();
  const sink = await createObsidianSink(disk.directory);
  await expect(sink.apply({ ...starter, tokens: { ...starter.tokens, canvas: 'bad' } }, signal())).rejects.toThrow();
  expect(disk.paths).toEqual([]);
  const abort = new AbortController(); abort.abort();
  await expect(sink.apply(starter, abort.signal)).rejects.toThrow();
  expect(disk.paths).toEqual([]);
});
