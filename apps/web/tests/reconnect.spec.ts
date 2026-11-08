import { test, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const origin = process.env.OTS_TEST_IPV6 === '1' ? 'http://localhost:5173' : 'http://127.0.0.1:5173';
const key = 'opentheme.vscode.pairing.v1';
const testCode = 'test-only-persistent-pairing-code';
const endpoint = 'http://127.0.0.1:43187/v1/**';
const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const health = { ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0' };
const applied = { ok: true, appliedCount: 12, version: '1.144.0', warning: null };
const card = (page: Page) => page.getByRole('article', { name: 'VS Code live connection' });
async function pair(page: Page) {
  await page.getByRole('button', { name: 'Connect VS Code', exact: true }).click();
  await page.getByLabel('Pairing code').fill(testCode);
  await page.getByRole('button', { name: 'Pair, remember and apply' }).click();
  await expect(card(page).getByText('Connected', { exact: true })).toBeVisible();
}
async function color(page: Page, value: string) { await page.getByLabel('Hex color').fill(value); await page.getByLabel('Hex color').press('Tab'); }
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload(); });

test('reload remembers pairing, authenticates before Connected, excludes code from JSON, and Forget survives reload', async ({ page }) => {
  let applies = 0, hold = false, release!: () => void;
  await page.route(endpoint, async route => {
    if (route.request().url().endsWith('/health')) return route.fulfill({ json: health, headers: cors });
    expect(route.request().headers().authorization).toBe(`Bearer ${testCode}`);
    applies++;
    if (hold) await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: applied, headers: cors });
  });
  await pair(page);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).origin, key)).toBe(origin);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project' }).click();
  const download = await downloadEvent;
  expect(await readFile((await download.path())!, 'utf8')).not.toContain(testCode);
  hold = true; await page.reload();
  await expect.poll(() => applies).toBe(2);
  await expect(card(page).getByText('Connected', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  hold = false; release();
  await expect(card(page).getByText('Connected', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/reconnect-authenticated.png', fullPage: true });
  await card(page).getByRole('button', { name: 'Disconnect VS Code' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await page.reload();
  await expect(card(page).getByText('Disconnected', { exact: true })).toBeVisible();
  expect(applies).toBe(2);
});

test('VS Code downtime and a browser reload preserve pairing and reconnect automatically with latest edits', async ({ page }) => {
  let available = true;
  const projects: { tokens: { canvas: string } }[] = [];
  await page.route(endpoint, route => {
    if (!available) return route.abort('connectionrefused');
    if (route.request().url().endsWith('/health')) return route.fulfill({ json: health, headers: cors });
    projects.push(route.request().postDataJSON().project);
    return route.fulfill({ json: applied, headers: cors });
  });
  await pair(page);
  available = false;
  await color(page, '#123456');
  await expect(card(page).getByText('Waiting for VS Code', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => !!localStorage.getItem(key), key)).toBe(true);
  await page.reload();
  await expect(card(page).getByText('Waiting for VS Code', { exact: true })).toBeVisible();
  await expect(card(page).getByText('Connected', { exact: true })).toHaveCount(0);
  await color(page, '#234567');
  await page.screenshot({ path: 'output/playwright/reconnect-waiting.png', fullPage: true });
  available = true;
  await expect(card(page).getByText('Connected', { exact: true })).toBeVisible({ timeout: 10000 });
  expect(projects.at(-1)!.tokens.canvas).toBe('#234567');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('revocation erases saved auth, requires new pairing, and never retries the revoked code', async ({ page }) => {
  let revoked = false, requests = 0;
  await page.route(endpoint, route => {
    requests++;
    if (route.request().url().endsWith('/health')) return route.fulfill({ json: health, headers: cors });
    return route.fulfill(revoked ? { status: 401, json: { ok: false, code: 'UNAUTHORIZED', message: 'revoked' }, headers: cors } : { json: applied, headers: cors });
  });
  await pair(page); revoked = true;
  await color(page, '#345678');
  await expect(card(page)).toContainText('Pairing code rejected');
  await expect(card(page).getByText('Connected', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  const before = requests;
  await page.reload();
  await expect(card(page).getByRole('button', { name: 'Connect VS Code', exact: true })).toBeVisible();
  expect(requests).toBe(before);
});

test('remembered pairing survives closing and reopening the browser process with the same profile', async ({ playwright }, info) => {
  const profile = info.outputPath('browser-profile');
  const args = process.env.OTS_TEST_IPV6 === '1' ? ['--host-resolver-rules=MAP localhost [::1]'] : [];
  let context: BrowserContext | undefined;
  let applies = 0;
  const launch = async () => {
    const next = await playwright.chromium.launchPersistentContext(profile, { headless: true, args, baseURL: origin });
    await next.route(endpoint, route => {
      if (route.request().url().endsWith('/health')) return route.fulfill({ json: health, headers: cors });
      expect(route.request().headers().authorization).toBe(`Bearer ${testCode}`);
      applies++; return route.fulfill({ json: applied, headers: cors });
    });
    return next;
  };
  try {
    context = await launch();
    const first = context.pages()[0] ?? await context.newPage(); await first.goto(origin); await pair(first);
    await context.close(); context = undefined;
    context = await launch();
    const reopened = context.pages()[0] ?? await context.newPage(); await reopened.goto(origin);
    await expect(card(reopened).getByText('Connected', { exact: true })).toBeVisible();
    await expect(reopened.getByRole('dialog')).toHaveCount(0);
    expect(applies).toBe(2);
  } finally { await context?.close(); }
});
