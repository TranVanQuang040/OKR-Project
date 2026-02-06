import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface Props {
    tasks: any[];
}

const CHART_COLORS = {
    ALERT: '#ef4444',
    PROGRESS: '#3b82f6',
    TODO: '#94a3b8',
    DONE: '#10b981'
};

export const TaskStatisticsSection: React.FC<Props> = ({ tasks }) => {
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
            { name: 'Khẩn cấp', value: alertTasks.length, color: CHART_COLORS.ALERT },
            { name: 'Đang làm', value: progressCount, color: CHART_COLORS.PROGRESS },
            { name: 'Chờ làm', value: todoCount, color: CHART_COLORS.TODO },
            { name: 'Hoàn thành', value: doneTasks.length, color: CHART_COLORS.DONE },
        ].filter(item => item.value > 0);
    }, [taskAnalysis]);

    return (
        <div className="space-y-6">
            {/* ROW: CHART & ALERT LIST */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* BIỂU ĐỒ CÔNG VIỆC */}
                <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 flex items-center mb-4">
                        <span className="material-icons mr-2 text-rose-500">notification_important</span>
                        Trạng Thái Tasks
                    </h3>
                    <div className="h-[220px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={taskChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {taskChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* DANH SÁCH NHIỆM VỤ CẦN CHÚ Ý */}
                <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 flex items-center mb-4">
                        <span className="material-icons mr-2 text-amber-500">list_alt</span>
                        Danh sách Nhiệm vụ Cần Chú Ý
                    </h3>
                    <div className="overflow-y-auto max-h-[220px] pr-2 custom-scrollbar flex-1">
                        {taskAnalysis.alertTasks.length > 0 ? (
                            <div className="space-y-2">
                                {taskAnalysis.alertTasks.map((task, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate mb-1">{task.title}</div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">{task.dueDate || 'No Date'}</span>
                                                <span className="text-[10px] font-black text-rose-500 uppercase">{task.alertReason}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <span className="material-icons text-3xl mb-1">check_circle</span>
                                <span className="text-xs font-bold">Không có cảnh báo nào.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ROW: DONE TASKS */}
            {taskAnalysis.doneTasks.length > 0 && (
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-black text-emerald-600 mb-4 flex items-center">
                        <span className="material-icons mr-2">task_alt</span>
                        Nhiệm vụ Đã Hoàn Thành
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {taskAnalysis.doneTasks.slice(0, 6).map((task, i) => (
                            <div key={i} className="flex items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <span className="material-icons text-emerald-600 text-sm mr-2">check</span>
                                <span className="text-xs font-bold text-slate-700 truncate">{task.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
