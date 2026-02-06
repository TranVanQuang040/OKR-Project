import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { AtRiskTable } from '../components/AtRiskTable';
import { DepartmentHeatmap } from '../components/DepartmentHeatmap';
import { BlockerList } from '../components/BlockerList';
import { ExpectedVsActualChart } from '../components/ExpectedVsActualChart';
import { TaskStatisticsSection } from '../components/TaskStatisticsSection'; // New
import { InsightCard } from '../components/InsightCard'; // New
import { dataService } from '../services/dataService';
import { taskService } from '../services/taskService';
import { getDepartments } from '../services/departmentService';

// Component con hiển thị Task cá nhân
const PersonalTasksWidget = ({ tasks }: { tasks: any[] }) => {
  const todoTasks = tasks.filter(t => t.status !== 'DONE').slice(0, 5);
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full">
      <h3 className="text-lg font-black text-slate-800 flex items-center mb-4">
        <span className="material-icons mr-2 text-indigo-500">assignment</span>
        Việc cần làm tuần này (Cá nhân)
      </h3>
      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {todoTasks.length === 0 ? (
          <div className="text-center text-slate-400 text-xs py-4">Bạn chưa có task nào cần làm.</div>
        ) : (
          todoTasks.map((task, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <div className="text-sm font-bold text-slate-700 clamp-1">{task.title}</div>
                <div className="text-[10px] text-slate-400 font-bold">{task.dueDate || 'No Deadline'}</div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-black 
                                 ${task.type === 'BLOCKER' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {task.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user, selectedPeriod } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any>({
    healthScore: 0,
    components: {},
    atRisk: [],
    departments: [],
    alignment: {},
    definitions: {}
  });

  const [legacyData, setLegacyData] = useState({
    okrs: [] as any[],
    tasks: [] as any[],
    departments: [] as any[]
  });

  const [loading, setLoading] = useState(true);
  const [viewRole, setViewRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>(user?.role || 'EMPLOYEE');

  useEffect(() => {
    if (user) {
      setViewRole(user.role);
      loadAnalytics();
      loadLegacyData();
    }
  }, [user, selectedPeriod]);

  const loadLegacyData = async () => {
    try {
      const [okrs, tasks, depts] = await Promise.all([
        dataService.getOKRs(),
        taskService.getTasks(),
        getDepartments()
      ]);
      setLegacyData({ okrs, tasks, departments: depts });
    } catch (e) {
      console.error("Legacy load error", e);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('okr_auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [healthRes, atRiskRes, deptStatsRes] = await Promise.all([
        fetch('/api/analytics/health-score', { headers }),
        fetch('/api/analytics/at-risk', { headers }),
        fetch('/api/analytics/department-stats', { headers })
      ]);

      const healthIdx = await healthRes.json();
      const atRiskList = await atRiskRes.json();
      const realDeptStats = await deptStatsRes.json();

      // Use Real Data directly
      const deptMap = realDeptStats.map((d: any) => ({
        name: d.name,
        progress: d.progress,
        healthScore: d.healthScore
      }));

      setAnalyticsData({
        healthScore: healthIdx.score || 0,
        healthStatus: healthIdx.healthStatus,
        insight: healthIdx.insight,
        definitions: healthIdx.definitions,
        components: healthIdx.components || {},
        atRisk: Array.isArray(atRiskList) ? atRiskList : [],
        departments: deptMap
      });
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  // Define Layout Order

  // 1. VIEW CEO / ADMIN
  if (viewRole === 'ADMIN') {
    return (
      <div className="p-6 space-y-8 animate-fadeIn">
        <div className="flex justify-end space-x-2 mb-4">
          <span className="text-xs font-bold text-slate-400 self-center mr-2">Preview as:</span>
          {(['ADMIN', 'MANAGER', 'EMPLOYEE'] as const).map(role => (
            <button key={role}
              onClick={() => setViewRole(role)}
              className={`px-3 py-1 rounded-lg text-xs font-black border transition-all 
                          ${viewRole === role ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              {role}
            </button>
          ))}
        </div>

        {/* BLOCK 1: STRATEGIC OVERVIEW (Health & Heatmap) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-[340px]">
            <HealthScoreCard
              score={analyticsData.healthScore}
              components={analyticsData.components}
              healthStatus={analyticsData.healthStatus}
              // Insight removed from here, moved to bottom card
              definitions={analyticsData.definitions}
            />
          </div>
          <div className="lg:col-span-2 h-[340px]">
            <DepartmentHeatmap data={analyticsData.departments} />
          </div>
        </div>

        {/* BLOCK 2: OPERATIONAL RISKS (At Risk & Blockers) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AtRiskTable data={analyticsData.atRisk} />
          </div>
          <div className="lg:col-span-1">
            <BlockerList items={analyticsData.atRisk.filter((i: any) => i.riskFactors?.hasBlocker)} />
          </div>
        </div>

        {/* BLOCK 3: TASK EXECUTION STATUS (Restored Legacy Widgets) */}
        <TaskStatisticsSection tasks={legacyData.tasks} />

        {/* BLOCK 4: INSIGHT & EXPLANATIONS (Pinned Last) */}
        <InsightCard definitions={analyticsData.definitions} />
      </div>
    );
  }

  // 2. VIEW MANAGER
  if (viewRole === 'MANAGER') {
    return (
      <div className="p-6 space-y-8 animate-fadeIn">
        {user?.role === 'ADMIN' && (
          <button onClick={() => setViewRole('ADMIN')} className="mb-4 px-3 py-1 bg-slate-200 text-slate-600 rounded text-xs font-bold">← Back to Admin View</button>
        )}
        <h2 className="text-2xl font-black text-slate-800 mb-2">Dashboard Trưởng Phòng</h2>

        {/* BLOCK 1: TEAM PERFORMANCE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-700 mb-4">Tiến độ Phòng Ban (Real-time)</h3>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-indigo-500" style={{ width: '75%' }}></div>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Actual: 75%</span>
              <span>Expected: 80%</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-700 mb-4">Cần nhắc nhở (Check-in trễ)</h3>
            <div className="text-sm text-slate-500">Chưa có dữ liệu check-in trễ.</div>
          </div>
        </div>

        {/* BLOCK 2: AT RISK ITEMS */}
        <AtRiskTable data={analyticsData.atRisk} />

        {/* BLOCK 3: TASK EXECUTION (Manager sees all tasks like Admin temporarily) */}
        <TaskStatisticsSection tasks={legacyData.tasks} />
        {/* Note: Logic filter task cho manager cần cải thiện sau, giờ hiển thị chung hoặc task của họ */}

        {/* BLOCK 4: INSIGHT */}
        <InsightCard definitions={analyticsData.definitions} />
      </div>
    );
  }

  // 3. VIEW EMPLOYEE
  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {user?.role === 'ADMIN' && (
        <button onClick={() => setViewRole('ADMIN')} className="mb-4 px-3 py-1 bg-slate-200 text-slate-600 rounded text-xs font-bold">← Back to Admin View</button>
      )}
      <h2 className="text-2xl font-black text-slate-800 mb-2">Xin chào, {user?.name} 👋</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Tiến độ cá nhân + Expected Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">OKR Của Tôi</h3>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">Q1/2026</span>
            </div>

            <div className="space-y-6">
              {legacyData.okrs.filter(o => o.ownerId === user?.id).slice(0, 3).map((okr, i) => (
                <div key={i} className="border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-700">{okr.title}</span>
                    <span className="font-black text-indigo-600">{okr.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-indigo-500" style={{ width: `${okr.progress}%` }}></div>
                  </div>
                  <ExpectedVsActualChart okrId={okr._id || okr.id} />
                </div>
              ))}
              {legacyData.okrs.filter(o => o.ownerId === user?.id).length === 0 && (
                <div className="text-center text-slate-400">Bạn chưa có OKR nào trong kỳ này.</div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Việc cần làm */}
        <div className="lg:col-span-1 space-y-6">
          <PersonalTasksWidget tasks={legacyData.tasks.filter(t => t.assigneeId === user?.id)} />

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-lg">
            <h3 className="font-bold text-lg mb-2">Check-in Reminder</h3>
            <p className="text-indigo-100 text-xs mb-4">Đừng quên cập nhật tiến độ trước Thứ 6 nhé.</p>
            <button className="w-full bg-white text-indigo-600 font-black py-2 rounded-xl text-sm shadow-sm hover:bg-slate-50 transition-colors">
              Check-in Ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
