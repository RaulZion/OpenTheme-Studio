import type { ThemeProject } from '../../../../contracts/adapter-api';
import { parseProject, serializeProject } from '../model';
import { targetVersion } from '../development-adapters';
export interface Receipt { message: string; warning?: string }
export interface LiveSink { apply(project: ThemeProject, signal: AbortSignal): Promise<Receipt> }
export interface VSCodeSink extends LiveSink { restore(signal: AbortSignal): Promise<void> }

export const LIVE_PROTOCOL = 'opentheme.live.v1';
export const LOCAL_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];
export class VSCodeConnectionError extends Error {
  constructor(message: string, readonly kind: 'unavailable' | 'unauthorized' | 'rejected', readonly status?: number) { super(message); }
}
export function requireLocalOrigin(origin = location.origin): void {
  if (!LOCAL_ORIGINS.includes(origin)) throw new Error('Open the local Studio at http://127.0.0.1:5173 or http://localhost:5173 to connect.');
}

const httpErrors: Record<number, string> = {
  400: 'The companion rejected the project. Local edits are kept.',
  401: 'Pairing code rejected or revoked. Copy a new code from VS Code and reconnect.',
  403: 'Studio origin rejected. Enable this exact local Studio origin in the companion.',
  409: 'Companion session or port conflict. Check the enabled VS Code extension.',
  413: 'Project exceeds the companion request limit of 256 KiB.',
  422: 'The companion cannot apply this project or target version. Check the adapter/version.',
  500: 'VS Code settings update failed. Check the companion and reconnect.',
};

async function request(path: '/health' | '/apply' | '/restore', outer: AbortSignal, token?: string, body?: string): Promise<Record<string, unknown>> {
  outer.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort();
  outer.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 3000);
  try {
    let response: Response;
    try {
      response = await fetch(`http://127.0.0.1:43187/v1${path}`, {
        method: path === '/health' ? 'GET' : 'POST',
        mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : undefined,
        body, signal: controller.signal,
      });
    } catch {
      outer.throwIfAborted();
      throw new VSCodeConnectionError(timedOut ? 'Companion request timed out.' : 'Companion unavailable or browser blocked the local network/CORS request. Enable Live Sync in VS Code and allow the local connection.', 'unavailable');
    }
    if (!response.ok) throw new VSCodeConnectionError(`${httpErrors[response.status] ?? 'Companion request failed.'} (HTTP ${response.status})`, response.status === 401 ? 'unauthorized' : [502, 503, 504].includes(response.status) ? 'unavailable' : 'rejected', response.status);
    let text: string;
    try { text = await response.text(); }
    catch {
      outer.throwIfAborted();
      throw new VSCodeConnectionError(timedOut ? 'Companion request timed out.' : 'Companion response interrupted. Waiting for VS Code to return.', 'unavailable');
    }
    let result: unknown;
    try { if (text.length > 4096) throw new Error(); result = JSON.parse(text); }
    catch { throw new Error('Invalid companion response. Sync paused.'); }
    if (!result || typeof result !== 'object' || (result as Record<string, unknown>).ok !== true) throw new Error('Companion did not confirm the update. Sync paused.');
    return result as Record<string, unknown>;
  } finally {
    clearTimeout(timer); outer.removeEventListener('abort', abort);
  }
}

export async function checkVSCodeHealth(signal: AbortSignal, origin = location.origin): Promise<Record<string, unknown>> {
  requireLocalOrigin(origin);
  const health = await request('/health', signal);
  if (health.protocol !== LIVE_PROTOCOL || health.appId !== 'vscode' || typeof health.version !== 'string' || !/^\d+\.\d+\.\d+/.test(health.version)) {
    throw new Error('Wrong companion protocol or application response. Expected opentheme.live.v1 for VS Code.');
  }
  return health;
}

export async function pairVSCode(token: string, project: ThemeProject, signal: AbortSignal, origin = location.origin): Promise<{ sink: VSCodeSink; receipt: Receipt }> {
  requireLocalOrigin(origin);
  if (!token || token.length > 512 || /[^\x21-\x7e]/.test(token)) throw new Error('Paste the pairing code copied from the VS Code companion.');
  // Validate before health or mutations; never send arbitrary settings/URLs.
  parseProject(serializeProject(project));
  const health = await checkVSCodeHealth(signal, origin);
  const sink: VSCodeSink = {
    async apply(next, nextSignal) {
      const validated = parseProject(serializeProject(next));
      const version = targetVersion('vscode');
      const body = JSON.stringify({ protocol: LIVE_PROTOCOL, appId: 'vscode', targetVersion: version, project: validated });
      if (new TextEncoder().encode(body).byteLength > 256 * 1024) throw new Error('Project exceeds the companion request limit of 256 KiB.');
      const result = await request('/apply', nextSignal, token, body);
      if (!Number.isSafeInteger(result.appliedCount) || (result.appliedCount as number) < 0 || typeof result.version !== 'string' || !/^\d+\.\d+\.\d+/.test(result.version) || !(result.warning === null || typeof result.warning === 'string')) {
        throw new Error('Invalid companion apply response. No successful update confirmed.');
      }
      const warnings: string[] = [];
      if (result.version !== version || health.version !== version) warnings.push(`Actual VS Code ${result.version}; documentation target ${version}. Compatibility is unverified.`);
      if (result.warning) warnings.push((result.warning as string).replaceAll(token, '[redacted]').slice(0, 300));
      return { message: `Companion confirmed ${result.appliedCount} color settings applied in VS Code ${result.version}.`, warning: warnings.join(' ') || undefined };
    },
    async restore(nextSignal) { await request('/restore', nextSignal, token); },
  };
  const receipt = await sink.apply(project, signal);
  return { sink, receipt };
}
