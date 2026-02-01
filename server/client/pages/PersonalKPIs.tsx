
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
    const [showModal, setShowModal] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

    const [form, setForm] = useState({
        title: '',
        description: '',
        assignedTo: '',
        linkedTaskId: '',
        endDate: '',
        weight: 1
    });

    const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        loadKPIs();
        loadOKRs();
        loadTasks();
        if (isManager) loadUsers();
    }, [selectedPeriod, user]);

    const loadKPIs = async () => {
        if (!user?.id) return;

        setIsLoading(true);
        try {
            let data;
            if (isManager) {
                data = await getKPIs({
                    type: 'PERSONAL',
                    quarter: selectedPeriod.quarter,
                    year: selectedPeriod.year
                });
            } else {
                data = await getKPIs({
                    type: 'PERSONAL',
                    userId: user.id,
                    quarter: selectedPeriod.quarter,
                    year: selectedPeriod.year
                });
            }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || form.targetValue <= 0 || !form.unit) {
            return alert('Vui lòng điền đủ thông tin');
        }

        if (!isManager) {
            return alert('Chỉ Manager mới có thể tạo KPI cá nhân');
        }

        if (!form.assignedTo) {
            return alert('Vui lòng chọn nhân viên');
        }

        try {
            const assignedUser = users.find(u => u.id === form.assignedTo);
            const payload: Partial<KPI> = {
                ...form,
                type: 'PERSONAL',
                department: assignedUser?.department || '',
                assignedToName: assignedUser?.name,
                assignedToDepartment: assignedUser?.department || '',
                quarter: selectedPeriod.quarter,
                year: selectedPeriod.year,
                currentValue: editingKPI?.currentValue || 0,
                progress: editingKPI?.progress || 0,
                status: 'ACTIVE'
            };

            if (form.linkedOKRId) {
                const okr = okrs.find(o => o.id === form.linkedOKRId);
                if (okr) payload.linkedOKRTitle = okr.title;
            }

            if (editingKPI) {
                const updated = await updateKPI(editingKPI.id, payload);
                setKpis(prev => prev.map(k => k.id === updated.id ? updated : k));
                setStatusMessage('Cập nhật KPI thành công');
            } else {
                const created = await createKPI(payload);
                setKpis(prev => [created, ...prev]);
                setStatusMessage('Tạo KPI thành công');
            }

            setTimeout(() => setStatusMessage(''), 3000);
            closeModal();
        } catch (err: any) {
            console.error('KPI Submission Error:', err);
            const msg = err?.body?.message || err?.message || 'Không thể lưu KPI';
            alert(`${msg} (Lỗi: ${err?.status || 'Unknown'})`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa KPI này?')) return;
        setDeletingId(id);
        try {
            await deleteKPI(id);
            setKpis(prev => prev.filter(k => k.id !== id));
            setStatusMessage('Xóa KPI thành công');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err: any) {
            alert(err?.message || 'Không thể xóa KPI');
        } finally {
            setDeletingId(null);
        }
    };

    const handleMarkAsCompleted = async (kpi: KPI) => {
        if (!confirm(`Xác nhận hoàn thành KPI: ${kpi.title}?`)) return;

        try {
            const updated = await updateKPIProgress(kpi.id, kpi.targetValue);
            setKpis(prev => prev.map(k => k.id === updated.id ? updated : k));
            setStatusMessage('Đã đánh dấu hoàn thành KPI');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err: any) {
            console.error('Mark As Completed Error:', err);
            const msg = err?.body?.message || err?.message || 'Không thể cập nhật';
            alert(`${msg} (Mã: ${err?.status || '500'})`);
        }
    };

    const openEditModal = (kpi: KPI) => {
        setEditingKPI(kpi);
        setForm({
            title: kpi.title,
            description: kpi.description || '',
            targetValue: kpi.targetValue,
            unit: kpi.unit,
            assignedTo: kpi.assignedTo || '',
            linkedTaskId: kpi.linkedTaskId || '',
            endDate: kpi.endDate ? new Date(kpi.endDate).toISOString().split('T')[0] : '',
            weight: (kpi as any).weight || 1
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKPI(null);
        setForm({ title: '', description: '', targetValue: 0, unit: '%', assignedTo: '', linkedTaskId: '', endDate: '', weight: 1 });
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

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">KPI Cá nhân</h2>
                    <p className="text-slate-500 text-sm">
                        {isManager ? 'Quản lý KPI cá nhân của nhân viên' : 'Theo dõi KPI cá nhân của bạn'}
                    </p>
                </div>
                {isManager && (
                    <button
                        onClick={() => { closeModal(); setShowModal(true); }}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-all flex items-center space-x-2"
                    >
                        <span className="material-icons text-lg">add</span>
                        <span>Gán KPI</span>
                    </button>
                )}
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
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Nhân viên</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">KPI</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Mục tiêu</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Tiến độ</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Trạng thái</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {kpis.map(kpi => (
                                    <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${kpi.assignedToName}`}
                                                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                                    alt="avatar"
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{kpi.assignedToName}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {kpi.assignedToDepartment || kpi.department}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{kpi.title}</p>
                                                {kpi.linkedOKRTitle && (
                                                    <p className="text-xs text-indigo-600 mt-1">🎯 {kpi.linkedOKRTitle}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{kpi.currentValue} / {kpi.targetValue}</p>
                                                <p className="text-xs text-slate-500">{kpi.unit}</p>
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
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${getStatusColor(kpi.status)}`}>
                                                {kpi.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleMarkAsCompleted(kpi)}
                                                    className="text-emerald-600 text-sm font-bold hover:underline"
                                                    title="Đánh dấu hoàn thành"
                                                >
                                                    Hoàn thành
                                                </button>
                                                {isManager && (
                                                    <>
                                                        <button onClick={() => openEditModal(kpi)} className="text-slate-600 text-sm font-bold hover:underline">Sửa</button>
                                                        <button
                                                            onClick={() => handleDelete(kpi.id)}
                                                            disabled={deletingId === kpi.id}
                                                            className="text-rose-600 text-sm font-bold hover:underline"
                                                        >
                                                            {deletingId === kpi.id ? '...' : 'Xóa'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {showModal && isManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold">{editingKPI ? 'Chỉnh sửa KPI' : 'Gán KPI cá nhân'}</h3>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhân viên</label>
                            <select
                                required
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.assignedTo}
                                onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                disabled={!!editingKPI}
                            >
                                <option value="">-- Chọn nhân viên --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên KPI</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả (tùy chọn)</label>
                            <textarea
                                rows={2}
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giá trị mục tiêu</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={form.targetValue || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm({ ...form, targetValue: val === '' ? 0 : Number(val) });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn vị</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={form.unit}
                                    onChange={e => setForm({ ...form, unit: e.target.value })}
                                />
                            </div>
                        </div>



                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hạn hoàn thành</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.endDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-bold text-sm">Hủy</button>
                            <button type="submit" className="px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-100 bg-indigo-600 text-white">
                                {editingKPI ? 'Lưu thay đổi' : 'Gán KPI'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
