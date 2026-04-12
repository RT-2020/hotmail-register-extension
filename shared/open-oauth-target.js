function isAuthHostUrl(url) {
  try {
    const parsed = new URL(url);
    return ['auth0.openai.com', 'auth.openai.com', 'accounts.openai.com'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function chooseOauthTabCandidate({ currentTab = null, tabs = [] } = {}) {
  if (currentTab?.url && isAuthHostUrl(currentTab.url)) {
    return currentTab;
  }

  return tabs.find((tab) => tab?.url && isAuthHostUrl(tab.url)) || null;
}

export function listAuthTabIds(tabs = []) {
  return tabs
    .filter((tab) => tab?.id && tab?.url && isAuthHostUrl(tab.url))
    .map((tab) => tab.id);
}

export { isAuthHostUrl };
