import React, { useEffect, useState } from 'react';
import { getKPIs, createKPI, updateKPI, deleteKPI, updateKPIProgress } from '../services/kpiService';
import { getOKRs } from '../services/okrService';
import { useAuth } from '../context/AuthContext';
import { KPI, Objective } from '../types';

export const DepartmentKPIs: React.FC = () => {
    const { user, selectedPeriod } = useAuth();
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [okrs, setOkrs] = useState<Objective[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        targetValue: 0,
        unit: '',
        linkedOKRId: '',
        endDate: ''
    });

    useEffect(() => {
        loadKPIs();
        loadOKRs();
    }, [selectedPeriod, user]);

    const loadKPIs = async () => {
        if (!user?.department) return;
        
        setIsLoading(true);
        try {
            const data = await getKPIs({
                type: 'DEPARTMENT',
                department: user.department,
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
        if (!form.title || form.targetValue <= 0 || !form.unit) {
            return alert('Vui lòng điền đủ thông tin');
        }

        try {
            const payload: Partial<KPI> = {
                ...form,
                type: 'DEPARTMENT',
                department: user?.department || '',
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
            alert(err?.message || 'Không thể lưu KPI');
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

    const handleUpdateProgress = async (kpi: KPI) => {
        const newValue = prompt(`Cập nhật giá trị hiện tại (${kpi.unit}):`, String(kpi.currentValue));
        if (newValue === null) return;

        const value = Number(newValue);
        if (isNaN(value) || value < 0) {
            return alert('Giá trị không hợp lệ');
        }

        try {
            const updated = await updateKPIProgress(kpi.id, value);
            setKpis(prev => prev.map(k => k.id === updated.id ? updated : k));
            setStatusMessage('Cập nhật tiến độ thành công');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err: any) {
            alert(err?.message || 'Không thể cập nhật tiến độ');
        }
    };

    const openEditModal = (kpi: KPI) => {
        setEditingKPI(kpi);
        setForm({
            title: kpi.title,
            description: kpi.description || '',
            targetValue: kpi.targetValue,
            unit: kpi.unit,
            linkedOKRId: kpi.linkedOKRId || '',
            endDate: kpi.endDate ? new Date(kpi.endDate).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingKPI(null);
        setForm({ title: '', description: '', targetValue: 0, unit: '', linkedOKRId: '', endDate: '' });
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
                    <h2 className="text-2xl font-bold text-slate-800">KPI Phòng ban</h2>
                    <p className="text-slate-500 text-sm">Quản lý các chỉ số hiệu suất của phòng ban {user?.department}</p>
                </div>
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <button
                        onClick={() => { closeModal(); setShowModal(true); }}
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
                                        <p className="text-xs text-indigo-700 font-medium truncate">{kpi.linkedOKRTitle}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-50 p-3 rounded-xl">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hiện tại</p>
                                        <p className="text-lg font-bold text-slate-800">{kpi.currentValue} {kpi.unit}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mục tiêu</p>
                                        <p className="text-lg font-bold text-slate-800">{kpi.targetValue} {kpi.unit}</p>
                                    </div>
                                </div>

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
                                <button
                                    onClick={() => handleUpdateProgress(kpi)}
                                    className="text-indigo-600 text-sm font-bold hover:underline"
                                >
                                    Cập nhật
                                </button>
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

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên KPI</label>
                            <input
                                type="text"
                                required
                                placeholder="Tăng doanh thu"
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
                                    min="0"
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={form.targetValue}
                                    onChange={e => setForm({ ...form, targetValue: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn vị</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="%"
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={form.unit}
                                    onChange={e => setForm({ ...form, unit: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Liên kết OKR (tùy chọn)</label>
                            <select
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={form.linkedOKRId}
                                onChange={e => setForm({ ...form, linkedOKRId: e.target.value })}
                            >
                                <option value="">-- Không liên kết --</option>
                                {okrs.filter(o => o.department === user?.department).map(okr => (
                                    <option key={okr.id} value={okr.id}>{okr.title}</option>
                                ))}
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
