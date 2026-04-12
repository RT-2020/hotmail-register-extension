function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

export function getAccountStatus(ledger = {}, address) {
  return ledger[normalizeAddress(address)] || null;
}

export function markAccountStatus(ledger = {}, address, status, extra = {}) {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) {
    throw new Error('邮箱地址不能为空');
  }

  return {
    ...ledger,
    [normalizedAddress]: {
      status,
      updatedAt: new Date().toISOString(),
      ...extra,
    },
  };
}

export function findNextAvailableAccount(accounts = [], ledger = {}, startIndex = 0) {
  for (let index = Math.max(0, startIndex); index < accounts.length; index += 1) {
    const account = accounts[index];
    const status = getAccountStatus(ledger, account?.address)?.status;
    if (status !== 'completed') {
      return { account, index };
    }
  }
  return null;
}
