
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { Objective, Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

export const Reports: React.FC = () => {
  const { selectedPeriod } = useAuth();
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const o = await dataService.getOKRs();
    const t = await dataService.getTasks();
    setOkrs(o);
    setTasks(t);
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredOkrs = okrs.filter(o => o.quarter === selectedPeriod.quarter && o.year === selectedPeriod.year);
  const filteredTasks = tasks.filter(t => filteredOkrs.some(o => o.keyResults?.some(kr => kr.id === t.krId)));

  const depts = Array.from(new Set(filteredOkrs.map(o => o.department)));
  const deptData = depts.map(d => {
    const deptOkrs = filteredOkrs.filter(o => o.department === d);
    const avgProgress = deptOkrs.reduce((acc, curr) => acc + curr.progress, 0) / (deptOkrs.length || 1);
    return { name: d, progress: Math.round(avgProgress) };
  });

  const taskStatusData = [
    { name: 'Hoàn thành', value: filteredTasks.filter(t => t.status === 'DONE').length },
    { name: 'Đang làm', value: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length },
    { name: 'Chưa làm', value: filteredTasks.filter(t => t.status === 'TODO').length },
  ];

  const COLORS = ['#10b981', '#6366f1', '#f59e0b'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Báo cáo hiệu suất {selectedPeriod.quarter}/{selectedPeriod.year}</h2>
          <p className="text-slate-500 text-sm">Phân tích chuyên sâu dựa trên dữ liệu hệ thống.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <span className="material-icons mr-2 text-indigo-600">assessment</span>
            Tiến độ OKR theo phòng ban (%)
          </h3>
          <div className="h-72 w-full">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="progress" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 border border-dashed rounded-xl">Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <span className="material-icons mr-2 text-indigo-600">donut_large</span>
            Phân bổ trạng thái công việc
          </h3>
          <div className="h-72 w-full flex flex-col items-center">
            {filteredTasks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {taskStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 border border-dashed rounded-xl">Chưa có nhiệm vụ</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
