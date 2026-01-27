
import React, { useState, useEffect } from 'react';
import { Objective } from '../types';
import { useAuth } from '../context/AuthContext';
import * as okrService from '../services/okrService';
import * as myOkrService from '../services/myOkrService';

export const MyOKRs: React.FC = () => {
  const { selectedPeriod } = useAuth();
  const [filterType, setFilterType] = useState<'ALL' | 'PERSONAL' | 'DEPARTMENT'>('ALL');
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const adaptOKR = (okr: any) => ({
    ...okr,
    id: okr._id || okr.id,
    keyResults: (okr.keyResults || []).map((kr: any) => ({ ...kr, id: kr._id || kr.id }))
  });

  const loadOKRs = async () => {
    setIsLoading(true);
    try {
      const [personalData, deptData] = await Promise.all([
        myOkrService.getMyOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year }),
        okrService.getOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year })
      ]);

      const combined = [
        ...(personalData || []).map((o: any) => adaptOKR(o)),
        ...(deptData || []).map((o: any) => adaptOKR(o))
      ];

      // Remove duplicates if any (by ID)
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setOkrs(unique);
    } catch (err) {
      console.error('Failed to load OKRs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOKRs(); }, [selectedPeriod]);

  useEffect(() => {
    const handleOKRUpdate = () => loadOKRs();
    window.addEventListener('okrUpdated', handleOKRUpdate);
    return () => window.removeEventListener('okrUpdated', handleOKRUpdate);
  }, []);

  const displayOkrs = okrs.filter(o =>
    o.quarter === selectedPeriod.quarter && o.year === selectedPeriod.year &&
    (filterType === 'ALL' || (filterType === 'PERSONAL' && o.type === 'PERSONAL') || (filterType === 'DEPARTMENT' && o.type === 'DEPARTMENT'))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Danh sách OKR {selectedPeriod.quarter}/{selectedPeriod.year}</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('DEPARTMENT')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'DEPARTMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Phòng ban
          </button>
          <button
            onClick={() => setFilterType('PERSONAL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'PERSONAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cá nhân
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Đang tải danh sách OKR…</div>
      ) : (
        <div className="grid gap-6">
          {displayOkrs.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
              Không tìm thấy OKR nào trong kỳ này.
            </div>
          )}
          {displayOkrs.map(okr => (
            <div key={okr.id} className="bg-white p-6 rounded-2xl border border-slate-200 group relative shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase">
                    <span className={`px-2 py-0.5 rounded-full ${okr.priority === 'HIGH' ? 'bg-red-100 text-red-600' :
                      okr.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {okr.priority || 'MEDIUM'}
                    </span>
                    <span className="text-indigo-600">{okr.type || 'PERSONAL'}</span>
                    {okr.department && okr.department !== 'Cá nhân' && (
                      <span className="text-slate-400 ml-2">— {okr.department}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold">{okr.title}</h3>
                  {okr.tags && okr.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {okr.tags.map(t => <span key={t} className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded">#{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-right">
                  <div className="mr-4">
                    <span className="text-2xl font-black text-indigo-600">{okr.progress || 0}%</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{okr.status}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {okr.keyResults.map((kr, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold truncate flex-1">{kr.title}</p>
                      {kr.source !== 'MANUAL' && (
                        <span className="material-icons text-[12px] text-indigo-400" title={`Auto-synced from ${kr.source}`}>sync</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] mt-1 italic text-slate-500">
                      <span>{kr.currentValue || 0}/{kr.targetValue || 100} {kr.unit}</span>
                      <span className="font-bold text-indigo-600">{kr.progress || 0}%</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${kr.progress || 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
