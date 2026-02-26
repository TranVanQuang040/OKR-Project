
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceService, AttendanceRecord, AttendanceStatus } from '../services/attendanceService';
import { getDepartments } from '../services/departmentService';

// Helper to get dateKey string YYYY-MM-DD
function getDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDateOffset(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return getDateKey(d);
}

export const Attendance: React.FC = () => {
    const { user, allUsers } = useAuth();
    const [status, setStatus] = useState<AttendanceStatus | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [todayTeam, setTodayTeam] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [note, setNote] = useState('');
    const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal');
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState(user?.role === 'ADMIN' ? '' : (user?.department || ''));
    // Date filter state
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '2days' | 'custom'>('today');
    const [customDate, setCustomDate] = useState(getDateKey(new Date()));
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    const getSelectedDateKey = (): string => {
        switch (dateFilter) {
            case 'today': return getDateOffset(0);
            case 'yesterday': return getDateOffset(-1);
            case '2days': return getDateOffset(-2);
            case 'custom': return customDate;
            default: return getDateOffset(0);
        }
    };

    const getDateLabel = (): string => {
        const dk = getSelectedDateKey();
        const [y, m, d] = dk.split('-');
        return `${d}/${m}/${y}`;
    };

    useEffect(() => {
        loadData();
        if (user?.role !== 'EMPLOYEE') {
            loadDepartments();
        }
    }, [user]);

    // Reload team data when date filter or department changes
    useEffect(() => {
        if (user?.role !== 'EMPLOYEE' && !loading) {
            loadTeamData();
        }
    }, [dateFilter, customDate, selectedDept]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statusRes, historyRes] = await Promise.all([
                attendanceService.getStatus(),
                attendanceService.getMyHistory()
            ]);
            setStatus(statusRes);
            setHistory(historyRes);

            if (user?.role !== 'EMPLOYEE') {
                await loadTeamData();
            }
        } catch (err) {
            console.error('Failed to load attendance data', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamData = async () => {
        try {
            const dk = getSelectedDateKey();
            const teamRes = await attendanceService.getTodayAttendance(dk, selectedDept || undefined);
            setTodayTeam(teamRes);
        } catch (err) {
            console.error('Failed to load team attendance', err);
        }
    };

    const loadDepartments = async () => {
        try {
            const depts = await getDepartments();
            setDepartments(depts);
        } catch (err) {
            console.error('Failed to load departments', err);
        }
    };

    const handleCheckIn = async () => {
        setActionLoading(true);
        try {
            await attendanceService.checkIn(note);
            setNote('');
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Check-in failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        setActionLoading(true);
        try {
            await attendanceService.checkOut(note);
            setNote('');
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Check-out failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Find user email from allUsers list
    const findUserEmail = (userId: string): string => {
        const u = allUsers.find((u: any) => (u.id === userId || u._id === userId));
        return u?.email || '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
            </div>
        );
    }

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '--:--';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateKey: string) => {
        const [y, m, d] = dateKey.split('-');
        return `${d}/${m}/${y}`;
    };

    const formatWorkTime = (mins?: number) => {
        if (!mins) return '--';
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const statusLabel = (s: string) => {
        switch (s) {
            case 'PRESENT': return 'Đúng giờ';
            case 'LATE': return 'Đi muộn';
            case 'HALF_DAY': return 'Nửa ngày';
            default: return s;
        }
    };

    return (
        <div className="p-6 space-y-8 animate-fadeIn">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Điểm danh & Chấm công</h2>
                    <p className="text-slate-500 font-medium">Theo dõi thời gian làm việc và chuyên cần hàng ngày.</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Hôm nay</p>
                        <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100"></div>
                    <div className="text-indigo-600 font-black text-xl tabular-nums">
                        {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Check-in Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-50/50 border border-slate-50 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                        <h3 className="text-xl font-black text-slate-800 mb-6 relative z-10 flex items-center">
                            <span className="material-icons mr-2 text-indigo-500">fingerprint</span>
                            Check-in / Out
                        </h3>

                        {!status?.checkedIn ? (
                            <div className="space-y-6 relative z-10">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 text-center py-10">
                                    <span className="material-icons text-5xl text-slate-300 mb-4">work_outline</span>
                                    <p className="text-slate-500 font-bold">Bạn chưa check-in hôm nay</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Hãy bắt đầu ngày làm việc của bạn</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase ml-1 mb-2">Ghi chú (Tùy chọn)</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Sức khỏe hôm nay thế nào? Hoặc lý do đi muộn..."
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleCheckIn}
                                    disabled={actionLoading}
                                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center space-x-2"
                                >
                                    {actionLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-icons">login</span>
                                            <span>CHECK IN NGAY</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : !status?.checkedOut ? (
                            <div className="space-y-6 relative z-10">
                                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase">Đã check-in lúc</p>
                                        <p className="text-2xl font-black text-indigo-900">{formatTime(status.attendance?.checkInAt)}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black ${status.attendance?.status === 'LATE' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {status.attendance?.status}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase ml-1 mb-2">Ghi chú Check-out</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Hôm nay bạn đã hoàn thành những gì?"
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleCheckOut}
                                    disabled={actionLoading}
                                    className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-900 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center space-x-2"
                                >
                                    {actionLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-icons">logout</span>
                                            <span>CHECK OUT & KẾT THÚC</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 relative z-10">
                                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center py-10">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-icons text-3xl text-emerald-600">done_all</span>
                                    </div>
                                    <p className="text-emerald-900 font-black text-lg">Hoàn thành ngày làm việc!</p>
                                    <p className="text-emerald-600/70 text-xs font-bold mt-1">Hẹn gặp lại bạn vào ngày mai.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Vào</p>
                                        <p className="text-lg font-black text-slate-700">{formatTime(status.attendance?.checkInAt)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Ra</p>
                                        <p className="text-lg font-black text-slate-700">{formatTime(status.attendance?.checkOutAt)}</p>
                                    </div>
                                </div>

                                <div className="bg-indigo-600 p-4 rounded-2xl text-white flex justify-between items-center">
                                    <span className="text-xs font-bold opacity-80">Tổng thời gian:</span>
                                    <span className="text-xl font-black">{Math.floor((status.attendance?.totalWorkMinutes || 0) / 60)}h {(status.attendance?.totalWorkMinutes || 0) % 60}m</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white overflow-hidden relative shadow-xl shadow-indigo-100">
                        <span className="material-icons absolute -right-4 -bottom-4 text-9xl opacity-10">auto_awesome</span>
                        <h4 className="text-lg font-black mb-2">Thống kê nhanh</h4>
                        <p className="text-xs text-indigo-100 font-medium mb-6">Bạn đã làm việc chăm chỉ trong tháng này!</p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <span className="text-xs font-bold">Ngày công</span>
                                <span className="font-black">{history.length} / 22</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <span className="text-xs font-bold">Đi muộn</span>
                                <span className="font-black text-amber-300">{history.filter(h => h.status === 'LATE').length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History / Team Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-2 bg-slate-50 flex border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'personal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <span className="material-icons text-lg">person</span>
                                <span>Lịch sử cá nhân</span>
                            </button>
                            {user?.role !== 'EMPLOYEE' && (
                                <button
                                    onClick={() => setActiveTab('team')}
                                    className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <span className="material-icons text-lg">groups</span>
                                    <span>Điểm danh phòng ban</span>
                                </button>
                            )}
                        </div>

                        <div className="p-8 flex-1">
                            {activeTab === 'personal' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2 px-2">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Bản ghi gần nhất</h4>
                                        <span className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">Xem tất cả</span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Ngày</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Vào</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Ra</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Thời gian</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {history.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center text-slate-400 font-bold">Chưa có dữ liệu lịch sử.</td>
                                                    </tr>
                                                ) : (
                                                    history.map((rec) => (
                                                        <tr key={rec._id} className="group hover:bg-slate-50 transition-colors">
                                                            <td className="py-4 font-bold text-slate-700 text-sm">{formatDate(rec.dateKey)}</td>
                                                            <td className="py-4 text-sm font-medium text-slate-500 tabular-nums">{formatTime(rec.checkInAt)}</td>
                                                            <td className="py-4 text-sm font-medium text-slate-500 tabular-nums">{formatTime(rec.checkOutAt)}</td>
                                                            <td className="py-4 text-sm font-bold text-slate-700 tabular-nums">
                                                                {rec.totalWorkMinutes ? `${Math.floor(rec.totalWorkMinutes / 60)}h ${rec.totalWorkMinutes % 60}m` : '--'}
                                                            </td>
                                                            <td className="py-4">
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black 
                                  ${rec.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' :
                                                                        rec.status === 'LATE' ? 'bg-amber-50 text-amber-600' :
                                                                            'bg-indigo-50 text-indigo-600'}`}>
                                                                    {rec.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Header with title */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <span className="material-icons text-base">calendar_today</span>
                                                Điểm danh ngày {getDateLabel()}
                                            </h4>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={loadTeamData} className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Tải lại">
                                                    <span className="material-icons text-lg">refresh</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Date Filter Buttons */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                                {[
                                                    { key: 'today' as const, label: 'Hôm nay' },
                                                    { key: 'yesterday' as const, label: 'Hôm qua' },
                                                    { key: '2days' as const, label: 'Hôm kia' },
                                                    { key: 'custom' as const, label: 'Tùy chọn' },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => setDateFilter(opt.key)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${dateFilter === opt.key
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {dateFilter === 'custom' && (
                                                <input
                                                    type="date"
                                                    value={customDate}
                                                    onChange={(e) => setCustomDate(e.target.value)}
                                                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            )}

                                            {/* Department Filter */}
                                            <select
                                                value={selectedDept}
                                                onChange={(e) => setSelectedDept(e.target.value)}
                                                className="px-3 py-2 bg-slate-100 text-xs font-bold text-slate-600 outline-none rounded-xl border border-slate-200"
                                            >
                                                <option value="">Tất cả phòng ban</option>
                                                {departments.map(d => <option key={d.id || d._id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase">Tổng check-in</p>
                                            <p className="text-2xl font-black text-indigo-900">{todayTeam.length}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase">Đúng giờ</p>
                                            <p className="text-2xl font-black text-emerald-900">{todayTeam.filter(t => t.status === 'PRESENT').length}</p>
                                        </div>
                                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                            <p className="text-[10px] font-black text-amber-400 uppercase">Đi muộn</p>
                                            <p className="text-2xl font-black text-amber-900">{todayTeam.filter(t => t.status === 'LATE').length}</p>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                            <p className="text-[10px] font-black text-purple-400 uppercase">Đã check-out</p>
                                            <p className="text-2xl font-black text-purple-900">{todayTeam.filter(t => t.checkOutAt).length}</p>
                                        </div>
                                    </div>

                                    {/* Full Detail Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="pb-4 pr-3 font-black text-slate-400 text-[10px] uppercase">Nhân viên</th>
                                                    <th className="pb-4 pr-3 font-black text-slate-400 text-[10px] uppercase">Phòng ban</th>
                                                    <th className="pb-4 pr-3 font-black text-slate-400 text-[10px] uppercase">Vào lúc</th>
                                                    <th className="pb-4 pr-3 font-black text-slate-400 text-[10px] uppercase">Ra lúc</th>
                                                    <th className="pb-4 pr-3 font-black text-slate-400 text-[10px] uppercase">Tổng TG</th>
                                                    <th className="pb-4 pr-3 font-black text-slate-400 text-[10px] uppercase">Trạng thái</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {todayTeam.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-20 text-center text-slate-400 font-bold">
                                                            <span className="material-icons text-4xl text-slate-200 block mb-3">event_busy</span>
                                                            Chưa có ai điểm danh ngày {getDateLabel()}.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    todayTeam.map((rec) => {
                                                        const email = findUserEmail(rec.userId);
                                                        return (
                                                            <tr key={rec._id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setSelectedRecord(rec)}>
                                                                <td className="py-4 pr-3">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                                            {rec.userName.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-slate-800 text-sm">{rec.userName}</p>
                                                                            {email && <p className="text-[11px] text-slate-400">{email}</p>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 pr-3">
                                                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{rec.department || '--'}</span>
                                                                </td>
                                                                <td className="py-4 pr-3 text-sm font-medium text-slate-600 tabular-nums">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="material-icons text-emerald-400 text-sm">login</span>
                                                                        {formatTime(rec.checkInAt)}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 pr-3 text-sm font-medium text-slate-600 tabular-nums">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="material-icons text-slate-300 text-sm">logout</span>
                                                                        {formatTime(rec.checkOutAt)}
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 pr-3 text-sm font-bold text-slate-700 tabular-nums">
                                                                    {formatWorkTime(rec.totalWorkMinutes)}
                                                                </td>
                                                                <td className="py-4 pr-3">
                                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${rec.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                        rec.status === 'LATE' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                            'bg-purple-50 text-purple-600 border border-purple-100'
                                                                        }`}>
                                                                        {statusLabel(rec.status)}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 max-w-[160px]">
                                                                    {rec.note ? (
                                                                        <p className="text-xs text-slate-500 truncate" title={rec.note}>{rec.note}</p>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-300 italic">--</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setSelectedRecord(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl backdrop-blur-sm">
                                        {selectedRecord.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">{selectedRecord.userName}</h3>
                                        <p className="text-indigo-100 text-sm font-medium">{findUserEmail(selectedRecord.userId) || 'N/A'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                    <span className="material-icons">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Basic Info Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Phòng ban</p>
                                    <p className="text-sm font-bold text-slate-700">{selectedRecord.department || '--'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ngày</p>
                                    <p className="text-sm font-bold text-slate-700">{formatDate(selectedRecord.dateKey)}</p>
                                </div>
                            </div>

                            {/* Time Info */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Check-in</p>
                                    <p className="text-lg font-black text-emerald-700">{formatTime(selectedRecord.checkInAt)}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Check-out</p>
                                    <p className="text-lg font-black text-slate-700">{formatTime(selectedRecord.checkOutAt)}</p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Tổng TG</p>
                                    <p className="text-lg font-black text-indigo-700">{formatWorkTime(selectedRecord.totalWorkMinutes)}</p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-3">
                                <span className={`px-4 py-2 rounded-xl text-xs font-black ${selectedRecord.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    selectedRecord.status === 'LATE' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-purple-50 text-purple-600 border border-purple-100'
                                    }`}>
                                    {statusLabel(selectedRecord.status)}
                                </span>
                                {selectedRecord.lateMinutes > 0 && (
                                    <span className="text-xs font-bold text-amber-500">Muộn {selectedRecord.lateMinutes} phút</span>
                                )}
                            </div>

                            {/* Network & Device Info */}
                            <div className="border-t border-slate-100 pt-5">
                                <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                                    <span className="material-icons text-sm">wifi</span>
                                    Thông tin mạng & thiết bị
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
                                        <span className="material-icons text-slate-400 text-lg mt-0.5">language</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Địa chỉ IP Public</p>
                                            <p className="text-sm font-bold text-slate-700 font-mono">{selectedRecord.ipAddress || 'Chưa ghi nhận'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
                                        <span className="material-icons text-slate-400 text-lg mt-0.5">wifi</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Loại kết nối mạng</p>
                                            <p className="text-sm font-bold text-slate-700">
                                                {(() => {
                                                    const t = selectedRecord.networkInfo?.type;
                                                    const et = selectedRecord.networkInfo?.effectiveType;
                                                    const typeMap: Record<string, string> = { wifi: 'WiFi', ethernet: 'Dây (Ethernet)', cellular: 'Di động (3G/4G/5G)', none: 'Không kết nối', bluetooth: 'Bluetooth' };
                                                    const speedMap: Record<string, string> = { 'slow-2g': 'Rất chậm (2G)', '2g': 'Chậm (2G)', '3g': 'Trung bình (3G)', '4g': 'Nhanh (4G/WiFi)' };
                                                    const typeName = t ? (typeMap[t] || t) : '';
                                                    const speedName = et ? (speedMap[et] || et) : '';
                                                    if (typeName && speedName) return `${typeName} — ${speedName}`;
                                                    if (typeName) return typeName;
                                                    if (speedName) return speedName;
                                                    return 'Chưa ghi nhận';
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
                                        <span className="material-icons text-slate-400 text-lg mt-0.5">devices</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Thiết bị (User Agent)</p>
                                            <p className="text-xs text-slate-500 break-all leading-relaxed">{selectedRecord.userAgent || 'Không có dữ liệu'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Note */}
                            {selectedRecord.note && (
                                <div className="border-t border-slate-100 pt-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ghi chú</p>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">{selectedRecord.note}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setSelectedRecord(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
