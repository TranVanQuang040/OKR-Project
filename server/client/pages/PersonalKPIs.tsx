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
    const [personalOkrs, setPersonalOkrs] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        assignedTo: '',
        linkedOKRId: '',
        linkedKRId: '',
        linkedTaskId: '',
        endDate: ''
    });

    const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        loadKPIs();
        loadOKRs();
        loadTasks();
        if (isManager) loadUsers();
    }, [selectedPeriod, user]);

    useEffect(() => {
        if (form.assignedTo && isManager) {
            loadPersonalOKRs(form.assignedTo);
        } else {
            setPersonalOkrs([]);
        }
    }, [form.assignedTo]);

    const loadPersonalOKRs = async (userId: string) => {
        try {
            const data = await getMyOKRsByUser(userId, { quarter: selectedPeriod.quarter, year: selectedPeriod.year });
            setPersonalOkrs(data || []);
        } catch (err) {
            console.error('Failed to load personal OKRs', err);
        }
    };

    const loadKPIs = async () => {
        if (!user?.id) return;

        setIsLoading(true);
        try {
            let data;
            if (isManager) {
                // Managers see all personal KPIs they assigned (assigned by them)
                // Load all PERSONAL KPIs without department filter since they can assign to different departments
                data = await getKPIs({
                    type: 'PERSONAL',
                    quarter: selectedPeriod.quarter,
                    year: selectedPeriod.year
                });
            } else {
                // Employees see only their own KPIs
                data = await getKPIs({
                    type: 'PERSONAL',
                    userId: user.id,
                    quarter: selectedPeriod.quarter,
                    year: selectedPeriod.year
                });
            }
            setKpis(data || []);
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
                // Admin thấy tất cả nhân viên và manager
                setUsers(data.filter((u: User) => u.id !== user.id));
            } else if (user?.role === 'MANAGER') {
                // Manager lọc theo phòng ban của họ
                const filtered = data.filter((u: User) => u.department === user?.department && u.id !== user.id);
                setUsers(filtered);
            }
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title) {
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
            const payload: any = {
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

            // Sanitize IDs for backend
            if (!payload.linkedOKRId) payload.linkedOKRId = null;
            if (!payload.linkedKRId) payload.linkedKRId = null;
            if (!payload.linkedTaskId) payload.linkedTaskId = null;

            if (payload.linkedOKRId) {
                const combinedOkrs = [...personalOkrs, ...okrs];
                const okr = combinedOkrs.find(o => (o.id || o._id) === payload.linkedOKRId);
                if (okr) {
                    payload.linkedOKRTitle = okr.title;
                    if (payload.linkedKRId) {
                        const kr = okr.keyResults?.find((k: any) => (k.id || k._id) === payload.linkedKRId);
                        if (kr) payload.linkedKRTitle = kr.title;
                    }
                }
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

    const handleUpdateProgress = async (id: string, progress: number) => {
        try {
            const updated = await updateKPIProgress(id, progress);
            setKpis(prev => prev.map(k => k.id === updated.id ? updated : k));
            setStatusMessage('Cập nhật tiến độ thành công');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err: any) {
            console.error('Update Progress Error:', err);
            alert(err?.message || 'Không thể cập nhật tiến độ');
        }
    };

    const handleMarkAsCompleted = async (kpi: KPI) => {
        if (!confirm(`Xác nhận hoàn thành KPI: ${kpi.title}?`)) return;
        handleUpdateProgress(kpi.id, 100);
    };

    const openEditModal = (kpi: KPI) => {
        setEditingKPI(kpi);
        setForm({
            title: kpi.title,
            description: kpi.description || '',
            assignedTo: kpi.assignedTo || '',
            linkedOKRId: kpi.linkedOKRId || '',
            linkedKRId: kpi.linkedKRId || '',
            linkedTaskId: kpi.linkedTaskId || '',
            endDate: kpi.endDate ? new Date(kpi.endDate).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    const handleTaskChange = async (taskId: string) => {
        if (!taskId) {
            setForm({ ...form, linkedTaskId: '' });
            return;
        }
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            let currentPersonalOkrs = personalOkrs;
            // If task belongs to a different user, load their OKRs first
            if (task.assigneeId && task.assigneeId !== form.assignedTo) {
                try {
                    const data = await getMyOKRsByUser(task.assigneeId, { quarter: selectedPeriod.quarter, year: selectedPeriod.year });
                    currentPersonalOkrs = data || [];
                    setPersonalOkrs(currentPersonalOkrs);
                } catch (err) {
                    console.error('Failed to load OKRs for task assignee', err);
                }
            }

            let parentId = '';
            if (task.krId) {
                const combined = currentPersonalOkrs; // Only search in personal OKRs
                for (const o of combined) {
                    if (o.keyResults?.some((kr: any) => (kr.id || kr._id) === task.krId)) {
                        parentId = (o.id || o._id) as string;
                        break;
                    }
                }
            }

            setForm({
                ...form,
                linkedTaskId: taskId,
                title: task.title,
                description: task.description || '',
                assignedTo: task.assigneeId || form.assignedTo,
                linkedKRId: task.krId || '',
                linkedOKRId: parentId
            });
        }
    };

    const handleKRChange = (krId: string) => {
        // Function no longer needed as UI removed, but keeping logic if called from elsewhere
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKPI(null);
        setForm({ title: '', description: '', assignedTo: '', linkedOKRId: '', linkedKRId: '', linkedTaskId: '', endDate: '' });
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
                                                    <p className="text-xs text-indigo-600 mt-1">
                                                        🎯 {kpi.linkedOKRTitle} {kpi.linkedKRTitle ? `> ${kpi.linkedKRTitle}` : ''}
                                                    </p>
                                                )}
                                                {kpi.linkedTaskId && (
                                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center">
                                                        <span className="material-icons text-[12px] mr-1">task</span>
                                                        Công việc liên kết
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
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${getStatusColor(kpi.status)}`}>
                                                {kpi.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => {
                                                        const newVal = prompt('Nhập tiến độ mới (%)', kpi.progress.toString());
                                                        if (newVal !== null) {
                                                            const progress = parseInt(newVal);
                                                            if (!isNaN(progress)) handleUpdateProgress(kpi.id, progress);
                                                        }
                                                    }}
                                                    className="text-indigo-600 text-sm font-bold hover:underline"
                                                >
                                                    Cập nhật
                                                </button>
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
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-lg h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto"
                    >
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {editingKPI ? 'Chỉnh sửa KPI' : 'Gán KPI Mới'}
                                    </h3>
                                    <p className="text-sm text-slate-400 font-medium">Thiết lập chỉ số quan trọng cho nhân sự</p>
                                </div>
                                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                    <span className="material-icons">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 pb-20">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nhân sự thực hiện</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                                        value={form.assignedTo}
                                        onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                        disabled={!!editingKPI}
                                    >
                                        <option value="">-- Chọn nhân viên --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} • {u.department}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 shadow-sm space-y-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="material-icons text-indigo-500 text-sm">auto_awesome</span>
                                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest">Tiện ích gán nhanh</label>
                                    </div>
                                    <select
                                        className="w-full p-3 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 shadow-sm"
                                        value={form.linkedTaskId}
                                        onChange={e => handleTaskChange(e.target.value)}
                                    >
                                        <option value="">-- Lấy thông tin từ công việc --</option>
                                        {tasks.filter(t => form.assignedTo ? t.assigneeId === form.assignedTo : true).map(task => (
                                            <option key={task.id} value={task.id}>
                                                {task.title}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-indigo-400 font-bold">* Tự động điền thông tin Objective và KR liên kết từ công việc.</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Chỉ số KPI (Tiêu đề)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: Tăng trưởng doanh thu cá nhân..."
                                        className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Mô tả mục tiêu</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Chi tiết về cách thức đo lường và kỳ vọng..."
                                        className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Trọng số ưu tiên (1-10)</label>
                                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-black">{(form as any).weight || 1}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                        value={(form as any).weight || 1}
                                        onChange={e => setForm({ ...form, weight: parseInt(e.target.value) || 1 } as any)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Hạn hoàn thành</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-700"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                    />
                                </div>

                                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex space-x-4 max-w-lg ml-auto">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all"
                                    >
                                        {editingKPI ? 'Cập nhật thay đổi' : 'Giao KPI ngay'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
