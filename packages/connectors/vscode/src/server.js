/**
 * Authenticated loopback-only HTTP server for OpenTheme Studio Live Sync.
 * Conforms strictly to contracts/LIVE_SYNC_V1.md.
 */

import { createServer } from 'node:http';
import {
  SUPPORTED_PROTOCOL,
  SUPPORTED_APP_ID,
  validateProtocol,
  validateAppId,
  validateTargetVersion,
  validateProject,
} from './validator.js';

export const DEFAULT_PORT = 43187;
export const LOOPBACK_HOST = '127.0.0.1';
export const MAX_BODY_BYTES = 256 * 1024; // 256 KiB

export const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

/**
 * Checks whether an incoming remote address is strictly loopback.
 * @param {string | undefined} ip
 * @returns {boolean}
 */
export function isLoopbackAddress(ip) {
  if (!ip) return false;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * Sends a JSON response with standard UTF-8 headers.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {Record<string, unknown>} body
 * @param {string | null} [corsOrigin]
 */
function sendJson(res, status, body, corsOrigin = null) {
  const payload = JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Connection': 'close',
  };
  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin;
    headers['Access-Control-Allow-Private-Network'] = 'true';
  }
  res.writeHead(status, headers);
  res.end(payload);
}

/**
 * Reads and enforces 256 KiB maximum body size on an incoming request.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        const err = new Error('Payload exceeds 256 KiB limit');
        err.name = 'PayloadTooLargeError';
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

export class LiveSyncServer {
  /**
   * @param {object} options
   * @param {import('./state-manager.js').StateManager} options.stateManager
   * @param {string} [options.appVersion] VS Code version string
   * @param {Set<string>} [options.allowedOrigins] Optional override for allowed origins
   */
  constructor(options) {
    this.stateManager = options.stateManager;
    this.appVersion = options.appVersion || '1.144.0';
    this.allowedOrigins = options.allowedOrigins || ALLOWED_ORIGINS;
    this.server = null;
    this.port = DEFAULT_PORT;
    this.host = LOOPBACK_HOST;
  }

  /**
   * Starts the HTTP server on 127.0.0.1:43187.
   * @param {number} [port]
   * @param {string} [host]
   * @returns {Promise<number>}
   */
  start(port = DEFAULT_PORT, host = LOOPBACK_HOST) {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve(this.port);
        return;
      }

      this.port = port;
      this.host = host;

      const s = createServer((req, res) => this._handleRequest(req, res));

      s.on('error', (err) => {
        reject(err);
      });

      s.listen(this.port, this.host, () => {
        this.server = s;
        resolve(this.port);
      });
    });
  }

  /**
   * Stops the HTTP server cleanly.
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Core request dispatcher.
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async _handleRequest(req, res) {
    // 1. Strict loopback check
    const remoteIp = req.socket.remoteAddress;
    if (!isLoopbackAddress(remoteIp)) {
      req.socket.destroy();
      return;
    }

    const origin = req.headers['origin'];
    let validCorsOrigin = null;

    if (origin) {
      if (!this.allowedOrigins.has(origin)) {
        sendJson(res, 403, {
          ok: false,
          code: 'FORBIDDEN_ORIGIN',
          message: `Origin "${origin}" is not permitted.`,
        });
        return;
      }
      validCorsOrigin = origin;
    }

    // 2. Handle CORS preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
      if (validCorsOrigin) {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': validCorsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Private-Network': 'true',
          'Access-Control-Max-Age': '86400',
          'Connection': 'close',
        });
        res.end();
      } else {
        sendJson(res, 403, {
          ok: false,
          code: 'FORBIDDEN_ORIGIN',
          message: 'Origin not permitted in preflight.',
        });
      }
      return;
    }

    const url = req.url ? req.url.split('?')[0] : '';

    // 3. GET /v1/health (No auth required)
    if (req.method === 'GET' && url === '/v1/health') {
      sendJson(
        res,
        200,
        {
          ok: true,
          protocol: SUPPORTED_PROTOCOL,
          appId: SUPPORTED_APP_ID,
          version: this.appVersion,
        },
        validCorsOrigin
      );
      return;
    }

    // 4. Authenticated endpoints: POST /v1/apply, POST /v1/restore
    if (url === '/v1/apply' || url === '/v1/restore') {
      if (req.method !== 'POST') {
        sendJson(
          res,
          405,
          {
            ok: false,
            code: 'METHOD_NOT_ALLOWED',
            message: `Method "${req.method}" not allowed on ${url}.`,
          },
          validCorsOrigin
        );
        return;
      }

      // Check Bearer authorization
      const authHeader = req.headers['authorization'];
      if (!this.stateManager.verifyToken(authHeader)) {
        sendJson(
          res,
          401,
          {
            ok: false,
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing pairing token.',
          },
          validCorsOrigin
        );
        return;
      }

      let rawBody = '';
      try {
        rawBody = await readBody(req);
      } catch (err) {
        if (err && err.name === 'PayloadTooLargeError') {
          sendJson(
            res,
            413,
            {
              ok: false,
              code: 'PAYLOAD_TOO_LARGE',
              message: 'Request payload exceeds 256 KiB limit.',
            },
            validCorsOrigin
          );
          return;
        }
        sendJson(
          res,
          400,
          {
            ok: false,
            code: 'READ_BODY_FAILED',
            message: 'Failed to read request body.',
          },
          validCorsOrigin
        );
        return;
      }

      let body = {};
      if (rawBody.trim().length > 0) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          sendJson(
            res,
            400,
            {
              ok: false,
              code: 'BAD_JSON',
              message: 'Request body must be valid JSON.',
            },
            validCorsOrigin
          );
          return;
        }
      }

      if (url === '/v1/restore') {
        try {
          const result = await this.stateManager.restoreOriginalColors();
          sendJson(
            res,
            200,
            {
              ok: true,
              restoredCount: result.restoredCount,
            },
            validCorsOrigin
          );
        } catch {
          sendJson(
            res,
            500,
            {
              ok: false,
              code: 'RESTORE_FAILED',
              message: 'Failed to restore original colors in VS Code configuration.',
            },
            validCorsOrigin
          );
        }
        return;
      }

      if (url === '/v1/apply') {
        const protoRes = validateProtocol(body.protocol);
        if (!protoRes.valid) {
          sendJson(res, 400, { ok: false, ...protoRes.error }, validCorsOrigin);
          return;
        }

        const appRes = validateAppId(body.appId);
        if (!appRes.valid) {
          sendJson(res, 422, { ok: false, ...appRes.error }, validCorsOrigin);
          return;
        }

        const verRes = validateTargetVersion(body.targetVersion);

        const projRes = validateProject(body.project);
        if (!projRes.valid) {
          sendJson(res, 400, { ok: false, ...projRes.error }, validCorsOrigin);
          return;
        }

        try {
          const { appliedCount } = await this.stateManager.applyTheme(body.project);
          sendJson(
            res,
            200,
            {
              ok: true,
              appliedCount,
              version: this.appVersion,
              warning: verRes.warning,
            },
            validCorsOrigin
          );
        } catch {
          sendJson(
            res,
            500,
            {
              ok: false,
              code: 'APPLY_FAILED',
              message: 'Failed to update VS Code configuration settings.',
            },
            validCorsOrigin
          );
        }
        return;
      }
    }

    // 5. Default 404 for unknown endpoints
    sendJson(
      res,
      404,
      {
        ok: false,
        code: 'NOT_FOUND',
        message: `Endpoint "${url}" not found.`,
      },
      validCorsOrigin
    );
  }
}
