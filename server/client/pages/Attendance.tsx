
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceService, AttendanceRecord, AttendanceStatus } from '../services/attendanceService';
import { getDepartments } from '../services/departmentService';

export const Attendance: React.FC = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState<AttendanceStatus | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [todayTeam, setTodayTeam] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [note, setNote] = useState('');
    const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal');
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState(user?.department || '');

    useEffect(() => {
        loadData();
        if (user?.role !== 'EMPLOYEE') {
            loadDepartments();
        }
    }, [user]);

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
                const teamRes = await attendanceService.getTodayAttendance(undefined, selectedDept);
                setTodayTeam(teamRes);
            }
        } catch (err) {
            console.error('Failed to load attendance data', err);
        } finally {
            setLoading(false);
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
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Tình hình nhân sự hôm nay</h4>
                                        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                                            <select
                                                value={selectedDept}
                                                onChange={(e) => setSelectedDept(e.target.value)}
                                                className="bg-transparent text-xs font-bold text-slate-600 outline-none px-3 py-1"
                                            >
                                                <option value="">Tất cả phòng ban</option>
                                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                            <button onClick={loadData} className="p-1 hover:text-indigo-600">
                                                <span className="material-icons text-lg">refresh</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase">Đã check-in</p>
                                            <p className="text-2xl font-black text-indigo-900">{todayTeam.length}</p>
                                        </div>
                                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                            <p className="text-[10px] font-black text-amber-400 uppercase">Đi muộn</p>
                                            <p className="text-2xl font-black text-amber-900">{todayTeam.filter(t => t.status === 'LATE').length}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase">Check-out sớm</p>
                                            <p className="text-2xl font-black text-emerald-900">{todayTeam.filter(t => t.status === 'HALF_DAY').length}</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Nhân viên</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Phòng ban</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Vào lúc</th>
                                                    <th className="pb-4 font-black text-slate-400 text-[10px] uppercase">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {todayTeam.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-20 text-center text-slate-400 font-bold">Chưa có ai check-in hôm nay.</td>
                                                    </tr>
                                                ) : (
                                                    todayTeam.map((rec) => (
                                                        <tr key={rec._id} className="group hover:bg-slate-50 transition-colors">
                                                            <td className="py-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                                        {rec.userName.charAt(0)}
                                                                    </div>
                                                                    <span className="font-bold text-slate-700 text-sm">{rec.userName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 text-xs font-bold text-slate-500 italic">{rec.department || '--'}</td>
                                                            <td className="py-4 text-sm font-medium text-slate-500 tabular-nums">{formatTime(rec.checkInAt)}</td>
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
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
