import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildCommand } from './server.mjs';

const serverPath = fileURLToPath(new URL('./server.mjs', import.meta.url));

test('builds documented read commands and rejects overrides', () => {
  assert.deepEqual(buildCommand('read', 'transactions.list', {
    account: 'account-id', start: '2026-01-01', end: '2026-01-31',
  }).args, [
    '--format=json', 'transactions', 'list', '--account=account-id',
    '--start=2026-01-01', '--end=2026-01-31',
  ]);
  assert.throws(() => buildCommand('read', 'accounts.delete', { id: 'account-id' }), /Unsupported operation/);
  assert.throws(() => buildCommand('read', 'accounts.list', { serverUrl: 'https://example.test' }), /Unknown parameter/);
});

test('requires integer cents and keeps JSON as one argument', () => {
  assert.throws(() => buildCommand('write', 'budgets.setAmount', {
    month: '2026-03', category: 'category-id', amount: 12.5,
  }), /integer/);
  assert.deepEqual(buildCommand('write', 'transactions.add', {
    account: 'account-id', data: [{ date: '2026-03-13', amount: -5000 }],
  }).args, [
    '--format=json', 'transactions', 'add', '--account=account-id',
    '--data=[{"date":"2026-03-13","amount":-5000}]',
  ]);
  assert.throws(() => buildCommand('write', 'transactions.add', {
    account: 'account-id', data: [{ date: '2026-03-13', amount: -50.25 }],
  }), /integer cents/);
});

test('serves MCP tools and forwards a read call', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'actual-budget-cli-mcp-'));
  const fakeCli = path.join(tempDir, 'actual');
  await fs.writeFile(fakeCli, '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ argv: process.argv.slice(2) }) + "\\n");\n');
  await fs.chmod(fakeCli, 0o755);

  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ACTUAL_CLI_BIN: fakeCli },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const pending = new Map();
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  let nextId = 0;
  function request(method, params) {
    const id = ++nextId;
    return new Promise(resolve => {
      pending.set(id, resolve);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  try {
    const initialized = await request('initialize', { protocolVersion: '2025-06-18' });
    assert.equal(initialized.result.serverInfo.name, 'actual-budget-cli-mcp');
    const listed = await request('tools/list', {});
    assert.deepEqual(listed.result.tools.map(tool => tool.name), [
      'actual_operations', 'actual_read', 'actual_write',
    ]);
    const called = await request('tools/call', {
      name: 'actual_read', arguments: { operation: 'accounts.list', params: { includeClosed: true } },
    });
    assert.deepEqual(called.result.structuredContent.data.argv, [
      '--format=json', 'accounts', 'list', '--include-closed',
    ]);
    const blocked = await request('tools/call', {
      name: 'actual_read', arguments: { operation: 'accounts.delete', params: { id: 'account-id' } },
    });
    assert.equal(blocked.result.isError, true);
  } finally {
    child.stdin.end();
    child.kill();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
