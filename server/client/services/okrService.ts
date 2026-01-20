import { apiRequest } from './apiClient';

export async function getOKRs(params?: { quarter?: string; year?: number }) {
  try {
    const qs = params ? `?${new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}))}` : '';
    const okrs = await apiRequest(`/okrs${qs}`);
    return Array.isArray(okrs) ? okrs : [];
  } catch (err) {
    console.error('API error for OKRs', err);
    return [];
  }
}

export async function createOKR(payload: any) {
  return apiRequest('/okrs', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateOKR(id: string, payload: any) {
  return apiRequest(`/okrs/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteOKR(id: string) {
  return apiRequest(`/okrs/${id}`, { method: 'DELETE' });
}

export async function updateOKRStatus(id: string, status: string) {
  return apiRequest(`/okrs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function addKeyResult(okrId: string, data: any) {
  return apiRequest(`/okrs/${okrId}/keyresults`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateKeyResult(okrId: string, krId: string, data: any) {
  return apiRequest(`/okrs/${okrId}/keyresults/${krId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteKeyResult(okrId: string, krId: string) {
  return apiRequest(`/okrs/${okrId}/keyresults/${krId}`, { method: 'DELETE' });
}
export async function getMyOKRs(params?: { quarter?: string; year?: number }) {
  try {
    const qs = params ? `?${new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}))}` : '';
    const okrs = await apiRequest(`/my-okrs${qs}`);
    return Array.isArray(okrs) ? okrs : [];
  } catch (err) {
    console.error('API error for my-OKRs', err);
    return [];
  }
}

export async function getMyOKRsByUser(userId: string, params?: { quarter?: string; year?: number }) {
  try {
    const qs = params ? `?${new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}))}` : '';
    const okrs = await apiRequest(`/my-okrs/user/${userId}${qs}`);
    return Array.isArray(okrs) ? okrs : [];
  } catch (err) {
    console.error('API error for user OKRs', err);
    return [];
  }
}

export async function createMyOKR(payload: any) {
  return apiRequest('/my-okrs', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateMyOKR(id: string, payload: any) {
  return apiRequest(`/my-okrs/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteMyOKR(id: string) {
  return apiRequest(`/my-okrs/${id}`, { method: 'DELETE' });
}