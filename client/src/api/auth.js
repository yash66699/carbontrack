import { apiCall, saveTokens, clearTokens } from './client';

export async function register(name, email, password) {
  const data = await apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  saveTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('ct_user', JSON.stringify(data.user));
  return data.user;
}

export async function login(email, password) {
  const data = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveTokens(data.accessToken, data.refreshToken);
  localStorage.setItem('ct_user', JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  clearTokens();
  localStorage.removeItem('ct_user');
}

export async function forgotPassword(email) {
  return apiCall('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  return apiCall('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('ct_user') || 'null');
  } catch { return null; }
}

export function updateSavedUser(updates) {
  const user = getSavedUser();
  if (user) localStorage.setItem('ct_user', JSON.stringify({ ...user, ...updates }));
}