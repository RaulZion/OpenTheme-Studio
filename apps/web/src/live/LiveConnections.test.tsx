import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { starter } from '../presets';
import LiveConnections from './LiveConnections';

beforeEach(() => {
  vi.stubGlobal('location', { origin: 'http://127.0.0.1:5173' });
  vi.stubGlobal('isSecureContext', true);
});
it('never uses health alone as a connected acknowledgment and can cancel pairing', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, protocol: 'opentheme.live.v1', appId: 'vscode', version: '1.144.0' }))).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  vi.stubGlobal('fetch', fetchMock);
  render(<LiveConnections project={starter} />);
  await user.click(screen.getByRole('button', { name: 'Connect VS Code' }));
  const dialog = screen.getByRole('dialog', { name: 'Connect VS Code' });
  await user.type(within(dialog).getByLabelText('Pairing code'), 'test-pairing-code');
  await user.click(within(dialog).getByRole('button', { name: 'Pair and apply' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const target = screen.getByRole('article', { name: 'VS Code live connection' });
  expect(within(target).queryByText('Connected', { exact: true })).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
  expect(within(target).getByText('Disconnected', { exact: true })).toBeVisible();
});
it('shows explicit unsupported-browser and pairing errors without blocking local editor state', async () => {
  const user = userEvent.setup();
  render(<LiveConnections project={starter} />);
  expect(screen.getByRole('button', { name: 'Connect Obsidian' })).toBeDisabled();
  expect(screen.getByText(/Folder access requires/)).toBeVisible();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await user.click(screen.getByRole('button', { name: 'Connect VS Code' }));
  await user.type(screen.getByLabelText('Pairing code'), 'test-code');
  await user.click(screen.getByRole('button', { name: 'Pair and apply' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Companion unavailable/);
});
