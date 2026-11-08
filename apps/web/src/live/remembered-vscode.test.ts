import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { starter } from '../presets';
import { PAIRING_STORAGE_KEY, RememberedVSCode } from './remembered-vscode';
import { LIVE_PROTOCOL } from './vscode';

const origin = 'http://127.0.0.1:5173';
const token = 'test-only-remembered-credential';
const saved = (overrides = {}) => JSON.stringify({ version: 1, origin, protocol: LIVE_PROTOCOL, token, ...overrides });
const health = () => new Response(JSON.stringify({ ok: true, protocol: LIVE_PROTOCOL, appId: 'vscode', version: '1.144.0' }));
const applied = () => new Response(JSON.stringify({ ok: true, appliedCount: 12, version: '1.144.0', warning: null }));
const fetchMock = vi.fn<typeof fetch>();
const sessions: RememberedVSCode[] = [];
function session() { const publish = vi.fn(); const client = new RememberedVSCode(publish, origin); sessions.push(client); return { client, publish }; }
beforeEach(() => {
  localStorage.clear(); vi.useFakeTimers(); fetchMock.mockReset();
  fetchMock.mockImplementation(async url => String(url).endsWith('/health') ? health() : applied());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { sessions.splice(0).forEach(client => client.dispose()); vi.useRealTimers(); vi.restoreAllMocks(); });

it('remembers only an authenticated explicit pairing, outside the project document', async () => {
  const { client, publish } = session();
  expect(await client.pair(token, starter)).toBe(true);
  expect(JSON.parse(localStorage.getItem(PAIRING_STORAGE_KEY)!)).toEqual(JSON.parse(saved()));
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'connected', remembered: true }));
  expect(JSON.stringify(starter)).not.toContain(token);
});

it('reconnects after a new client instance without code entry and waits for authenticated apply', async () => {
  localStorage.setItem(PAIRING_STORAGE_KEY, saved());
  let finish!: (response: Response) => void;
  fetchMock.mockResolvedValueOnce(health()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { client, publish } = session(); client.start(starter);
  await vi.advanceTimersByTimeAsync(0);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(publish.mock.calls.some(([state]) => state.phase === 'connected')).toBe(false);
  expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  finish(applied()); await vi.advanceTimersByTimeAsync(0);
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'connected' }));
  client.dispose();
  const next = session(); next.client.start({ ...starter, name: 'Latest' }); await vi.advanceTimersByTimeAsync(0);
  expect(next.publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'connected' }));
  expect(JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string).project.name).toBe('Latest');
});

it('keeps the saved credential during downtime, caps retry delays, and sends latest offline edits on recovery', async () => {
  localStorage.setItem(PAIRING_STORAGE_KEY, saved());
  let offline = true;
  fetchMock.mockImplementation(async url => { if (offline) throw new TypeError('Failed to fetch'); return String(url).endsWith('/health') ? health() : applied(); });
  const { client, publish } = session(); client.start(starter); await vi.advanceTimersByTimeAsync(0);
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'waiting' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  for (const delay of [1000, 2000, 5000, 10000, 30000, 60000, 60000]) {
    const before = fetchMock.mock.calls.length;
    for (let i = 0; i < 20; i++) client.edit({ ...starter, name: `Offline ${i}` });
    await vi.advanceTimersByTimeAsync(delay - 1); expect(fetchMock).toHaveBeenCalledTimes(before);
    await vi.advanceTimersByTimeAsync(1); expect(fetchMock).toHaveBeenCalledTimes(before + 1);
  }
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBe(saved());
  offline = false; await vi.advanceTimersByTimeAsync(60000);
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'connected' }));
  expect(JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string).project.name).toBe('Offline 19');
});

it('detects an idle shutdown via health and authenticates again after VS Code returns', async () => {
  const { client, publish } = session(); await client.pair(token, starter);
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await vi.advanceTimersByTimeAsync(10000);
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'waiting' }));
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBe(saved());
  await vi.advanceTimersByTimeAsync(1000);
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'connected' }));
  expect(String(fetchMock.mock.calls.at(-1)![0])).toMatch(/\/apply$/);
});

