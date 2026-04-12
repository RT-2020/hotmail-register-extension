import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findNextAvailableAccount,
  getAccountStatus,
  markAccountStatus,
} from '../shared/account-ledger.js';

test('findNextAvailableAccount skips completed accounts', () => {
  const accounts = [
    { address: 'used@hotmail.com' },
    { address: 'fresh@hotmail.com' },
  ];
  const ledger = {
    'used@hotmail.com': { status: 'completed', updatedAt: '2026-04-12T00:00:00.000Z' },
  };

  const result = findNextAvailableAccount(accounts, ledger);

  assert.equal(result.index, 1);
  assert.equal(result.account.address, 'fresh@hotmail.com');
});

test('markAccountStatus normalizes address and writes status', () => {
  const ledger = markAccountStatus({}, ' User@Hotmail.com ', 'completed');

  assert.equal(getAccountStatus(ledger, 'user@hotmail.com').status, 'completed');
});

test('findNextAvailableAccount returns null when all accounts are completed', () => {
  const accounts = [
    { address: 'used1@hotmail.com' },
    { address: 'used2@hotmail.com' },
  ];
  const ledger = {
    'used1@hotmail.com': { status: 'completed' },
    'used2@hotmail.com': { status: 'completed' },
  };

  const result = findNextAvailableAccount(accounts, ledger);
  assert.equal(result, null);
});
