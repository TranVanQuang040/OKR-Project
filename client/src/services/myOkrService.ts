import { apiRequest } from './apiClient';

export async function getMyOKRs(params?: { quarter?: string; year?: number }) {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}))}` : '';
  return apiRequest(`/my-okrs${qs}`);
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

export async function updateMyOKRStatus(id: string, status: string) {
  return apiRequest(`/my-okrs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function addKeyResult(okrId: string, data: any) {
  return apiRequest(`/my-okrs/${okrId}/keyresults`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateKeyResult(okrId: string, krId: string, data: any) {
  return apiRequest(`/my-okrs/${okrId}/keyresults/${krId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteKeyResult(okrId: string, krId: string) {
  return apiRequest(`/my-okrs/${okrId}/keyresults/${krId}`, { method: 'DELETE' });
}