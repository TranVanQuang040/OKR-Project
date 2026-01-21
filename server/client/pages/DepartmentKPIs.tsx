import React, { useEffect, useState } from 'react';
import { getKPIs, createKPI, updateKPI, deleteKPI, updateKPIProgress } from '../services/kpiService';
import { getOKRs, getMyOKRs } from '../services/okrService';
import { useAuth } from '../context/AuthContext';
import { KPI, Objective } from '../types';

export const DepartmentKPIs: React.FC = () => {
    const { user, selectedPeriod } = useAuth();
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [okrs, setOkrs] = useState<Objective[]>([]);
    const [personalOkrs, setPersonalOkrs] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState(user?.department || '');
    const [form, setForm] = useState({
        title: '',
        description: '',
        department: user?.department || '',
        linkedOKRId: '',
        linkedKRId: '',
        endDate: ''
    });

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchDepts();
        }
    }, []);

    useEffect(() => {
        loadKPIs();
        loadOKRs();
        loadPersonalOKRs();
    }, [selectedPeriod, user, selectedDept]);

    const loadPersonalOKRs = async () => {
        try {
            const data = await getMyOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year });
            setPersonalOkrs(data || []);
        } catch (err) {
            console.error('Failed to load personal OKRs', err);
        }
    };

    const fetchDepts = async () => {
        const { getDepartments } = await import('../services/departmentService');
        const data = await getDepartments();
        setDepartments(data);
        if (!selectedDept && data.length > 0) setSelectedDept(data[0].name);
    };

    const loadKPIs = async () => {
        const deptToFetch = user?.role === 'ADMIN' ? selectedDept : user?.department;
        if (!deptToFetch) return;

        setIsLoading(true);
        try {
            const data = await getKPIs({
                type: 'DEPARTMENT',
                department: deptToFetch,
                quarter: selectedPeriod.quarter,
                year: selectedPeriod.year
            });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title) {
            return alert('Vui lòng điền đủ thông tin');
        }

        try {
            const payload: Partial<KPI> = {
                ...form,
                type: 'DEPARTMENT',
                department: (user?.role === 'ADMIN' ? form.department : user?.department) || '',
                quarter: selectedPeriod.quarter,
                year: selectedPeriod.year,
                currentValue: editingKPI?.currentValue || 0,
                progress: editingKPI?.progress || 0,
                status: 'ACTIVE'
            };

            if (form.linkedOKRId) {
                const combinedOkrs = [...okrs, ...personalOkrs];
                const okr = combinedOkrs.find(o => (o.id || o._id) === form.linkedOKRId);
                if (okr) {
                    payload.linkedOKRTitle = okr.title;
                    if (form.linkedKRId) {
                        const kr = okr.keyResults?.find((k: any) => (k.id || k._id) === form.linkedKRId);
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
        if (!confirm(`Xác nhận hoàn thành KPI phòng ban: ${kpi.title}?`)) return;
        handleUpdateProgress(kpi.id, 100);
    };

    const handleKRChange = (krId: string) => {
        if (!krId) {
            setForm({ ...form, linkedKRId: '', linkedOKRId: '' });
            return;
        }
        const combined = okrs; // For Department KPIs, only use Department OKRs
        let parentId = '';
        for (const o of combined) {
            if (o.keyResults?.some((kr: any) => (kr.id || kr._id) === krId)) {
                parentId = (o.id || o._id) as string;
                break;
            }
        }
        setForm({ ...form, linkedKRId: krId, linkedOKRId: parentId });
    };

    const openEditModal = (kpi: KPI) => {
        setEditingKPI(kpi);
        setForm({
            title: kpi.title,
            description: kpi.description || '',
            linkedOKRId: kpi.linkedOKRId || '',
            linkedKRId: kpi.linkedKRId || '',
            endDate: kpi.endDate ? new Date(kpi.endDate).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKPI(null);
        setForm({ title: '', description: '', department: selectedDept || user?.department || '', linkedOKRId: '', linkedKRId: '', endDate: '' });
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
                <div className="flex items-center space-x-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">KPI Phòng ban</h2>
                        <p className="text-slate-500 text-sm">
                            {user?.role === 'ADMIN' ? 'Quản lý KPI của tất cả phòng ban' : `Quản lý các chỉ số hiệu suất của phòng ban ${user?.department}`}
                        </p>
                    </div>
                    {user?.role === 'ADMIN' && (
                        <select
                            className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">-- Chọn phòng ban --</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    )}
                </div>
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <button
                        onClick={() => { closeModal(); setShowModal(true); setForm(f => ({ ...f, department: selectedDept || user?.department || '' })); }}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-all flex items-center space-x-2"
                    >
                        <span className="material-icons text-lg">add</span>
                        <span>Thêm KPI</span>
                    </button>
                )}
            </div>

            {statusMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md">{statusMessage}</div>
            )}

            {isLoading ? (
                <div className="p-6 text-center">Đang tải KPI…</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kpis.length === 0 && (
                        <div className="col-span-full p-12 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
                            Chưa có KPI nào trong kỳ {selectedPeriod.quarter}/{selectedPeriod.year}
                        </div>
                    )}

                    {kpis.map(kpi => (
                        <div key={kpi.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">{kpi.title}</h3>
                                        {kpi.description && (
                                            <p className="text-xs text-slate-500">{kpi.description}</p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${getStatusColor(kpi.status)}`}>
                                        {kpi.status}
                                    </span>
                                </div>

                                {kpi.linkedOKRTitle && (
                                    <div className="mb-4 p-2 bg-indigo-50 rounded-lg">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Liên kết OKR</p>
                                        <p className="text-xs text-indigo-700 font-medium truncate">
                                            {kpi.linkedOKRTitle} {kpi.linkedKRTitle ? `> ${kpi.linkedKRTitle}` : ''}
                                        </p>
                                    </div>
                                )}



                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiến độ</p>
                                        <span className="text-sm font-bold text-indigo-600">{kpi.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${getProgressColor(kpi.progress)}`} style={{ width: `${kpi.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
                                <div className="flex items-center space-x-3">
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
                                </div>
                                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(kpi)} className="text-slate-600 text-sm font-bold hover:underline">Sửa</button>
                                        <button
                                            onClick={() => handleDelete(kpi.id)}
                                            disabled={deletingId === kpi.id}
                                            className="text-rose-600 text-sm font-bold hover:underline"
                                        >
                                            {deletingId === kpi.id ? 'Đang xóa…' : 'Xóa'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold">{editingKPI ? 'Chỉnh sửa KPI' : 'Tạo KPI mới'}</h3>

                        {user?.role === 'ADMIN' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phòng ban</label>
                                <select
                                    required
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={form.department}
                                    onChange={e => setForm({ ...form, department: e.target.value })}
                                >
                                    <option value="">-- Chọn phòng ban --</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

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

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trọng số (Thang điểm 1-10)</label>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    value={(form as any).weight || 1}
                                    onChange={e => setForm({ ...form, weight: parseInt(e.target.value) || 1 } as any)}
                                />
                                <span className="text-sm font-bold text-indigo-600 w-8">{(form as any).weight || 1}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">* 1: Thấp nhất, 10: Quan trọng nhất. KPI trọng số cao ảnh hưởng nhiều đến điểm hiệu suất.</p>
                        </div>



                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mục tiêu OKR liên kết (tùy chọn)</label>
                            <select
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.linkedKRId}
                                onChange={e => handleKRChange(e.target.value)}
                            >
                                <option value="">-- Mục tiêu OKR --</option>
                                <optgroup label="--- OKRs PHÒNG BAN ---">
                                    {okrs.filter(o => o.department === (selectedDept || user?.department)).map(o => o.keyResults?.map(kr => (
                                        <option key={kr.id || kr._id} value={kr.id || kr._id}>{o.title}: {kr.title}</option>
                                    )))}
                                </optgroup>
                            </select>
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
                                {editingKPI ? 'Lưu thay đổi' : 'Tạo KPI'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
