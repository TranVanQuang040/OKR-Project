
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleService, WorkScheduleRecord, ScheduleSummary } from '../services/scheduleService';
import { getDepartments } from '../services/departmentService';
import { WorkSchedule } from '../types';

export const WorkSchedulePage: React.FC = () => {
    const { user } = useAuth();
    const [mySchedules, setMySchedules] = useState<WorkScheduleRecord[]>([]);
    const [allSchedules, setAllSchedules] = useState<WorkScheduleRecord[]>([]);
    const [report, setReport] = useState<ScheduleSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'employee' | 'admin'>(user?.role === 'EMPLOYEE' ? 'employee' : 'admin');
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [monthOffset, setMonthOffset] = useState(0);
    const [selectedDay, setSelectedDay] = useState<{ dateKey: string; date: Date; userId?: string | null; note?: string } | null>(null);
    const [adminSelectedUser, setAdminSelectedUser] = useState<ScheduleSummary | null>(null);
    const [adminUserSchedules, setAdminUserSchedules] = useState<WorkScheduleRecord[]>([]);
    const [tempNote, setTempNote] = useState('');
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [weekOffset, setWeekOffset] = useState(0);

    const shifts: { value: WorkSchedule['shift']; label: string; icon: string; color: string; textColor: string; hours?: string }[] = [
        { value: 'FULL_DAY', label: 'Cả ngày', icon: 'wb_sunny', color: 'bg-indigo-50 border-indigo-200', textColor: 'text-indigo-600', hours: '8:30 - 17:30' },
        { value: 'MORNING', label: 'Ca Sáng', icon: 'light_mode', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-600', hours: '8:30 - 12:00' },
        { value: 'AFTERNOON', label: 'Ca Chiều', icon: 'dark_mode', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-600', hours: '13:30 - 17:30' },
        { value: 'ONLINE', label: 'Làm Online', icon: 'computer', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-600', hours: '8:30 - 17:30' },
        { value: 'OFF', label: 'Nghỉ', icon: 'event_busy', color: 'bg-rose-50 border-rose-200', textColor: 'text-rose-600' },
        { value: 'UNEXCUSED_ABSENCE', label: 'Nghỉ không phép', icon: 'error_outline', color: 'bg-red-600 border-red-700', textColor: 'text-white' },
    ];

    useEffect(() => {
        loadInitialData();
    }, [user, monthOffset, selectedDept]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);

            const from = formatDateKey(startOfMonth);
            const to = formatDateKey(endOfMonth);

            if (user?.role === 'EMPLOYEE') {
                const mine = await scheduleService.getMine(from, to);
                setMySchedules(mine);
            } else {
                const [all, summary, depts] = await Promise.all([
                    scheduleService.getAll({ from, to, department: selectedDept }),
                    scheduleService.getReport(from, to, selectedDept),
                    getDepartments()
                ]);
                setAllSchedules(all);
                setReport(summary);
                setDepartments(depts);
            }
        } catch (err) {
            console.error('Failed to load schedule data', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDateKey = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleShiftChange = async (dateKey: string, shift: WorkSchedule['shift'], targetUserId?: string | null, note?: string) => {
        setIsUpdating(true);
        try {
            const payload = { dateKey, shift, note };
            await scheduleService.bulkUpdate([{ ...payload, userId: targetUserId || user?.id }]);

            if (targetUserId && targetUserId !== user?.id) {
                const now = new Date();
                const from = formatDateKey(new Date(now.getFullYear(), now.getMonth() + monthOffset, 1));
                const to = formatDateKey(new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0));
                const updated = await scheduleService.getAll({ from, to, userId: targetUserId });
                setAdminUserSchedules(updated);
            } else {
                const mine = await scheduleService.getMine();
                setMySchedules(mine);
            }
            loadInitialData();
        } catch (err) {
            alert('Không thể cập nhật lịch làm việc');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleBulkShiftChange = async (shift: WorkSchedule['shift']) => {
        if (selectedDateKeys.length === 0) return;
        setIsUpdating(true);
        try {
            const updates = selectedDateKeys.map(dateKey => ({
                dateKey,
                shift,
                userId: user?.id
            }));
            await scheduleService.bulkUpdate(updates);

            const mine = await scheduleService.getMine();
            setMySchedules(mine);
            loadInitialData();
            setSelectedDateKeys([]);
            setIsMultiSelect(false);
        } catch (err) {
            alert('Không thể cập nhật lịch làm việc hàng loạt');
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleDateSelection = (dateKey: string) => {
        setSelectedDateKeys(prev =>
            prev.includes(dateKey)
                ? prev.filter(k => k !== dateKey)
                : [...prev, dateKey]
        );
    };

    const renderEmployeeView = () => {
        const stats = {
            work: mySchedules.filter(s => !['OFF', 'UNEXCUSED_ABSENCE'].includes(s.shift)).length,
            off: mySchedules.filter(s => s.shift === 'OFF').length,
            unexcused: mySchedules.filter(s => s.shift === 'UNEXCUSED_ABSENCE').length
        };

        const getMonday = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        };

        const currentWeekStart = getMonday(new Date());
        currentWeekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7));

        const currentWeekDays: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(currentWeekStart);
            day.setDate(day.getDate() + i);
            currentWeekDays.push(day);
        }

        return (
            <div className="space-y-12 animate-fadeIn relative pb-20">
                {/* Employee Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                    <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 material-icons">work</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ngày làm việc</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{stats.work}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 material-icons">event_busy</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ngày nghỉ phép</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{stats.off}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm group hover:border-rose-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <span className="p-3 bg-rose-50 rounded-2xl text-rose-600 material-icons">report_problem</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nghỉ không phép</span>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{stats.unexcused}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between px-8 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setWeekOffset(w => w - 1)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-slate-200 text-slate-600">
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest px-4">
                            Lịch tuần: {currentWeekDays[0].toLocaleDateString('vi-VN')} - {currentWeekDays[6].toLocaleDateString('vi-VN')}
                        </h4>
                        <button onClick={() => setWeekOffset(w => w + 1)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-slate-200 text-slate-600">
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                    <button onClick={() => setWeekOffset(0)} className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black tracking-widest">TUẦN NÀY</button>
                </div>

                <div className="grid grid-cols-7 gap-6 px-8">
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((d, idx) => (
                        <div key={d} className={`text-center text-sm font-black uppercase tracking-[0.2em] ${idx >= 5 ? 'text-indigo-600/60' : 'text-slate-400'}`}>{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-6 px-4">
                    {currentWeekDays.map((date, idx) => {
                        const dateKey = formatDateKey(date);
                        const schedule = mySchedules.find(s => s.dateKey === dateKey);
                        const isToday = dateKey === formatDateKey(new Date());
                        const isSelected = selectedDateKeys.includes(dateKey);
                        const isWeekend = idx >= 5;
                        const shiftObj = shifts.find(s => s.value === (schedule?.shift || 'FULL_DAY'));

                        return (
                            <div
                                key={dateKey}
                                onClick={() => {
                                    if (isMultiSelect) {
                                        toggleDateSelection(dateKey);
                                    } else {
                                        setSelectedDay({ dateKey, date, note: schedule?.note });
                                        setTempNote(schedule?.note || '');
                                    }
                                }}
                                className={`h-64 p-6 rounded-[3rem] border-2 transition-all cursor-pointer group flex flex-col items-center justify-between shadow-sm relative overflow-hidden ${isMultiSelect && isSelected
                                    ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10'
                                    : isToday
                                        ? 'border-indigo-500/50 bg-indigo-50 shadow-indigo-500/5'
                                        : isWeekend
                                            ? 'border-slate-100 bg-slate-50 opacity-90'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200 hover:-translate-y-1'
                                    }`}
                            >
                                {isMultiSelect && (
                                    <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                                        {isSelected && <span className="material-icons text-xs">check</span>}
                                    </div>
                                )}

                                <div className="w-full flex justify-between items-start">
                                    <span className={`text-2xl font-black tracking-tighter ${isToday ? 'text-indigo-600' : isWeekend ? 'text-slate-400' : 'text-slate-800'}`}>{date.getDate()}</span>
                                    {schedule?.shift && !isMultiSelect && (
                                        <div className={`p-2 rounded-2xl ${shiftObj?.color} border border-slate-100`}>
                                            <span className={`material-icons text-lg ${shiftObj?.textColor}`}>{shiftObj?.icon}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center text-center space-y-2">
                                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-sm ${schedule?.shift === 'OFF' ? 'text-rose-600 bg-rose-50 border border-rose-100' :
                                        schedule?.shift === 'UNEXCUSED_ABSENCE' ? 'text-white bg-red-600 border border-red-700' :
                                            schedule?.shift ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' :
                                                isWeekend ? 'text-slate-400 border border-slate-100' :
                                                    'text-slate-500 border border-slate-200 group-hover:border-indigo-300 transition-all'
                                        }`}>
                                        {shiftObj?.label || 'Trống'}
                                    </div>

                                    {schedule?.shift && shiftObj?.hours && (
                                        <div className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                            <span className="material-icons text-[12px] mr-1">schedule</span>
                                            {shiftObj.hours}
                                        </div>
                                    )}

                                    {schedule?.note && <p className="text-[10px] text-slate-400 italic line-clamp-1 max-w-[120px] font-medium">{schedule.note}</p>}
                                </div>

                                <div className={`w-4 h-1 rounded-full transition-all duration-700 ${isToday ? 'bg-indigo-600 w-12' : 'bg-slate-100 group-hover:bg-indigo-300 group-hover:w-10'}`}></div>
                            </div>
                        );
                    })}
                </div>

                {/* Floating Bulk Action Bar */}
                {isMultiSelect && selectedDateKeys.length > 0 && (
                    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-[2.5rem] p-4 flex items-center space-x-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 animate-slideUp">
                        <div className="px-6 border-r border-slate-100 mr-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Đã chọn</p>
                            <p className="text-xl font-black text-slate-900 leading-none">{selectedDateKeys.length} ngày</p>
                        </div>
                        {shifts.filter(s => s.value !== 'UNEXCUSED_ABSENCE').map(s => (
                            <button
                                key={s.value}
                                onClick={() => handleBulkShiftChange(s.value as any)}
                                className={`flex flex-col items-center justify-center w-20 h-20 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-md ${s.color} border border-slate-100 active:scale-90`}
                            >
                                <span className={`material-icons ${s.textColor}`}>{s.icon}</span>
                                <span className={`text-[9px] font-black uppercase mt-1 ${s.textColor}`}>{s.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setIsMultiSelect(false);
                                setSelectedDateKeys([]);
                            }}
                            className="w-14 h-14 rounded-[1.25rem] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center ml-4"
                        >
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderAdminView = () => {
        return (
            <div className="p-8 space-y-12 animate-fadeIn bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="p-8 bg-white border border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tổng nhân viên</p>
                            <p className="text-5xl font-black text-slate-900 tracking-tighter">{report.length}</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-slate-900">groups</span>
                        </div>
                    </div>
                    <div className="p-8 bg-white border border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tổng ngày công</p>
                            <p className="text-5xl font-black text-emerald-600 tracking-tighter">{report.reduce((acc, r) => acc + r.workDays, 0)}</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-emerald-600">check_circle</span>
                        </div>
                    </div>
                    <div className="p-8 bg-white border border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden group hover:border-rose-500/30 transition-all">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Cần lưu ý</p>
                            <p className="text-5xl font-black text-rose-600 tracking-tighter">{report.filter(r => (r.offDays > 3 || r.unexcusedAbsences > 0)).length}</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-rose-600">warning</span>
                        </div>
                    </div>
                    <div className="p-8 bg-white border border-slate-200 rounded-[3rem] shadow-sm relative overflow-hidden group hover:border-red-500/30 transition-all">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nghỉ không phép</p>
                            <p className="text-5xl font-black text-red-600 tracking-tighter">{report.reduce((acc, r) => acc + r.unexcusedAbsences, 0)}</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-icons text-8xl text-red-600">error</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-12 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Theo dõi lịch trình theo tháng</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Báo cáo chi tiết từng cá nhân</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="relative group">
                                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">search</span>
                                <input
                                    type="text"
                                    placeholder="Tìm tên nhân viên..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold pl-12 pr-6 py-3.5 outline-none text-slate-700 focus:ring-2 focus:ring-indigo-500/20 w-[300px] transition-all"
                                />
                            </div>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold px-6 py-3.5 outline-none text-slate-700 focus:ring-2 focus:ring-indigo-500/20 min-w-[200px]"
                            >
                                <option value="">Tất cả phòng ban</option>
                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-10 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Nhân viên</th>
                                    <th className="px-10 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Đã đăng ký</th>
                                    <th className="px-10 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Làm việc</th>
                                    <th className="px-10 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Nghỉ</th>
                                    <th className="px-10 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">Không phép</th>
                                    <th className="px-10 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {report.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map((row) => (
                                    <tr
                                        key={row.userId}
                                        onClick={async () => {
                                            setAdminSelectedUser(row);
                                            const now = new Date();
                                            const from = formatDateKey(new Date(now.getFullYear(), now.getMonth() + monthOffset, 1));
                                            const to = formatDateKey(new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0));
                                            const userSch = await scheduleService.getAll({ from, to, userId: row.userId });
                                            setAdminUserSchedules(userSch);
                                        }}
                                        className="group hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-10 py-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                                                    {row.userName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-base">{row.userName}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{row.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center font-black text-slate-600">{row.plannedDays}</td>
                                        <td className="px-10 py-6 text-center font-black text-emerald-600">{row.workDays}</td>
                                        <td className="px-10 py-6 text-center font-black text-rose-500">{row.offDays}</td>
                                        <td className="px-10 py-6 text-center font-black text-red-600">{row.unexcusedAbsences}</td>
                                        <td className="px-10 py-6">
                                            {(row.unexcusedAbsences > 0 || row.offDays > 3) ? (
                                                <span className="px-4 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full text-[10px] font-black flex items-center w-fit">
                                                    <span className="material-icons text-[14px] mr-1.5">warning</span>
                                                    CẦN CHÚ Ý
                                                </span>
                                            ) : (
                                                <span className="px-4 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-[10px] font-black flex items-center w-fit">
                                                    <span className="material-icons text-[14px] mr-1.5">check_circle</span>
                                                    ỔN ĐỊNH
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !mySchedules.length && !report.length) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
                    <p className="text-indigo-600 font-bold tracking-widest text-[10px]">ĐANG TẢI DỮ LIỆU...</p>
                </div>
            </div>
        );
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {/* White Header Section */}
            <div className="bg-white p-10 pb-12 shadow-sm border-b border-slate-200">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Kế hoạch Lịch làm việc</h2>
                            <p className="text-slate-500 font-bold tracking-wide flex items-center">
                                <span className="material-icons text-indigo-500 mr-2 text-lg">event_available</span>
                                Đăng ký và theo dõi lịch trình làm việc cá nhân & tổ chức.
                            </p>
                        </div>
                        {user?.role !== 'EMPLOYEE' && (
                            <div className="flex bg-slate-100 p-2 rounded-[2rem] shadow-inner border border-slate-200">
                                <button
                                    onClick={() => setView('employee')}
                                    className={`px-10 py-3.5 rounded-[1.75rem] text-[11px] font-black transition-all tracking-widest ${view === 'employee' ? 'bg-indigo-600 text-white shadow-xl translate-z-10' : 'text-slate-400 hover:text-slate-700'}`}
                                >
                                    CÁ NHÂN
                                </button>
                                <button
                                    onClick={() => setView('admin')}
                                    className={`px-10 py-3.5 rounded-[1.75rem] text-[11px] font-black transition-all tracking-widest ${view === 'admin' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-700'}`}
                                >
                                    QUẢN TRỊ
                                </button>
                            </div>
                        )}
                    </header>

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl p-1.5 shadow-sm">
                            <button onClick={() => setMonthOffset(m => m - 1)} className="p-3.5 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-600">
                                <span className="material-icons text-xl font-bold">chevron_left</span>
                            </button>
                            <h3 className="px-8 text-base font-black text-slate-800 tracking-tight min-w-[240px] text-center uppercase">
                                {startOfMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={() => setMonthOffset(m => m + 1)} className="p-3.5 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-600">
                                <span className="material-icons text-xl font-bold">chevron_right</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setMonthOffset(0)}
                            className="px-8 py-4 bg-slate-900 text-white rounded-3xl text-[10px] font-black tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                        >
                            HÔM NAY
                        </button>
                        {view === 'employee' && (
                            <button
                                onClick={() => setIsMultiSelect(!isMultiSelect)}
                                className={`px-8 py-4 rounded-3xl text-[10px] font-black tracking-widest transition-all shadow-lg active:scale-95 flex items-center ${isMultiSelect ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-400'}`}
                            >
                                <span className="material-icons text-sm mr-2">{isMultiSelect ? 'check_box' : 'library_add_check'}</span>
                                {isMultiSelect ? 'ĐANG CHỌN NHIỀU' : 'ĐĂNG KÝ NHANH'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Dark Main Content Section */}
            <main className="max-w-[1600px] mx-auto py-16 px-4 pb-32">
                {view === 'employee' ? renderEmployeeView() : renderAdminView()}
            </main>

            {/* Shift Selection Modal */}
            {selectedDay && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-12 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">Cập nhật lịch</h4>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                                    {selectedDay.date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setSelectedDay(null)} className="w-14 h-14 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-600 active:scale-90">
                                <span className="material-icons text-2xl">close</span>
                            </button>
                        </div>
                        <div className="px-12 pt-8 pb-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Ghi chú (Tùy chọn)</label>
                            <input
                                type="text"
                                value={tempNote}
                                onChange={(e) => setTempNote(e.target.value)}
                                placeholder="Nhập lý do hoặc lời nhắn..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                            />
                        </div>
                        <div className="p-12 pt-4 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {shifts.filter(s => s.value !== 'UNEXCUSED_ABSENCE' || user?.role !== 'EMPLOYEE').map(s => {
                                const currentSch = (selectedDay.userId && selectedDay.userId !== user?.id)
                                    ? adminUserSchedules.find(sch => sch.dateKey === selectedDay.dateKey)
                                    : mySchedules.find(sch => sch.dateKey === selectedDay.dateKey);
                                const isSelected = currentSch?.shift === s.value || (!currentSch && s.value === 'FULL_DAY');

                                return (
                                    <button
                                        key={s.value}
                                        onClick={() => {
                                            handleShiftChange(selectedDay.dateKey, s.value as any, selectedDay.userId, tempNote);
                                            setSelectedDay(null);
                                        }}
                                        className={`w-full flex items-center p-7 rounded-[2.25rem] border-2 transition-all active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center mr-6 ${s.color} border shadow-inner`}>
                                            <span className={`material-icons text-2xl ${s.textColor}`}>{s.icon}</span>
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-black text-lg text-slate-800 tracking-tight">{s.label}</p>
                                            {s.hours && <p className="text-[11px] font-bold text-slate-400">{s.hours}</p>}
                                        </div>
                                        {isSelected && <span className="material-icons text-indigo-600 text-3xl">check_circle</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Detail Modal re-use */}
            {adminSelectedUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fadeIn">
                    <div className="bg-white rounded-[4rem] w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-12 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-lg">
                                    {adminSelectedUser.userName.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{adminSelectedUser.userName}</h4>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1">{adminSelectedUser.department}</p>
                                </div>
                            </div>
                            <button onClick={() => setAdminSelectedUser(null)} className="w-16 h-16 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-600 active:scale-95">
                                <span className="material-icons text-2xl">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/30">
                            <div className="grid grid-cols-7 gap-6">
                                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map(d => (
                                    <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest pb-6 mb-2 border-b border-slate-200">{d}</div>
                                ))}
                                {(() => {
                                    const now = new Date();
                                    const startOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0).getDate();
                                    const startDay = startOfMonth.getDay();
                                    const cells = [];
                                    const startPadding = startDay === 0 ? 6 : startDay - 1;
                                    for (let i = 0; i < startPadding; i++) cells.push(null);
                                    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(now.getFullYear(), now.getMonth() + monthOffset, i));

                                    return cells.map((date, idx) => {
                                        if (!date) return <div key={`adm-empty-${idx}`} className="h-40 bg-slate-100/50 rounded-[2rem] border border-dashed border-slate-200"></div>;
                                        const dKey = formatDateKey(date);
                                        const sch = adminUserSchedules.find(s => s.dateKey === dKey);
                                        const isToday = dKey === formatDateKey(new Date());
                                        const isWeekend = idx % 7 >= 5;
                                        const shiftObj = shifts.find(s => s.value === (sch?.shift || 'FULL_DAY'));

                                        return (
                                            <div
                                                key={dKey}
                                                onClick={() => {
                                                    setSelectedDay({ dateKey: dKey, date, userId: adminSelectedUser.userId, note: sch?.note });
                                                    setTempNote(sch?.note || '');
                                                }}
                                                className={`h-40 p-6 rounded-[2.5rem] border transition-all cursor-pointer flex flex-col items-center justify-between group overflow-hidden ${isToday
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                                    : isWeekend
                                                        ? 'border-slate-100 bg-white opacity-80'
                                                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 shadow-sm'
                                                    }`}
                                            >
                                                <div className="w-full flex justify-between items-start">
                                                    <span className={`text-xl font-black ${isToday ? 'text-indigo-600' : isWeekend ? 'text-slate-400' : 'text-slate-800'}`}>{date.getDate()}</span>
                                                    {sch?.shift && (
                                                        <span className={`material-icons text-sm ${shiftObj?.textColor}`}>{shiftObj?.icon}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-center w-full space-y-1">
                                                    <div className={`w-full py-1.5 rounded-xl text-[9px] font-black text-center border shadow-sm ${sch?.shift === 'OFF' ? 'text-rose-600 bg-rose-50 border-rose-200' :
                                                        sch?.shift === 'UNEXCUSED_ABSENCE' ? 'text-white bg-red-600 border-red-700' :
                                                            sch?.shift ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                                                                'text-slate-400 border-slate-100 group-hover:border-indigo-200 transition-all font-bold'
                                                        } truncate`}>
                                                        {shiftObj?.label || 'TRỐNG'}
                                                    </div>
                                                    {sch?.shift && shiftObj?.hours && (
                                                        <p className="text-[8px] font-bold text-slate-400">{shiftObj.hours}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkSchedulePage;
