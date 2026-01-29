
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
    const [filterPriority, setFilterPriority] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState(user?.department || '');
    const [form, setForm] = useState({
        title: '',
        description: '',
        department: user?.department || '',
        linkedOKRId: '',
        linkedKRId: '',
        endDate: '',
        weight: 1
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
        if (user?.role !== 'ADMIN' && !deptToFetch) return;

        setIsLoading(true);
        try {
            const data = await getKPIs({
                type: 'DEPARTMENT',
                department: deptToFetch,
                quarter: selectedPeriod.quarter,
                year: selectedPeriod.year
            });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title) return alert('Vui lòng điền đủ thông tin');

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
            alert('Không thể lưu KPI');
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
            alert('Không thể xóa KPI');
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
        if (!confirm(`Xác nhận hoàn thành KPI phòng ban: ${kpi.title}?`)) return;
        handleUpdateProgress(kpi.id, 100);
    };

    const handleKRChange = (krId: string) => {
        if (!krId) {
            setForm({ ...form, linkedKRId: '', linkedOKRId: '' });
            return;
        }
        const combined = okrs;
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
            department: kpi.department || '',
            linkedOKRId: kpi.linkedOKRId || '',
            linkedKRId: kpi.linkedKRId || '',
            endDate: kpi.endDate ? new Date(kpi.endDate).toISOString().split('T')[0] : '',
            weight: (kpi as any).weight || 1
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKPI(null);
        setForm({ title: '', description: '', department: selectedDept || user?.department || '', linkedOKRId: '', linkedKRId: '', endDate: '', weight: 1 });
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
                <div className="flex items-center space-x-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">KPI Phòng ban</h2>
                        <p className="text-slate-500 text-sm">
                            {user?.role === 'ADMIN' ? 'Quản lý KPI của tất cả phòng ban' : `Quản lý các chỉ số hiệu suất của phòng ban ${user?.department}`}
                        </p>
                    </div>
                    {user?.role === 'ADMIN' && (
                        <select
                            className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-bold"
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">-- Tất cả phòng ban --</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    )}
                </div>
                <div className="flex items-center space-x-3">
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

                    {kpis
                        .filter(k => {
                            if (filterPriority === 'ALL') return true;
                            const weight = (k as any).weight || 1;
                            if (filterPriority === 'HIGH') return weight >= 7;
                            if (filterPriority === 'MEDIUM') return weight >= 4 && weight < 7;
                            if (filterPriority === 'LOW') return weight < 4;
                            return true;
                        })
                        .map(kpi => {
                            const prio = getPriorityLabel((kpi as any).weight || 1);
                            const timeRem = getTimeRemaining(kpi.endDate);
                            return (
                                <div key={kpi.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${prio.color}`}>
                                                        {prio.label}
                                                    </span>
                                                    <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-black uppercase">
                                                        Phòng: {kpi.department}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800 mb-1">{kpi.title}</h3>
                                                {kpi.description && (
                                                    <p className="text-xs text-slate-500 mb-2">{kpi.description}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${getStatusColor(kpi.status)}`}>
                                                {kpi.status === 'ACTIVE' ? 'Đang chạy' : kpi.status === 'COMPLETED' ? 'Xong' : kpi.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {kpi.endDate && (
                                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 font-black">Hạn chót</p>
                                                    <p className="text-[10px] font-bold text-slate-700">{new Date(kpi.endDate).toLocaleDateString('vi-VN')}</p>
                                                    <p className={`text-[9px] ${timeRem?.color}`}>
                                                        {timeRem?.text}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 font-black">Phòng ban</p>
                                                <p className="text-[10px] font-bold text-slate-700 truncate">{kpi.department}</p>
                                            </div>
                                        </div>

                                        {kpi.linkedOKRTitle && (
                                            <div className="mb-4 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                                                <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Liên kết OKR</p>
                                                <p className="text-[10px] text-indigo-700 font-bold truncate">
                                                    🎯 {kpi.linkedOKRTitle} {kpi.linkedKRTitle ? `> ${kpi.linkedKRTitle}` : ''}
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
                                            <button onClick={() => openEditModal(kpi)} className="text-indigo-600 text-[10px] font-black hover:underline uppercase">Cập nhật</button>
                                            <button
                                                onClick={() => handleMarkAsCompleted(kpi)}
                                                className="text-emerald-600 text-[10px] font-black hover:underline uppercase"
                                            >
                                                Xong
                                            </button>
                                        </div>
                                        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                            <button
                                                onClick={() => handleDelete(kpi.id)}
                                                disabled={deletingId === kpi.id}
                                                className="text-rose-600 text-[10px] font-black hover:underline uppercase"
                                            >
                                                {deletingId === kpi.id ? '...' : 'Xóa'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingKPI ? 'Chỉnh sửa KPI' : 'Tạo KPI mới'}</h3>
                                <p className="text-sm text-slate-400 font-medium">Thiết lập mục tiêu đo lường cho phòng ban</p>
                            </div>
                            <button type="button" onClick={closeModal} className="text-slate-300 hover:text-slate-500 transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        {user?.role === 'ADMIN' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phòng ban phụ trách</label>
                                <select
                                    required
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
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
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tiêu đề KPI</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Đánh giá mức độ ưu tiên</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { val: 1, label: 'Thấp (Low)', color: 'border-slate-200 text-slate-500' },
                                    { val: 5, label: 'Trung Bình', color: 'border-amber-200 text-amber-600' },
                                    { val: 9, label: 'Cao (High)', color: 'border-rose-200 text-rose-600' }
                                ].map(p => (
                                    <button
                                        key={p.val}
                                        type="button"
                                        onClick={() => setForm({ ...form, weight: p.val })}
                                        className={`p-3 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${((form as any).weight || 1) === p.val
                                            ? p.color.replace('border-', 'bg-').replace('text-', 'text-white border-')
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Liên kết OKR (tùy chọn)</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                value={form.linkedKRId}
                                onChange={e => handleKRChange(e.target.value)}
                            >
                                <option value="">-- Mục tiêu OKR --</option>
                                <optgroup label="--- OKRs PHÒNG BAN ---">
                                    {okrs.filter(o => o.department === (user?.role === 'ADMIN' ? form.department : user?.department) && o.status === 'APPROVED').map(o => (o.keyResults || [])
                                        .filter((kr: any) => !kpis.some(k => k.linkedKRId === (kr.id || kr._id)) || (kr.id || kr._id) === editingKPI?.linkedKRId)
                                        .map((kr: any) => (
                                            <option key={kr.id || kr._id} value={kr.id || kr._id}>{o.title}: {kr.title}</option>
                                        )))}
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Hạn hoàn thành</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                value={form.endDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={closeModal} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Hủy</button>
                            <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                {editingKPI ? 'Lưu thay đổi' : 'Tạo KPI'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
