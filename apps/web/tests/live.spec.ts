import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import sample from '../../../contracts/sample.theme.json' with { type: 'json' };

const bridge = 'http://127.0.0.1:43187/v1/';
const token = 'playwright-session-only-secret';
const studioOrigin = process.env.OTS_TEST_IPV6 === '1' ? 'http://localhost:5173' : 'http://127.0.0.1:5173';
const cors = { 'Access-Control-Allow-Origin': studioOrigin, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
async function pair(page: Page) {
  await page.getByRole('button', { name: 'Connect VS Code', exact: true }).click();
  await page.getByLabel('Pairing code').fill(token);
  await page.getByRole('button', { name: 'Pair, remember and apply' }).click();
}
async function color(page: Page, hex: string) {
  await page.getByLabel('Hex color').fill(hex);
  await page.getByLabel('Hex color').press('Tab');
}
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload(); });

test('VS Code authenticates once, then debounces edit/undo/redo/palette/import with no download', async ({ page }) => {
  const applies: { project: typeof sample; protocol: string; appId: string; targetVersion: string }[] = [];
  let restores = 0, downloads = 0;
  page.on('download', () => downloads++);
  await page.route(`${bridge}**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (request.url().endsWith('/health')) return route.fulfill({ json: { ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0' }, headers: cors });
    expect(request.headers().authorization).toBe(`Bearer ${token}`);
    expect(request.headers().origin).toBe(studioOrigin);
    if (request.url().endsWith('/restore')) { restores++; return route.fulfill({ json: { ok: true, restoredCount: 12 }, headers: cors }); }
    applies.push(request.postDataJSON());
    await route.fulfill({ json: { ok: true, appliedCount: 12, version: '1.144.0', warning: null }, headers: cors });
  });
  await pair(page);
  const target = page.getByRole('article', { name: 'VS Code live connection' });
  await expect(target.getByText('Connected', { exact: true })).toBeVisible();
  expect(applies).toHaveLength(1);
  expect(applies[0]).toEqual({ protocol: 'opentheme.live.v1', appId: 'vscode', targetVersion: '1.144.0', project: sample });
  await page.getByRole('button', { name: 'Edit Sidebar background' }).click();
  await color(page, '#123456'); await color(page, '#654321');
  await expect.poll(() => applies.length).toBe(2);
  expect(applies[1].project.tokens.surface).toBe('#654321');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => applies.at(-1)?.project.tokens.surface).toBe('#123456');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => applies.at(-1)?.project.tokens.surface).toBe('#654321');
  await page.getByRole('button', { name: 'Apply Paper Garden palette' }).click();
  await expect.poll(() => applies.at(-1)?.project.mode).toBe('light');
  const imported = { ...sample, name: 'Live imported', tokens: { ...sample.tokens, accent: '#ABCDEF' } };
  await page.getByLabel('Import project JSON').setInputFiles({ name: 'live.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect.poll(() => applies.at(-1)?.project.name).toBe('Live imported');
  expect(applies.at(-1)!.project).toEqual(imported);
  expect(await page.evaluate(() => localStorage.getItem('opentheme.project.v1'))).not.toContain(token);
  expect(downloads).toBe(0);
  await page.screenshot({ path: 'output/playwright/live-vscode-mock.png', fullPage: true });
  await target.getByRole('button', { name: 'Restore VS Code colors' }).click();
  await expect(target.getByText(/Restore confirmed/)).toBeVisible(); expect(restores).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('opentheme.vscode.pairing.v1'))).toBeNull();
});

test('health alone does not connect; disconnect cancels pending auto-apply', async ({ page }) => {
  let finish!: () => void;
  let count = 0;
  await page.route(`${bridge}**`, async route => {
    if (route.request().url().endsWith('/health')) return route.fulfill({ json: { ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0' }, headers: cors });
    count++;
    if (count === 1) await new Promise<void>(resolve => { finish = resolve; });
    await route.fulfill({ json: { ok: true, appliedCount: 12, version: '1.144.0', warning: null }, headers: cors });
  });
  await pair(page);
  await expect.poll(() => count).toBe(1);
  const target = page.getByRole('article', { name: 'VS Code live connection' });
  await expect(target.getByText('Connected', { exact: true })).toHaveCount(0);
  // Changes made during pairing must be sent after the first authenticated acknowledgment.
  await page.getByRole('button', { name: 'Close dialog' }).click();
  finish();
  await expect(target.getByText('Disconnected', { exact: true })).toBeVisible();
  await pair(page);
  await expect(target.getByText('Connected', { exact: true })).toBeVisible();
  await color(page, '#112233');
  await target.getByRole('button', { name: 'Disconnect VS Code' }).click();
  await page.waitForTimeout(500);
  expect(count).toBe(2);
});

for (const [status, message] of [[401, 'Pairing code rejected'], [403, 'Studio origin rejected'], [422, 'target version']] as const) {
  test(`HTTP ${status} produces a visible pairing error, never Connected`, async ({ page }) => {
    await page.route(`${bridge}**`, route => route.fulfill(route.request().url().endsWith('/health')
      ? { json: { ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0' }, headers: cors }
      : { status, json: { ok: false, code: 'REJECTED', message: token }, headers: cors }));
    await pair(page);
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByRole('alert')).not.toContainText(token);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await color(page, '#112233');
    await expect(page.getByTestId('preview')).toHaveCSS('--theme-canvas', '#112233');
  });
}

test('no companion and wrong protocol fail closed without blocking edits', async ({ page }) => {
  await page.route(`${bridge}**`, route => route.abort('connectionrefused'));
  await pair(page); await expect(page.getByRole('alert')).toContainText('Companion unavailable');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.unroute(`${bridge}**`);
  let mutations = 0;
  await page.route(`${bridge}**`, route => {
    if (!route.request().url().endsWith('/health')) mutations++;
    return route.fulfill({ json: { ok: true, protocol: 'wrong', appId: 'vscode', version: '1.144.0' }, headers: cors });
  });
  await pair(page); await expect(page.getByRole('alert')).toContainText('Wrong companion protocol');
  expect(mutations).toBe(0);
});

test('a failed established session can explicitly forget its pairing code', async ({ page }) => {
  let applies = 0;
  await page.route(`${bridge}**`, route => {
    if (route.request().url().endsWith('/health')) return route.fulfill({ json: { ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0' }, headers: cors });
    applies++;
    return route.fulfill(applies === 1
      ? { json: { ok: true, appliedCount: 12, version: '1.144.0', warning: null }, headers: cors }
      : { status: 403, json: { ok: false, code: 'ORIGIN_REJECTED', message: 'origin rejected' }, headers: cors });
  });
  await pair(page);
  const target = page.getByRole('article', { name: 'VS Code live connection' });
  await expect(target.getByText('Connected', { exact: true })).toBeVisible();
  await color(page, '#112233');
  await expect(target).toContainText('Studio origin rejected');
  await target.getByRole('button', { name: 'Forget VS Code connection' }).click();
  await expect(target.getByText('Disconnected', { exact: true })).toBeVisible();
  await expect(target.getByRole('button', { name: 'Restore VS Code colors' })).toHaveCount(0);
});

async function installFolderFixture(page: Page, foreign = false) {
  await page.evaluate(async foreign => {
    const root = await navigator.storage.getDirectory();
    const config = await root.getDirectoryHandle('.obsidian', { create: true });
    const snippets = await config.getDirectoryHandle('snippets', { create: true });
    const other = await snippets.getFileHandle('foreign.css', { create: true });
    const otherWriter = await other.createWritable(); await otherWriter.write('/* keep foreign snippet */'); await otherWriter.close();
    const appearance = await config.getFileHandle('appearance.json', { create: true });
    const appearanceWriter = await appearance.createWritable(); await appearanceWriter.write('{"keep":true}'); await appearanceWriter.close();
    if (foreign) {
      const existing = await snippets.getFileHandle('opentheme-studio.css', { create: true });
      const writer = await existing.createWritable(); await writer.write('/* FOREIGN */'); await writer.close();
    }
    const fixture = window as unknown as { fixturePermission: string; pickerActivated: boolean; showDirectoryPicker: () => Promise<unknown> };
    fixture.fixturePermission = 'granted';
    fixture.showDirectoryPicker = async () => {
      fixture.pickerActivated = navigator.userActivation.isActive;
      // The picker/permission is mocked. The returned file/directory operations use actual browser OPFS.
      return { name: '.obsidian', queryPermission: async () => fixture.fixturePermission, getDirectoryHandle: config.getDirectoryHandle.bind(config) };
    };
  }, foreign);
  // Support check is evaluated during render; reload via appearance toggle without changing document data.
  await page.getByRole('button', { name: 'Use light studio appearance' }).click();
}
async function readSnippet(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const directory = await (await root.getDirectoryHandle('.obsidian')).getDirectoryHandle('snippets');
    return (await (await directory.getFileHandle('opentheme-studio.css')).getFile()).text();
  });
}

test('Obsidian gesture writes real browser sandbox CSS, auto-updates and cleans only an owned snippet', async ({ page }) => {
  await installFolderFixture(page);
  await page.getByRole('button', { name: 'Connect Obsidian' }).click();
  const target = page.getByRole('article', { name: 'Obsidian live connection' });
  await expect(target.getByText('Connected', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { pickerActivated: boolean }).pickerActivated)).toBe(true);
  await expect(target).toContainText('Settings → Appearance → CSS snippets');
  await page.getByRole('button', { name: 'Edit Sidebar background' }).click();
  await color(page, '#123456');
  await expect.poll(() => readSnippet(page)).toContain('--background-secondary: #123456;');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => readSnippet(page)).toContain(`--background-secondary: ${sample.tokens.surface};`);
  await page.getByRole('button', { name: 'Apply Paper Garden palette' }).click();
  await expect.poll(() => readSnippet(page)).toContain('--background-secondary: #ECEFE5;');
  const css = await readSnippet(page);
  expect(css).toContain('.theme-dark {'); expect(css).toContain('.theme-light {');
  await page.screenshot({ path: 'output/playwright/live-obsidian-opfs.png', fullPage: true });
  await target.getByRole('button', { name: 'Remove generated snippet' }).click();
  await expect(target.getByText(/Owned snippet removed/)).toBeVisible();
  const untouched = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory(); const config = await root.getDirectoryHandle('.obsidian'); const snippets = await config.getDirectoryHandle('snippets');
    return { css: await (await (await snippets.getFileHandle('foreign.css')).getFile()).text(), appearance: await (await (await config.getFileHandle('appearance.json')).getFile()).text() };
  });
  expect(untouched).toEqual({ css: '/* keep foreign snippet */', appearance: '{"keep":true}' });
});

test('Obsidian foreign ownership and revoked browser permission never become a successful update', async ({ page }) => {
  await installFolderFixture(page, true);
  await page.getByRole('button', { name: 'Connect Obsidian' }).click();
  const target = page.getByRole('article', { name: 'Obsidian live connection' });
  await expect(target).toContainText('ownership check failed');
  expect(await readSnippet(page)).toBe('/* FOREIGN */');
  await target.getByRole('button', { name: 'Remove generated snippet' }).click();
  await expect(target).toContainText('ownership check failed');
  expect(await readSnippet(page)).toBe('/* FOREIGN */');
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory(); const config = await root.getDirectoryHandle('.obsidian'); const snippets = await config.getDirectoryHandle('snippets');
    // Test fixture setup only; product correctly refused to remove this foreign file.
    await snippets.removeEntry('opentheme-studio.css');
  });
  await target.getByRole('button', { name: 'Connect Obsidian' }).click();
  await expect(target.getByText('Connected', { exact: true })).toBeVisible();
  const before = await readSnippet(page);
  await page.evaluate(() => { (window as unknown as { fixturePermission: string }).fixturePermission = 'denied'; });
  await color(page, '#111111');
  await expect(target).toContainText('permission is not granted or was revoked');
  expect(await readSnippet(page)).toBe(before);
});
