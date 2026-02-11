import { apiRequest } from './apiClient';

const apiClient = {
    get: (path: string) => apiRequest(path, { method: 'GET' }),
    post: (path: string, data?: any) => apiRequest(path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
    }),
    patch: (path: string, data?: any) => apiRequest(path, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined
    }),
    delete: (path: string) => apiRequest(path, { method: 'DELETE' })
};

export const cycleService = {
    // Get all cycles
    async getCycles() {
        const response = await apiClient.get('/cycles');
        return response;
    },

    // Get current active cycle
    async getCurrentCycle() {
        const response = await apiClient.get('/cycles/current');
        return response;
    },

    // Create new cycle
    async createCycle(data: {
        name: string;
        quarter: string;
        year: number;
        startDate: string;
        endDate: string;
    }) {
        const response = await apiClient.post('/cycles', data);
        return response;
    },

    // Activate cycle
    async activateCycle(id: string) {
        const response = await apiClient.patch(`/cycles/${id}/activate`);
        return response;
    },

    // Delete cycle
    async deleteCycle(id: string) {
        const response = await apiClient.delete(`/cycles/${id}`);
        return response;
    }
};

export const automationService = {
    // Get templates
    async getTemplates(filters?: { type?: string; industry?: string; category?: string }) {
        const params = new URLSearchParams(filters as any);
        const response = await apiClient.get(`/automation/templates?${params}`);
        return response;
    },

    // Create template (Admin only)
    async createTemplate(data: any) {
        const response = await apiClient.post('/automation/templates', data);
        return response;
    },

    // Generate Company OKRs
    async generateCompanyOKRs(data: {
        quarter: string;
        year: number;
        templateIds: string[];
    }) {
        const response = await apiClient.post('/automation/generate', data);
        return response;
    },

    // Cascade to Departments
    async cascadeToDepartments(companyOkrId: string) {
        const response = await apiClient.post(`/automation/cascade/departments/${companyOkrId}`);
        return response;
    },

    // Cascade to Teams
    async cascadeToTeams(deptOkrId: string) {
        const response = await apiClient.post(`/automation/cascade/teams/${deptOkrId}`);
        return response;
    },

    // Full workflow
    async runWorkflow(data: {
        quarter: string;
        year: number;
        templateIds: string[];
        cascadeToDept?: boolean;
        cascadeToTeam?: boolean;
        overrides?: Record<string, any>;
    }) {
        const response = await apiClient.post('/automation/workflow', data);
        return response;
    },

    // Preview templates
    async previewTemplates(templateIds: string[]) {
        const response = await apiClient.post('/automation/preview', { templateIds });
        return response;
    },

    // Cleanup all data
    async cleanupData() {
        const response = await apiClient.post('/automation/cleanup');
        return response;
    }
};
