import sample from '../../../contracts/sample.theme.json';
import type { ThemeProject } from '../../../contracts/adapter-api';

export const starter = sample as ThemeProject;
export const presets = [
  { name: 'Midnight Sea', tag: 'Calm & focused', mode: 'dark' as const, tokens: starter.tokens, syntax: starter.syntax },
  { name: 'Velvet Dusk', tag: 'A softer after-hours', mode: 'dark' as const, tokens: {
    canvas: '#211D2B', surface: '#292334', surfaceRaised: '#383044', text: '#F1EAF5', textMuted: '#BCADC9', border: '#51445F',
    accent: '#C2A0ED', accentText: '#21172E', selection: '#594372', error: '#F29DAD', warning: '#E4C18C', success: '#A6CFAF',
  }, syntax: { comments: '#AB9AB8', keywords: '#C2A0ED', strings: '#A6CFAF', numbers: '#E4C18C', types: '#A6C8EA' } },
  { name: 'Paper Garden', tag: 'A fresh perspective', mode: 'light' as const, tokens: {
    canvas: '#F7F8F2', surface: '#ECEFE5', surfaceRaised: '#E1E7D8', text: '#29362F', textMuted: '#596A5E', border: '#ADB9A5',
    accent: '#386947', accentText: '#FFFFFF', selection: '#CFDFC1', error: '#A92F45', warning: '#7B5715', success: '#326C4A',
  }, syntax: { comments: '#687864', keywords: '#76508A', strings: '#386947', numbers: '#96601C', types: '#326477' } },
];
