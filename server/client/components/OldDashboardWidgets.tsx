import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';

// Define Props
interface OldDashboardProps {
    tasks: any[];
    okrs: any[];
    departments: any[];
    selectedPeriod: { quarter: string, year: number };
    setFocusDept: (dept: string | null) => void;
    focusDept: string | null;
}

const CHART_COLORS = {
    ALERT: '#ef4444',
    PROGRESS: '#3b82f6',
    TODO: '#94a3b8',
    DONE: '#10b981'
};

export const OldDashboardWidgets: React.FC<OldDashboardProps> = ({
    tasks, okrs, departments, selectedPeriod, setFocusDept, focusDept
}) => {

    const periodOkrs = useMemo(() =>
        okrs.filter(o => o.quarter === selectedPeriod.quarter && o.year === selectedPeriod.year),
        [okrs, selectedPeriod]
    );

    const taskAnalysis = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alertTasks: any[] = [];
        const doneTasks: any[] = [];
        const otherTasks: any[] = [];

        tasks.forEach(task => {
            let diffDays = 999;
            let alertReason = "";
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                const diffTime = dueDate.getTime() - today.getTime();
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            if (task.status === 'DONE') {
                doneTasks.push(task);
                return;
            }

            let isAlert = false;
            if (diffDays <= 3) {
                isAlert = true;
                alertReason = "Chỉ còn < 3 ngày!";
            } else if (task.status === 'TODO' && diffDays <= 12) {
                isAlert = true;
                alertReason = "Chưa làm & còn < 12 ngày";
            } else if (task.status === 'IN_PROGRESS' && diffDays <= 7) {
                isAlert = true;
                alertReason = "Đang làm & còn < 7 ngày";
            }

            if (isAlert) {
                alertTasks.push({ ...task, alertReason, diffDays });
            } else {
                otherTasks.push(task);
            }
        });

        alertTasks.sort((a, b) => (a.diffDays || 999) - (b.diffDays || 999));
        return { alertTasks, doneTasks, otherTasks };
    }, [tasks]);

    const taskChartData = useMemo(() => {
        const { alertTasks, doneTasks, otherTasks } = taskAnalysis;
        const progressCount = otherTasks.filter(t => t.status === 'IN_PROGRESS').length;
        const todoCount = otherTasks.filter(t => t.status === 'TODO').length;

        return [
            { name: 'Cảnh báo khẩn cấp', value: alertTasks.length, color: CHART_COLORS.ALERT },
            { name: 'Đang thực hiện', value: progressCount, color: CHART_COLORS.PROGRESS },
            { name: 'Chờ thực hiện', value: todoCount, color: CHART_COLORS.TODO },
            { name: 'Đã hoàn thành', value: doneTasks.length, color: CHART_COLORS.DONE },
        ].filter(item => item.value > 0);
    }, [taskAnalysis]);

    const deptProgressData = useMemo(() => {
        return departments.map(dept => {
            const deptOkrs = periodOkrs.filter(o => o.department === dept.name);
            const avgProgress = deptOkrs.length > 0
                ? Math.round(deptOkrs.reduce((acc, curr) => acc + (curr.progress || 0), 0) / deptOkrs.length)
                : 0;
            return { name: dept.name, progress: avgProgress };
        });
    }, [departments, periodOkrs]);

    const displayProgress = useMemo(() => {
        if (focusDept) {
            const dept = deptProgressData.find(d => d.name === focusDept);
            return dept ? dept.progress : 0;
        }
        return periodOkrs.length > 0
            ? Math.round(periodOkrs.reduce((acc, curr) => acc + (curr.progress || 0), 0) / periodOkrs.length)
            : 0;
    }, [focusDept, deptProgressData, periodOkrs]);

    return (
        <div className="space-y-8 mt-8 border-t border-slate-200 pt-8">
            <div className="flex items-center space-x-2 mb-4">
                <span className="material-icons text-slate-400">restart_alt</span>
                <h2 className="text-xl font-bold text-slate-500">Khu vực Quản lý Tác vụ (Legacy View)</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* BIỂU ĐỒ CÔNG VIỆC */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                        <span className="material-icons mr-2 text-rose-500">notification_important</span>
                        Trạng Thái Tasks
                    </h3>
                    <div className="h-[250px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={taskChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {taskChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* BẢNG CẢNH BÁO NHIỆM VỤ */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                        <span className="material-icons mr-2 text-amber-500">list_alt</span>
                        Danh sách Nhiệm vụ Cần Chú Ý
                    </h3>
                    <div className="overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                        {taskAnalysis.alertTasks.length > 0 ? (
                            <div className="space-y-3">
                                {taskAnalysis.alertTasks.map((task, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{task.title}</p>
                                            <div className="flex items-center mt-1 space-x-3 text-xs">
                                                <span className="flex items-center text-slate-500 font-bold">{task.dueDate || 'No Date'}</span>
                                                <span className="text-rose-600 font-black italic bg-white px-2 py-0.5 rounded shadow-sm">{task.alertReason}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-10 font-bold">Không có cảnh báo nào.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* RADIAL CHART */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center relative">
                    <h3 className="text-xl font-black text-slate-800 mb-4">{focusDept ? focusDept : 'Tiến độ Toàn Công Ty'}</h3>
                    <div className="h-[250px] w-full max-w-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart innerRadius="70%" outerRadius="100%" barSize={20} data={[{ value: displayProgress, fill: '#6366f1' }]} startAngle={90} endAngle={450}>
                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                <RadialBar background dataKey="value" cornerRadius={10} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-slate-900">{displayProgress}%</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase">TIẾN ĐỘ</span>
                        </div>
                    </div>
                </div>

                {/* DEPT LIST */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <h3 className="text-xl font-black text-slate-800 mb-6">Phòng Ban</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {deptProgressData.map((dept, i) => (
                            <div key={i} onClick={() => setFocusDept(dept.name)}
                                className={`p-4 rounded-3xl border cursor-pointer flex items-center justify-between
                      ${focusDept === dept.name ? 'border-indigo-500 bg-indigo-50' : 'border-slate-50 bg-slate-50 hover:bg-white'}`}>
                                <span className="font-extrabold text-slate-700 uppercase text-xs">{dept.name}</span>
                                <div className="flex items-center">
                                    <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden mr-3">
                                        <div className="h-full bg-indigo-500" style={{ width: `${dept.progress}%` }}></div>
                                    </div>
                                    <span className="font-black text-indigo-600 text-xs">{dept.progress}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* DONE TASKS */}
            {taskAnalysis.doneTasks.length > 0 && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <h3 className="text-xl font-black text-emerald-600 mb-4">Nhiệm vụ Đã Hoàn Thành</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {taskAnalysis.doneTasks.slice(0, 6).map((task, i) => (
                            <div key={i} className="flex items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <span className="material-icons text-emerald-600 text-sm mr-2">check_circle</span>
                                <span className="text-xs font-bold text-slate-700 truncate">{task.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
