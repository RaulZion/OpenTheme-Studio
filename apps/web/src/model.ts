import Ajv2020 from 'ajv/dist/2020';
import schema from '../../../contracts/theme.schema.json';
import type { AppId, ColorBinding, ThemeProject } from '../../../contracts/adapter-api';

const validate = new Ajv2020({ allErrors: true, ownProperties: true }).compile(schema);
export const isColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export interface History { past: ThemeProject[]; present: ThemeProject; future: ThemeProject[] }
export const createHistory = (project: ThemeProject): History => ({ past: [], present: project, future: [] });
export const commit = (history: History, project: ThemeProject): History =>
  serializeProject(history.present) === serializeProject(project) ? history :
    { past: [...history.past, history.present].slice(-100), present: project, future: [] };
export const undo = (history: History): History => history.past.length ? {
  past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future],
} : history;
export const redo = (history: History): History => history.future.length ? {
  past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1),
} : history;
export const setColor = (project: ThemeProject, binding: ColorBinding, value: string): ThemeProject => {
  if (!isColor(value)) throw new Error('Enter a six-digit hex color, such as #91B1F1.');
  if (binding.scope === 'shared') return { ...project, [binding.collection]: { ...project[binding.collection], [binding.key]: value } };
  return { ...project, appOverrides: { ...project.appOverrides, [binding.appId]: { ...project.appOverrides?.[binding.appId], [binding.key]: value } } };
};
export const resetApp = (project: ThemeProject, app: string): ThemeProject => {
  const overrides = { ...project.appOverrides };
  delete overrides[app as AppId];
  return { ...project, appOverrides: overrides };
};
export const resetOverride = (project: ThemeProject, app: AppId, key: string): ThemeProject => {
  const overrides = { ...project.appOverrides?.[app] };
  delete overrides[key];
  return { ...project, appOverrides: { ...project.appOverrides, [app]: overrides } };
};
export const parseProject = (text: string): ThemeProject => {
  if (text.length > 1_048_576) throw new Error('Project files must be smaller than 1 MB.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!validate(data)) {
    const error = validate.errors?.[0];
    throw new Error(`Invalid project: ${error?.instancePath || '/'} ${error?.message || 'does not match schema 1.0.0'}.`);
  }
  // The JSON Schema intentionally permits future app IDs; preserve them unchanged.
  return data as unknown as ThemeProject;
};
export const serializeProject = (project: ThemeProject): string => JSON.stringify(project, null, 2) + '\n';

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
