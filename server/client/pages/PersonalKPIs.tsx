
import React, { useEffect, useState } from 'react';
import { getKPIs, createKPI, updateKPI, deleteKPI, updateKPIProgress } from '../services/kpiService';
import { getOKRs, getMyOKRsByUser } from '../services/okrService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { KPI, Objective, User, Task } from '../types';

import { dataService } from '../services/dataService';

export const PersonalKPIs: React.FC = () => {
    const { user, selectedPeriod } = useAuth();
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [okrs, setOkrs] = useState<Objective[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [workgroups, setWorkgroups] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'ALL' | 'PERSONAL' | 'DEPARTMENT' | 'TEAM'>('ALL');
    const [filterPriority, setFilterPriority] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

    const [form, setForm] = useState({
        endDate: '',
        weight: 1
    });

    const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        loadKPIs();
        loadOKRs();
        loadTasks();
        loadWorkgroups();
    }, [selectedPeriod, user, filterType]);

    const loadKPIs = async () => {
        if (!user?.id) return;

        setIsLoading(true);
        try {
            const params: any = {
                quarter: selectedPeriod.quarter,
                year: selectedPeriod.year
            };
            if (filterType !== 'ALL') params.type = filterType;
            if (!isManager) {
                params.userId = user.id;
                // If not manager, maybe also show department KPIs? 
                // The user said: "mục KPI cá nhân giờ đây sẽ thành danh sách show ra những KPI hiện có của cả phòng ban cá nhân và nhóm"
            }

            const data = await getKPIs(params);
            const sorted = (data || []).sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA || String(b.id).localeCompare(String(a.id));
            });
            setKpis(sorted);
        } catch (err) {
            console.error('Failed to load KPIs', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadOKRs = async () => {
        try {
            const data = await getOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year });
            setOkrs(data || []);
        } catch (err) {
            console.error('Failed to load OKRs', err);
        }
    };

    const loadTasks = async () => {
        try {
            const data = await dataService.getTasks();
            setTasks(data || []);
        } catch (err) {
            console.error('Failed to load tasks', err);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await userService.getUsers();
            if (user?.role === 'ADMIN') {
                setUsers(data.filter((u: User) => u.id !== user.id));
            } else if (user?.role === 'MANAGER') {
                const filtered = data.filter((u: User) => u.department === user?.department && u.id !== user.id);
                setUsers(filtered);
            }
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    const loadWorkgroups = async () => {
        try {
            const { workgroupService } = await import('../services/workgroupService');
            const data = await workgroupService.getWorkgroups();
            setWorkgroups(data || []);
        } catch (err) {
            console.error('Failed to load workgroups', err);
        }
    };

    // Creation logic removed as per user request (moved to DepartmentKPIs.tsx)

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa KPI này?')) return;
        setDeletingId(id);
        try {
            await deleteKPI(id);
            setKpis(prev => prev.filter(k => k.id !== id));
            setStatusMessage('Xóa KPI thành công');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err: any) {
            alert('Lỗi khi xóa KPI');
        } finally {
            setDeletingId(null);
        }
    };

    const handleUpdateProgress = async (id: string, progress: number) => {
        try {
            const updated = await updateKPIProgress(id, progress);
            setKpis(prev => prev.map(k => k.id === updated.id ? updated : k));
            setStatusMessage('Cập nhật tiến độ thành công');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err: any) {
            alert('Không thể cập nhật tiến độ');
        }
    };

    const handleMarkAsCompleted = async (kpi: KPI) => {
        if (!confirm(`Xác nhận hoàn thành KPI: ${kpi.title}?`)) return;
        handleUpdateProgress(kpi.id, 100);
    };

    const openEditModal = (kpi: KPI) => {
        // Full editing removed, use DepartmentKPIs for full management
    };

    const handleTaskChange = async (taskId: string) => {
        if (!taskId) {
            setForm({ ...form, linkedTaskId: '' });
            return;
        }
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setForm({
                ...form,
                linkedTaskId: taskId,
                title: task.title,
                description: task.description || '',
                assignedTo: task.assigneeId || form.assignedTo
            });
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKPI(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'OVERDUE': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-blue-50 text-blue-600 border-blue-100';
        }
    };

    const getProgressColor = (progress: number) => {
        if (progress >= 100) return 'bg-emerald-500';
        if (progress >= 70) return 'bg-blue-500';
        if (progress >= 40) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    const getTimeRemaining = (endDate: string) => {
        if (!endDate) return null;
        const now = new Date();
        const end = new Date(endDate);
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, color: 'text-rose-600 font-bold' };
        if (days === 0) return { text: 'Hết hạn hôm nay', color: 'text-amber-600 font-bold' };
        return { text: `Còn ${days} ngày`, color: 'text-indigo-600 font-medium' };
    };

    const getPriorityLabel = (weight: number) => {
        if (weight >= 7) return { label: 'Cao (High)', color: 'bg-rose-100 text-rose-600' };
        if (weight >= 4) return { label: 'Trung bình (Medium)', color: 'bg-amber-100 text-amber-600' };
        return { label: 'Thấp (Low)', color: 'bg-slate-100 text-slate-600' };
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Danh sách KPI</h2>
                    <p className="text-slate-500 text-sm">
                        Theo dõi và quản lý các chỉ số hiệu suất cá nhân, phòng ban và nhóm.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">Loại: Tất cả</option>
                        <option value="PERSONAL"> KPI Cá nhân</option>
                        <option value="DEPARTMENT"> KPI Phòng ban</option>
                        <option value="TEAM"> KPI Nhóm</option>
                    </select>
                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">Mức độ: Tất cả</option>
                        <option value="HIGH">Ưu tiên: Cao</option>
                        <option value="MEDIUM">Ưu tiên: Trung bình</option>
                        <option value="LOW">Ưu tiên: Thấp</option>
                    </select>

                </div>
            </div>

            {statusMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md">{statusMessage}</div>
            )}

            {isLoading ? (
                <div className="p-6 text-center">Đang tải KPI…</div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {kpis.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            {isManager
                                ? `Chưa có KPI cá nhân nào trong kỳ ${selectedPeriod.quarter}/${selectedPeriod.year}`
                                : 'Bạn chưa được gán KPI nào'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Phụ trách / Loại</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">KPI</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Tiến độ</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Thời hạn</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Trạng thái</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {kpis
                                    .filter(k => {
                                        if (filterType !== 'ALL' && k.type !== filterType) return false;
                                        if (filterPriority === 'ALL') return true;
                                        const weight = k.weight || 1;
                                        if (filterPriority === 'HIGH') return weight >= 7;
                                        if (filterPriority === 'MEDIUM') return weight >= 4 && weight < 7;
                                        if (filterPriority === 'LOW') return weight < 4;
                                        return true;
                                    })
                                    .map(kpi => {
                                        const timeRem = getTimeRemaining(kpi.endDate);
                                        const prio = getPriorityLabel(kpi.weight || 1);
                                        return (
                                            <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        {kpi.type === 'PERSONAL' ? (
                                                            <img
                                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${kpi.assignedToName}`}
                                                                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                                                alt="avatar"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                                <span className="material-icons">{kpi.type === 'DEPARTMENT' ? 'business' : 'groups'}</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">
                                                                {kpi.type === 'PERSONAL' ? kpi.assignedToName : (kpi.type === 'DEPARTMENT' ? `Phòng ${kpi.department}` : `Nhóm ${workgroups.find(w => w.id === kpi.workgroupId || w._id === kpi.workgroupId)?.name || 'Team'}`)}
                                                            </p>
                                                            <p className="text-[10px] font-black text-indigo-500 uppercase mt-0.5 px-1.5 py-0.5 bg-indigo-50 rounded-md inline-block">
                                                                Loại: {kpi.type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${prio.color}`}>
                                                                {prio.label}
                                                            </span>
                                                            <p className="text-sm font-bold text-slate-800">{kpi.title}</p>
                                                        </div>
                                                        {kpi.linkedOKRTitle && (
                                                            <p className="text-[10px] text-indigo-600 mt-1 font-medium bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100/50 inline-block">
                                                                🎯 {kpi.linkedOKRTitle} {kpi.linkedKRTitle ? `> ${kpi.linkedKRTitle}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-indigo-600">{kpi.progress}%</span>
                                                        </div>
                                                        <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full ${getProgressColor(kpi.progress)}`} style={{ width: `${kpi.progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {kpi.endDate ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-600">{new Date(kpi.endDate).toLocaleDateString('vi-VN')}</span>
                                                            {timeRem && <span className={`text-[10px] ${timeRem.color}`}>{timeRem.text}</span>}
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400">—</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${getStatusColor(kpi.status)}`}>
                                                        {kpi.status === 'ACTIVE' ? 'Đang thực hiện' : kpi.status === 'COMPLETED' ? 'Hoàn thành' : kpi.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleMarkAsCompleted(kpi)}
                                                            className="p-1 px-4 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all uppercase border border-emerald-200"
                                                            title="Đánh dấu hoàn thành"
                                                        >
                                                            Hoàn thành
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}


        </div>
    );
};
