// Simple auth helper for JWT handling and authenticated fetch

export const TOKEN_STORAGE_KEY = 'auth_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch (err) {
    // ignore
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    // ignore
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function dispatchAuthEvent(eventName) {
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch (err) {
    // ignore
  }
}

export async function authFetch(input, init = {}) {
  const token = getToken();
  const mergedInit = { ...init };

  const headers = new Headers(mergedInit.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  
  mergedInit.headers = headers;

  console.log("mergedInit", mergedInit);

  const response = await fetch(input, mergedInit);

  if (response.status === 401 || response.status === 403) {
    clearToken();
    dispatchAuthEvent('auth:logout');
  }

  return response;
}


