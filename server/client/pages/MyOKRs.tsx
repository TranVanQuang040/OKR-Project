
import React, { useState, useEffect } from 'react';
import { Objective } from '../types';
import { useAuth } from '../context/AuthContext';
import * as okrService from '../services/okrService';
import * as myOkrService from '../services/myOkrService';
import { dataService } from '../services/dataService'; // Ensure this is imported for fallback or remove if not used, but good to have

export const MyOKRs: React.FC = () => {
  const { user, selectedPeriod } = useAuth();
  const [filterType, setFilterType] = useState<'ALL' | 'PERSONAL' | 'DEPARTMENT' | 'TEAM'>('ALL');
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

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

      // Remove duplicates by ID
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      const sorted = unique.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA || String(b.id).localeCompare(String(a.id));
      });
      setOkrs(sorted);
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
    o.status === 'APPROVED' &&
    (filterType === 'ALL' || (filterType === 'PERSONAL' && o.type === 'PERSONAL') || (filterType === 'DEPARTMENT' && o.type === 'DEPARTMENT') || (filterType === 'TEAM' && o.type === 'TEAM'))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayOkrs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayOkrs.map(o => o.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} OKR đã chọn?`)) return;

    setIsLoading(true);
    try {
      for (const id of selectedIds) {
        try {
          const okr = okrs.find(o => o.id === id);
          if (okr?.type === 'PERSONAL') {
            await myOkrService.deleteMyOKR(id);
          } else {
            if (okr?.ownerId === user?.id || user?.role === 'ADMIN') {
              await okrService.deleteOKR(id);
            }
          }
        } catch (e) {
          console.error(`Failed to delete ${id}`, e);
        }
      }
      setStatusMessage(`Đã xóa ${selectedIds.length} OKR`);
      setSelectedIds([]);
      await loadOKRs();
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa nhiều mục');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const deleteOKR = async (okr: Objective) => {
    if (!confirm('Xóa OKR này?')) return;
    const id = okr.id;
    setDeletingId(id);
    try {
      if (okr.type === 'PERSONAL') {
        await myOkrService.deleteMyOKR(id);
      } else {
        await okrService.deleteOKR(id);
      }
      setStatusMessage('Xóa OKR thành công');
      setOkrs(prev => prev.filter(o => o.id !== id));
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Delete failed', err);
      alert('Không thể xóa OKR này (có thể do quyền hạn)');
    } finally {
      setDeletingId(null);
    }
  };

  const duplicateOKR = async (okr: Objective) => {
    if (!confirm(`Tạo bản sao cho OKR: "${okr.title}"?`)) return;

    try {
      const payload = {
        ...okr,
        id: undefined,
        _id: undefined,
        title: okr.title + ' (Copy)',
        keyResults: okr.keyResults.map((kr: any) => ({
          ...kr,
          id: undefined,
          currentValue: 0,
          progress: 0
        })),
        status: 'PENDING_APPROVAL',
        progress: 0
      };

      if (okr.type === 'PERSONAL') {
        await myOkrService.createMyOKR(payload);
      } else {
        await okrService.createOKR(payload);
      }
      setStatusMessage('Đã tạo bản sao OKR');
      await loadOKRs();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      alert('Không thể tạo bản sao');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Danh sách OKR {selectedPeriod.quarter}/{selectedPeriod.year}</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={toggleSelectAll}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedIds.length === displayOkrs.length && displayOkrs.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {selectedIds.length === displayOkrs.length && displayOkrs.length > 0 ? 'Bỏ chọn' : 'Chọn tất cả'}
          </button>
          <div className="w-px bg-slate-300 mx-1 my-1"></div>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('TEAM')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'TEAM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Nhóm
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

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-red-600 ml-2">Đã chọn {selectedIds.length} OKR</span>
          </div>
          <button
            onClick={handleBulkDelete}
            className="bg-red-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-red-600 transition-colors flex items-center"
          >
            <span className="material-icons text-sm mr-1">delete</span>
            Xóa các mục đã chọn
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md animate-in fade-in">{statusMessage}</div>
      )}

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
            <div key={okr.id} className={`bg-white p-6 rounded-2xl border transition-all relative group ${selectedIds.includes(okr.id) ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200 hover:shadow-md'}`}>
              <div className="flex justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(okr.id)}
                      onChange={() => toggleSelect(okr.id)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
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
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${okr.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                        {okr.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold">{okr.title}</h3>
                    {okr.tags && okr.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {okr.tags.map(t => <span key={t} className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded">#{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-600">{okr.progress || 0}%</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => duplicateOKR(okr)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded hover:bg-indigo-50 transition-colors"
                      title="Tạo bản sao"
                    >
                      <span className="material-icons text-sm">content_copy</span>
                    </button>
                    {(user?.role === 'ADMIN' || okr.ownerId === user?.id) && (
                      <button
                        onClick={() => deleteOKR(okr)}
                        disabled={deletingId === okr.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded hover:bg-red-50 transition-colors"
                        title="Xóa OKR"
                      >
                        <span className="material-icons text-sm">{deletingId === okr.id ? 'hourglass_top' : 'delete'}</span>
                      </button>
                    )}
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
