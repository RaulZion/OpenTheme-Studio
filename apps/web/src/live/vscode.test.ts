import { beforeEach, expect, it, vi } from 'vitest';
import { starter } from '../presets';
import { pairVSCode } from './vscode';

const fetchMock = vi.fn<typeof fetch>();
const signal = () => new AbortController().signal;
const origin = 'http://127.0.0.1:5173';
const token = 'a-pairing-secret-never-persisted';
const health = (overrides = {}) => new Response(JSON.stringify({ ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0', ...overrides }));
const applied = (overrides = {}) => new Response(JSON.stringify({ ok: true, appliedCount: 12, version: '1.144.0', warning: null, ...overrides }));
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });

it('pairs only after health AND an authenticated full-project apply', async () => {
  fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(applied());
  const paired = await pairVSCode(token, starter, signal(), origin);
  expect(paired.receipt.message).toContain('12');
  expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:43187/v1/health', expect.objectContaining({ redirect: 'error', credentials: 'omit' }));
  const request = fetchMock.mock.calls[1];
  expect(request[0]).toBe('http://127.0.0.1:43187/v1/apply');
  expect(request[1]?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  expect(JSON.parse(request[1]!.body as string)).toEqual({ protocol: 'opentheme.live.v1', appId: 'vscode', targetVersion: '1.144.0', project: starter });
  expect(localStorage.getItem('opentheme.live.token')).toBeNull();
});
it.each([401, 403, 409, 413, 422, 500])('rejects HTTP %i rather than claiming connected', async status => {
  fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, code: 'REJECTED', message: token }), { status }));
  const error = await pairVSCode(token, starter, signal(), origin).catch(error => error);
  expect(String(error)).toContain(String(status));
  expect(String(error)).not.toContain(token);
});
it('refuses unsupported origins before making any request', async () => {
  await expect(pairVSCode(token, starter, signal(), 'https://example.org')).rejects.toThrow(/local.*5173/i);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('rejects a wrong protocol or target identity without transmitting the code', async () => {
  fetchMock.mockResolvedValueOnce(health({ protocol: 'other' }));
  await expect(pairVSCode(token, starter, signal(), origin)).rejects.toThrow(/protocol/i);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('rejects malformed success and a disconnected companion', async () => {
  fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(applied({ appliedCount: '12' }));
  await expect(pairVSCode(token, starter, signal(), origin)).rejects.toThrow(/response/i);
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(pairVSCode(token, starter, signal(), origin)).rejects.toThrow(/companion|network/i);
});
it('surfaces an allowed actual-version mismatch as an unverified compatibility warning', async () => {
  fetchMock.mockResolvedValueOnce(health({ version: '1.145.0' })).mockResolvedValueOnce(applied({ version: '1.145.0' }));
  const paired = await pairVSCode(token, starter, signal(), origin);
  expect(paired.receipt.warning).toMatch(/1\.145\.0.*1\.144\.0|1\.144\.0.*1\.145\.0/);
});
it('validates canonical project and body size before mutation', async () => {
  fetchMock.mockResolvedValue(health());
  await expect(pairVSCode(token, { ...starter, tokens: { ...starter.tokens, accent: 'red' } }, signal(), origin)).rejects.toThrow(/project/i);
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/apply'))).toBe(false);
});

it('caps canonical request bodies at 256 KiB without sending a mutation', async () => {
  fetchMock.mockResolvedValueOnce(health());
  const overrides = Object.fromEntries(Array.from({ length: 2500 }, (_, i) => [`role${i}${'x'.repeat(110)}`, '#123456']));
  await expect(pairVSCode(token, { ...starter, appOverrides: { vscode: overrides } }, signal(), origin)).rejects.toThrow(/256 KiB/);
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/apply'))).toBe(false);
});

it('times out an unavailable companion rather than leaving a pending connection forever', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  try {
    const pending = expect(pairVSCode(token, starter, signal(), origin)).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(3000); await pending;
  } finally { vi.useRealTimers(); }
});

it('classifies a companion shutdown during response reading as temporary unavailability', async () => {
  fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('Connection closed')); } })));
  await expect(pairVSCode(token, starter, signal(), origin)).rejects.toMatchObject({ kind: 'unavailable' });
});
