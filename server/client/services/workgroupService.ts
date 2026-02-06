import { apiRequest } from './apiClient';

export interface Workgroup {
    _id?: string;
    id?: string;
    name: string;
    description?: string;
    leaderId: any;
    members: any[];
}

export const workgroupService = {
    getWorkgroups: async () => {
        return await apiRequest('/workgroups', { method: 'GET' });
    },

    createWorkgroup: async (data: any) => {
        return await apiRequest('/workgroups', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updateWorkgroup: async (id: string, data: any) => {
        return await apiRequest(`/workgroups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteWorkgroup: async (id: string) => {
        return await apiRequest(`/workgroups/${id}`, {
            method: 'DELETE'
        });
    }
};
