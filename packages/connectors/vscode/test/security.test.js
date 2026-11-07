import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLoopbackAddress } from '../src/server.js';
import { validateProject } from '../src/validator.js';

const sampleProject = JSON.parse(
  readFileSync(new URL('../../../../contracts/sample.theme.json', import.meta.url), 'utf8')
);

test('Security: isLoopbackAddress strictly validates loopback IPs', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);

  assert.equal(isLoopbackAddress('192.168.1.1'), false);
  assert.equal(isLoopbackAddress('10.0.0.1'), false);
  assert.equal(isLoopbackAddress('0.0.0.0'), false);
  assert.equal(isLoopbackAddress('8.8.8.8'), false);
  assert.equal(isLoopbackAddress(''), false);
  assert.equal(isLoopbackAddress(undefined), false);
});

test('Security: rejects prototype pollution attempts in appOverrides', () => {
  const vscodeOverrides1 = JSON.parse('{"__proto__": "#112233"}');
  const payload1 = {
    ...sampleProject,
    appOverrides: {
      vscode: vscodeOverrides1,
    },
  };
  const res1 = validateProject(payload1);
  assert.equal(res1.valid, false);
  assert.equal(res1.error?.code, 'INVALID_PROJECT');

  const vscodeOverrides2 = JSON.parse('{"constructor": "#112233"}');
  const payload2 = {
    ...sampleProject,
    appOverrides: {
      vscode: vscodeOverrides2,
    },
  };
  const res2 = validateProject(payload2);
  assert.equal(res2.valid, false);
  assert.equal(res2.error?.code, 'INVALID_PROJECT');
});

test('Security: rejects CSS injection and remote resource syntax in color values', () => {
  const injections = [
    'red; background: url(https://evil.com/x)',
    '#FFFFFF; color: red',
    'url("http://attacker.com")',
    '<script>alert(1)</script>',
    '#123; -webkit-animation: evil',
  ];

  for (const inject of injections) {
    const badProject = {
      ...sampleProject,
      tokens: {
        ...sampleProject.tokens,
        accent: inject,
      },
    };
    const res = validateProject(badProject);
    assert.equal(res.valid, false, `Should reject injection: ${inject}`);
    assert.equal(res.error?.code, 'INVALID_PROJECT');
  }
});

test('Security: rejects path traversal and control characters in projectId and name', () => {
  const badIdProject = {
    ...sampleProject,
    projectId: '../../etc/passwd',
  };
  const res1 = validateProject(badIdProject);
  assert.equal(res1.valid, false);

  const controlCharProject = {
    ...sampleProject,
    name: 'Theme\x00Exploit',
  };
  const res2 = validateProject(controlCharProject);
  assert.equal(res2.valid, false);
});
