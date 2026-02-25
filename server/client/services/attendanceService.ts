import { apiRequest } from './apiClient';

export interface AttendanceRecord {
    _id?: string;
    userId: string;
    userName: string;
    department: string;
    dateKey: string;
    checkInAt: string;
    checkOutAt?: string;
    status: 'PRESENT' | 'LATE' | 'HALF_DAY';
    lateMinutes: number;
    totalWorkMinutes: number;
    note?: string;
}

export interface AttendanceStatus {
    dateKey: string;
    checkedIn: boolean;
    checkedOut: boolean;
    attendance?: AttendanceRecord;
}

export interface AttendanceSummaryItem {
    userId: string;
    userName: string;
    department: string;
    presentDays: number;
    lateDays: number;
    totalWorkMinutes: number;
}

export interface AttendanceSummaryResponse {
    from: string;
    to: string;
    summary: AttendanceSummaryItem[];
}

export const attendanceService = {
    async getStatus(): Promise<AttendanceStatus> {
        return apiRequest('/attendance/status');
    },

    async checkIn(note?: string): Promise<AttendanceRecord> {
        return apiRequest('/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify({ note })
        });
    },

    async checkOut(note?: string): Promise<AttendanceRecord> {
        return apiRequest('/attendance/check-out', {
            method: 'POST',
            body: JSON.stringify({ note })
        });
    },

    async getMyHistory(from?: string, to?: string): Promise<AttendanceRecord[]> {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/attendance/me${qs}`);
    },

    async getTodayAttendance(dateKey?: string, department?: string): Promise<AttendanceRecord[]> {
        const params = new URLSearchParams();
        if (dateKey) params.append('dateKey', dateKey);
        if (department) params.append('department', department);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/attendance/today${qs}`);
    },

    async getSummary(from: string, to: string, department?: string): Promise<AttendanceSummaryResponse> {
        const params = new URLSearchParams();
        params.append('from', from);
        params.append('to', to);
        if (department) params.append('department', department);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return apiRequest(`/attendance/summary${qs}`);
    }
};
