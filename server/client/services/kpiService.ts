import { apiRequest } from './apiClient';
import { KPI } from '../types';

const normalizeId = (item: any): KPI => {
    if (!item) return item;
    const normalized = { ...item };
    if (normalized._id && !normalized.id) {
        normalized.id = normalized._id;
    }
    return normalized;
};

export async function getKPIs(params?: {
    type?: string;
    department?: string;
    quarter?: string;
    year?: number;
    userId?: string;
}) {
    try {
        const filteredParams = params ? Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        ) : {};
        const qs = Object.keys(filteredParams).length > 0
            ? `?${new URLSearchParams(Object.entries(filteredParams).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}))}`
            : '';
        const res = await apiRequest(`/kpis${qs}`);
        return Array.isArray(res) ? res.map(normalizeId) : [];
    } catch (err) {
        console.error('API error for KPIs', err);
        return [];
    }
}

export async function getDepartmentKPIs(department: string): Promise<KPI[]> {
    try {
        const res = await apiRequest(`/kpis/department/${department}`);
        return Array.isArray(res) ? res.map(normalizeId) : [];
    } catch (err) {
        console.error('API error for department KPIs', err);
        return [];
    }
}

export async function getPersonalKPIs(userId: string): Promise<KPI[]> {
    try {
        const res = await apiRequest(`/kpis/personal/${userId}`);
        return Array.isArray(res) ? res.map(normalizeId) : [];
    } catch (err) {
        console.error('API error for personal KPIs', err);
        return [];
    }
}

export async function createKPI(payload: Partial<KPI>): Promise<KPI> {
    const res = await apiRequest('/kpis', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return normalizeId(res);
}

export async function getKPI(id: string): Promise<KPI> {
    const res = await apiRequest(`/kpis/${id}`);
    return normalizeId(res);
}

export async function updateKPI(id: string, payload: Partial<KPI>): Promise<KPI> {
    const res = await apiRequest(`/kpis/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return normalizeId(res);
}

export async function updateKPIProgress(id: string, currentValue: number): Promise<KPI> {
    const res = await apiRequest(`/kpis/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ currentValue })
    });
    return normalizeId(res);
}

export async function deleteKPI(id: string): Promise<void> {
    return apiRequest(`/kpis/${id}`, { method: 'DELETE' });
}

