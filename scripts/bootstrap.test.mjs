import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));

test('root workspace locks its package manager and JS baseline', () => {
  const pkg = load('package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.packageManager, 'pnpm@10.34.9');
  assert.match(readFileSync(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8'), /packages\/adapters\/\*/);
});

test('canonical schema and example agree on version and required roles', () => {
  const schema = load('contracts/theme.schema.json');
  const example = load('contracts/sample.theme.json');
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, example.schemaVersion);
  for (const key of schema.properties.tokens.required) {
    assert.match(example.tokens[key], /^#[a-fA-F0-9]{6}$/);
  }
});

test('version targets are separated from installed verification', () => {
  const obj = load('contracts/targets.json');
  assert.equal(obj.g1[0].version, '1.144.0');
  assert.equal(obj.g1[1].version, '1.15.0');
  assert.ok([...obj.g1, ...obj.g2ResearchOnly].every((x) => x.installedTestStatus === 'not-run'));
});
