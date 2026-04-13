const DEFAULT_BASE_URL = 'http://localhost:5000';

function buildUrl(baseUrl, pathname, query = {}) {
  const url = new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseJsonResponse(response) {
  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `邮件平台请求失败 (${response.status})`);
  }
  return payload;
}

function buildFetchFailureMessage(url, error) {
  const reason = error?.message || String(error);
  return `无法连接邮箱平台接口：${url}。请确认 API URL 可访问、服务已启动，且当前证书/网络未拦截请求。原始错误：${reason}`;
}

function normalizeAccount(account = {}) {
  return {
    id: account.id || 0,
    address: String(account.email || '').trim().toLowerCase(),
    aliases: Array.isArray(account.aliases) ? account.aliases.map((item) => String(item || '').trim().toLowerCase()) : [],
    password: account.password || account.mail_password || account.login_password || '',
    clientId: account.client_id || account.clientId || '',
    refreshToken: account.refresh_token || account.refreshToken || '',
    groupId: account.group_id || 0,
    groupName: account.group_name || '',
    tags: Array.isArray(account.tags) ? account.tags : [],
    status: account.status || '',
    provider: account.provider || '',
    requestedEmail: account.requested_email || '',
    resolvedEmail: account.resolved_email || account.email || '',
    matchedAlias: account.matched_alias || '',
  };
}

function normalizeMail(mail = {}) {
  return {
    messageId: mail.id || mail.message_id || '',
    from: mail.from || '',
    to: mail.to || '',
    subject: mail.subject || '',
    bodyText: mail.body_preview || mail.body_text || '',
    bodyHtml: mail.mail_body_html || mail.body_html || '',
    receivedAt: mail.date || mail.received_at || '',
    folder: mail.folder || '',
  };
}

export function createLuckmailClient({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) {
    throw new Error('邮件平台 API Key 不能为空');
  }
  if (!baseUrl) {
    throw new Error('邮件平台 Base URL 不能为空');
  }

  async function request(pathname, query, options = {}) {
    const url = buildUrl(baseUrl, pathname, query);
    let response;
    try {
      response = await fetchImpl(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new Error(buildFetchFailureMessage(url, error));
    }
    return parseJsonResponse(response);
  }

  async function listAccounts({ groupId } = {}) {
    const payload = await request('/api/external/accounts', {
      group_id: groupId,
    });
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
    return accounts.map(normalizeAccount);
  }

  async function findUserEmailByAddress(address, options = {}) {
    const normalizedAddress = String(address || '').trim().toLowerCase();
    const accounts = await listAccounts(options);
    return accounts.find((account) => (
      account.address === normalizedAddress
      || account.aliases.includes(normalizedAddress)
    )) || null;
  }

  async function findFirstUnregisteredAccount({
    tagName = '已注册',
    excludeStatuses = [],
    excludedAddresses = [],
    groupId,
  } = {}) {
    const accounts = await listAccounts({ groupId });
    const blockedStatuses = new Set(excludeStatuses);
    const blockedAddresses = new Set(excludedAddresses.map((item) => String(item || '').trim().toLowerCase()));
    return accounts.find((account) => {
      const hasRegisteredTag = account.tags.some((tag) => tag?.name === tagName);
      const isBlocked = blockedStatuses.has(account.status);
      const isExcludedAddress = blockedAddresses.has(account.address);
      return !hasRegisteredTag && !isBlocked && !isExcludedAddress;
    }) || null;
  }

  async function importEmails() {
    return {
      skipped: true,
      message: '当前平台不需要在插件内导入邮箱，请在平台后台管理邮箱池。',
    };
  }

  async function listUserEmailMails(email, {
    folder = 'all',
    top = 10,
    skip = 0,
    subjectContains = '',
    fromContains = '',
    keyword = '',
  } = {}) {
    const payload = await request('/api/external/emails', {
      email,
      folder,
      top,
      skip,
      subject_contains: subjectContains,
      from_contains: fromContains,
      keyword,
    });
    const emails = Array.isArray(payload.emails) ? payload.emails : [];
    return {
      emails: emails.map(normalizeMail),
      partial: Boolean(payload.partial),
      details: payload.details || null,
      requestedEmail: payload.requested_email || email,
      resolvedEmail: payload.resolved_email || email,
      matchedAlias: payload.matched_alias || '',
      hasMore: Boolean(payload.has_more),
    };
  }

  return {
    importEmails,
    findFirstUnregisteredAccount,
    listAccounts,
    findUserEmailByAddress,
    listUserEmailMails,
  };
}
