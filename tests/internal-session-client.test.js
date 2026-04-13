import test from 'node:test';
import assert from 'node:assert/strict';

import { createInternalSessionClient } from '../shared/internal-session-client.js';

test('markAccountRegistered creates the tag when it does not exist and then assigns it', async () => {
  const requests = [];
  const responses = [
    { ok: true, payload: { csrf_token: 'csrf-1' } },
    { ok: true, payload: { success: true, tags: [] } },
    { ok: true, payload: { success: true, tag: { id: 8, name: '已注册' } } },
    { ok: true, payload: { success: true, updated_count: 1 } },
  ];

  const client = createInternalSessionClient({
    baseUrl: 'http://localhost:5000',
    fetchImpl: async (url, options = {}) => {
      requests.push({
        url,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body) : null,
      });
      const next = responses.shift();
      return {
        ok: next.ok,
        status: next.ok ? 200 : 500,
        async json() {
          return next.payload;
        },
      };
    },
  });

  const result = await client.markAccountRegistered({
    accountId: 101,
    tagName: '已注册',
  });

  assert.deepEqual(result, { tagId: 8, created: true });
  assert.deepEqual(requests, [
    { url: 'http://localhost:5000/api/csrf-token', method: 'GET', body: null },
    { url: 'http://localhost:5000/api/tags', method: 'GET', body: null },
    { url: 'http://localhost:5000/api/tags', method: 'POST', body: { name: '已注册', color: '#16a34a' } },
    { url: 'http://localhost:5000/api/accounts/tags', method: 'POST', body: { account_ids: [101], tag_id: 8, action: 'add' } },
  ]);
});

test('getEmailDetail fetches internal email detail with encoded path params', async () => {
  const requests = [];
  const client = createInternalSessionClient({
    baseUrl: 'http://localhost:5000',
    fetchImpl: async (url, options = {}) => {
      requests.push({
        url,
        method: options.method || 'GET',
      });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            success: true,
            email: {
              id: 'm1',
              subject: 'OpenAI verification code',
              body: '<div>Code 123456</div>',
              body_type: 'html',
            },
          };
        },
      };
    },
  });

  const detail = await client.getEmailDetail('user@hotmail.com', 'm1/abc', {
    folder: 'junkemail',
    method: 'graph',
  });

  assert.equal(detail.id, 'm1');
  assert.equal(detail.body, '<div>Code 123456</div>');
  assert.equal(detail.bodyType, 'html');
  assert.deepEqual(requests, [
    {
      url: 'http://localhost:5000/api/email/user%40hotmail.com/m1%2Fabc?folder=junkemail&method=graph',
      method: 'GET',
    },
  ]);
});

test('createInternalSessionClient exposes the request url when fetch fails', async () => {
  const client = createInternalSessionClient({
    baseUrl: 'http://localhost:5000',
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  await assert.rejects(
    () => client.getCsrfToken(),
    /无法连接内部接口：http:\/\/localhost:5000\/api\/csrf-token/
  );
});
