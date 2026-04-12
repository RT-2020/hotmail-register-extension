import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const sidepanelHtmlPath = path.resolve('sidepanel/sidepanel.html');

test('sidepanel no longer renders the 当前状态 panel', async () => {
  const html = await fs.readFile(sidepanelHtmlPath, 'utf8');

  assert.equal(html.includes('当前状态'), false);
  assert.equal(html.includes('id="display-status"'), false);
  assert.equal(html.includes('id="status-bar"'), false);
  assert.equal(html.includes('id="current-account"'), false);
  assert.equal(html.includes('id="current-email"'), false);
  assert.equal(html.includes('id="ledger-count"'), false);
  assert.equal(html.includes('id="localhost-url"'), false);
});

test('sidepanel no longer renders deprecated advanced action buttons', async () => {
  const html = await fs.readFile(sidepanelHtmlPath, 'utf8');

  assert.equal(html.includes('id="sync-account"'), false);
  assert.equal(html.includes('id="find-email"'), false);
  assert.equal(html.includes('id="open-oauth"'), false);
  assert.equal(html.includes('id="complete-account"'), false);
  assert.equal(html.includes('id="reset-ledger"'), false);
});

test('sidepanel header no longer renders the prepare-account button', async () => {
  const html = await fs.readFile(sidepanelHtmlPath, 'utf8');

  assert.equal(html.includes('id="prepare-account"'), false);
});

test('advanced panel summary no longer renders the helper tip text', async () => {
  const html = await fs.readFile(sidepanelHtmlPath, 'utf8');

  assert.equal(html.includes('按步骤查看状态、手动补跑'), false);
});
