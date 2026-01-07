import { apiRequest } from './apiClient';

export async function getOKRs(params?: { quarter?: string; year?: number }) {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}))}` : '';
  return apiRequest(`/okrs${qs}`);
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
