function buildUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

async function parseJsonResponse(response) {
  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `内部接口请求失败 (${response.status})`);
  }
  return payload;
}

export function createInternalSessionClient({
  baseUrl,
  fetchImpl = fetch,
} = {}) {
  if (!baseUrl) {
    throw new Error('内部接口 Base URL 不能为空');
  }

  async function request(pathname, options = {}) {
    const response = await fetchImpl(buildUrl(baseUrl, pathname), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.csrfToken ? { 'X-CSRF-Token': options.csrfToken } : {}),
        ...(options.headers || {}),
      },
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    return parseJsonResponse(response);
  }

  async function getCsrfToken() {
    const payload = await request('/api/csrf-token');
    return payload.csrf_token || null;
  }

  async function listTags() {
    const payload = await request('/api/tags');
    return Array.isArray(payload.tags) ? payload.tags : [];
  }

  async function createTag({ name, color = '#16a34a', csrfToken }) {
    const payload = await request('/api/tags', {
      method: 'POST',
      csrfToken,
      body: { name, color },
    });
    return payload.tag || null;
  }

  async function setAccountTag({ accountIds, tagId, action = 'add', csrfToken }) {
    return request('/api/accounts/tags', {
      method: 'POST',
      csrfToken,
      body: {
        account_ids: accountIds,
        tag_id: tagId,
        action,
      },
    });
  }

  async function getEmailDetail(email, messageId, {
    folder = 'inbox',
    method = 'graph',
  } = {}) {
    if (!email) {
      throw new Error('获取邮件详情缺少邮箱地址');
    }
    if (!messageId) {
      throw new Error('获取邮件详情缺少 messageId');
    }

    const encodedEmail = encodeURIComponent(email);
    const encodedMessageId = encodeURIComponent(messageId);
    const payload = await request(`/api/email/${encodedEmail}/${encodedMessageId}?folder=${encodeURIComponent(folder)}&method=${encodeURIComponent(method)}`);
    const emailPayload = payload.email || {};
    return {
      id: emailPayload.id || messageId,
      subject: emailPayload.subject || '',
      body: emailPayload.body || '',
      bodyText: emailPayload.body_text || emailPayload.body || '',
      bodyType: emailPayload.body_type || '',
      from: emailPayload.from || '',
      to: emailPayload.to || '',
      date: emailPayload.date || '',
    };
  }

  async function markAccountRegistered({ accountId, tagName = '已注册', tagColor = '#16a34a' }) {
    const csrfToken = await getCsrfToken();
    const tags = await listTags();
    let tag = tags.find((item) => item?.name === tagName) || null;
    let created = false;

    if (!tag) {
      tag = await createTag({ name: tagName, color: tagColor, csrfToken });
      created = true;
    }
    if (!tag?.id) {
      throw new Error(`无法创建或获取标签：${tagName}`);
    }

    await setAccountTag({
      accountIds: [accountId],
      tagId: tag.id,
      action: 'add',
      csrfToken,
    });

    return { tagId: tag.id, created };
  }

  return {
    getCsrfToken,
    listTags,
    createTag,
    getEmailDetail,
    setAccountTag,
    markAccountRegistered,
  };
}
