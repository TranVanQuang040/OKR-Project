export async function apiRequest(path: string, options: RequestInit = {}) {
  const base = '/api';
  const headers = new Headers(options.headers || {});

  // Attach token if present
  const token = localStorage.getItem('okr_auth_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options && options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(base + path, { ...options, headers });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  if (!res.ok) {
    const err = new Error((body && body.message) || res.statusText);
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}
