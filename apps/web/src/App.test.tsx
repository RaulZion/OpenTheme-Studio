import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import sample from '../../../contracts/sample.theme.json';
import App from './App';

beforeEach(() => localStorage.clear());

describe('visual editor', () => {
  it('preserves an unreadable saved project instead of overwriting it on startup', () => {
    const unreadable = JSON.stringify({ ...sample, schemaVersion: '2.0.0' });
    localStorage.setItem('opentheme.project.v1', unreadable);
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not restore');
    expect(localStorage.getItem('opentheme.project.v1')).toBe(unreadable);
  });
  it('maps a keyboard-activatable preview region to the focused inspector', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = screen.getByRole('button', { name: 'Edit Sidebar background' });
    region.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Sidebar background' })).toBeVisible();
    expect(screen.getByLabelText('Hex color')).toHaveFocus();
  });
  it('isolates app edits, supports property reset and document undo/redo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Obsidian.*Notes/ }));
    await user.click(screen.getByRole('button', { name: 'Edit Editor background' }));
    await user.click(screen.getByRole('radio', { name: 'Only Obsidian' }));
    const hex = screen.getByLabelText('Hex color');
    await user.clear(hex);
    await user.type(hex, '#123456');
    await user.tab();
    expect(screen.getByTestId('preview')).toHaveStyle({ '--theme-canvas': '#123456' });
    await user.click(screen.getByRole('button', { name: /VS Code.*Code editor/ }));
    expect(screen.getByTestId('preview')).toHaveStyle({ '--theme-canvas': sample.tokens.canvas });
    await user.click(screen.getByRole('button', { name: /Obsidian.*Notes/ }));
    await user.click(screen.getByRole('button', { name: 'Reset selected override' }));
    expect(screen.getByTestId('preview')).toHaveStyle({ '--theme-canvas': sample.tokens.canvas });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('preview')).toHaveStyle({ '--theme-canvas': '#123456' });
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('preview')).toHaveStyle({ '--theme-canvas': sample.tokens.canvas });
  });
  it('keeps invalid hex edits out of history and preserves project on rejected import', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(screen.getByLabelText('Hex color'));
    await user.type(screen.getByLabelText('Hex color'), 'red');
    await user.tab();
    expect(screen.getByText(/Enter a six-digit hex color/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await user.upload(screen.getByLabelText('Import project JSON'), new File(['{}'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Import failed/);
    expect(screen.getByLabelText('Project name')).toHaveValue('Midnight Sea');
  });
  it('imports an entire document as one undoable operation and persists it locally', async () => {
    const user = userEvent.setup();
    render(<App />);
    const imported = { ...sample, name: 'Imported theme', tokens: { ...sample.tokens, accent: '#234567' } };
    await user.upload(screen.getByLabelText('Import project JSON'), new File([JSON.stringify(imported)], 'theme.json', { type: 'application/json' }));
    await waitFor(() => expect(screen.getByLabelText('Project name')).toHaveValue('Imported theme'));
    expect(JSON.parse(localStorage.getItem('opentheme.project.v1')!).tokens.accent).toBe('#234567');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Project name')).toHaveValue('Midnight Sea');
  });
  it('keeps studio light mode separate from theme data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Use light studio appearance' }));
    expect(screen.getByTestId('studio')).toHaveAttribute('data-appearance', 'light');
    expect(JSON.parse(localStorage.getItem('opentheme.project.v1')!).mode).toBe('dark');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('offers native ZIP export, labels unverified installation, and restores dialog focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Share / advanced'));
    const trigger = screen.getByRole('button', { name: 'Export theme' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Export your theme' });
    expect(within(dialog).getByText('Native theme files ready')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Download VS Code theme ZIP' })).toBeEnabled();
    expect(within(dialog).getByText(/Target version not independently verified/)).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('uses project shortcuts outside inputs while retaining text-field undo', async () => {
    const user = userEvent.setup();
    render(<App />);
    const name = screen.getByLabelText('Project name');
    await user.clear(name);
    await user.type(name, 'Renamed');
    await user.tab();
    await user.keyboard('{Control>}z{/Control}');
    expect(name).toHaveValue('Midnight Sea');
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(name).toHaveValue('Renamed');
    await user.click(name);
    await user.keyboard('{Control>}z{/Control}');
    expect(screen.getByRole('button', { name: 'Undo' })).not.toBeDisabled();
  });
});
