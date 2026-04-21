const BASE = import.meta.env.VITE_API_URL;

function getTokens() {
  try {
    return {
      access: localStorage.getItem('ct_access'),
      refresh: localStorage.getItem('ct_refresh'),
    };
  } catch { return { access: null, refresh: null }; }
}

function saveTokens(access, refresh) {
  localStorage.setItem('ct_access', access);
  if (refresh) localStorage.setItem('ct_refresh', refresh);
}

function clearTokens() {
  localStorage.removeItem('ct_access');
  localStorage.removeItem('ct_refresh');
  localStorage.removeItem('ct_user');
}

async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    saveTokens(data.accessToken, null);
    return data.accessToken;
  } catch { clearTokens(); return null; }
}

export async function apiCall(path, options = {}) {
  const { access } = getTokens();

  const headers = {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...options.headers,
  };

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Token expired — try refresh once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${path}`, { ...options, headers });
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export { saveTokens, clearTokens, getTokens };