it('discards revoked credentials and stops retrying after an authenticated 401', async () => {
  const { client, publish } = session(); await client.pair(token, starter);
  fetchMock.mockResolvedValueOnce(new Response('{"ok":false}', { status: 401 }));
  client.edit({ ...starter, name: 'Changed' }); await vi.advanceTimersByTimeAsync(300);
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBeNull();
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'error', hasPairing: false, canRestore: false }));
  const count = fetchMock.mock.calls.length; await vi.advanceTimersByTimeAsync(120000);
  expect(fetchMock).toHaveBeenCalledTimes(count);
});

it('retains but pauses an origin-rejected credential without retrying or claiming Connected', async () => {
  localStorage.setItem(PAIRING_STORAGE_KEY, saved());
  fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(new Response('{"ok":false}', { status: 403 }));
  const { client, publish } = session(); client.start(starter); await vi.advanceTimersByTimeAsync(0);
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBe(saved());
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'error', hasPairing: true }));
  const count = fetchMock.mock.calls.length; await vi.advanceTimersByTimeAsync(120000); expect(fetchMock).toHaveBeenCalledTimes(count);
});

it('forgets immediately, cancels pending retries, and does not resurrect pairing on late success', async () => {
  localStorage.setItem(PAIRING_STORAGE_KEY, saved());
  let finish!: (response: Response) => void;
  fetchMock.mockResolvedValueOnce(health()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { client, publish } = session(); client.start(starter); await vi.advanceTimersByTimeAsync(0);
  client.forget(); finish(applied()); await vi.advanceTimersByTimeAsync(0);
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBeNull();
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'disconnected', hasPairing: false }));
  const count = fetchMock.mock.calls.length; await vi.advanceTimersByTimeAsync(120000); expect(fetchMock).toHaveBeenCalledTimes(count);
  const next = session(); next.client.start(starter); expect(fetchMock).toHaveBeenCalledTimes(count);
});

it('keeps a session usable but explains when browser storage cannot remember it', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'QuotaExceededError'); });
  const { client, publish } = session(); expect(await client.pair(token, starter)).toBe(true);
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'connected', remembered: false, warning: expect.stringMatching(/storage|remember/i) }));
  client.edit(starter); await vi.advanceTimersByTimeAsync(300);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it.each([{ origin: 'http://localhost:5173' }, { version: 2 }, { protocol: 'other' }, { token: '\r\ninvalid' }])('refuses invalid or copied-origin stored credentials: %j', async overrides => {
  localStorage.setItem(PAIRING_STORAGE_KEY, saved(overrides));
  const { client } = session(); client.start(starter); await vi.advanceTimersByTimeAsync(0);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBeNull();
});

it('does not read or use saved credentials from an unsupported Studio origin', async () => {
  localStorage.setItem(PAIRING_STORAGE_KEY, saved());
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const client = new RememberedVSCode(vi.fn(), 'https://example.org'); sessions.push(client);
  client.start(starter); await vi.advanceTimersByTimeAsync(0);
  expect(read).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
});

it('respects pairing removal in another tab and never retries a deliberate restore', async () => {
  const { client, publish } = session(); await client.pair(token, starter);
  localStorage.removeItem(PAIRING_STORAGE_KEY); client.storageChanged();
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'disconnected' }));
  const count = fetchMock.mock.calls.length; await vi.advanceTimersByTimeAsync(120000); expect(fetchMock).toHaveBeenCalledTimes(count);
  await client.pair(token, starter);
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await client.restore();
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'error', canRestore: true }));
  const after = fetchMock.mock.calls.length; await vi.advanceTimersByTimeAsync(120000); expect(fetchMock).toHaveBeenCalledTimes(after);
  expect(localStorage.getItem(PAIRING_STORAGE_KEY)).toBeNull();
  const reopened = session(); reopened.client.start(starter);
  await vi.advanceTimersByTimeAsync(120000); expect(fetchMock).toHaveBeenCalledTimes(after);
});

it('does not claim Forget succeeded when browser storage refuses erasure', async () => {
  const { client, publish } = session(); await client.pair(token, starter);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
  client.forget();
  expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'error', hasPairing: false, canRestore: false, warning: expect.stringMatching(/could not be erased/) }));
  const count = fetchMock.mock.calls.length; await vi.advanceTimersByTimeAsync(120000); expect(fetchMock).toHaveBeenCalledTimes(count);
});
