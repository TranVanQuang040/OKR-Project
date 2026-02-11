
import React, { useState, useEffect } from 'react';
import { getOKRSuggestions } from '../services/geminiService';
import { Objective, KeyResult, ObjectiveStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import * as okrService from '../services/okrService';
import * as myOkrService from '../services/myOkrService';
import { getDepartments } from '../services/departmentService';

export const OKRs: React.FC = () => {
  const { user, selectedPeriod } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingOKRId, setEditingOKRId] = useState<string | null>(null);
  const [newObjective, setNewObjective] = useState('');
  const [description, setDescription] = useState('');
  const [okrType, setOkrType] = useState<'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'PERSONAL'>('DEPARTMENT');
  const [workgroupId, setWorkgroupId] = useState('');
  const [workgroups, setWorkgroups] = useState<any[]>([]);
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [parentId, setParentId] = useState('');
  const [tags, setTags] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [pendingKRs, setPendingKRs] = useState<any[]>([]);
  const [manualKR, setManualKR] = useState({ title: '', weight: 1, unit: '%', targetValue: 100, source: 'MANUAL', confidenceScore: 10 });
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'PERSONAL' | 'DEPARTMENT' | 'TEAM' | 'PENDING'>('ALL');
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const adaptOKR = (okr: any) => ({
    ...okr,
    id: okr._id || okr.id,
    keyResults: (okr.keyResults || []).map((kr: any) => ({ ...kr, id: kr._id || kr.id }))
  });

  const getTimeRemaining = (endDate: string) => {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) return null;
      const total = end.getTime() - new Date().getTime();
      const days = Math.floor(total / (1000 * 60 * 60 * 24));
      if (days < 0) return 'Quá hạn';
      return `${days} ngày `;
    } catch (e) {
      return null;
    }
  };

  const loadOKRs = async () => {
    setIsLoading(true);
    try {
      const [deptData, personalData] = await Promise.all([
        okrService.getOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year }),
        myOkrService.getMyOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year })
      ]);

      const combined = [
        ...(deptData || []).map((o: any) => adaptOKR(o)),
        ...(personalData || []).map((o: any) => adaptOKR(o))
      ];

      // Filter unique by ID and sort by createdAt
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      const sorted = unique.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA || String(b.id).localeCompare(String(a.id));
      });
      setOkrs(sorted);
    } catch (err) {
      const data = await dataService.getOKRs();
      setOkrs((data || []).map((o: any) => adaptOKR(o)));
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load departments', err);
      setDepartments([]);
    }
  };

  useEffect(() => {
    loadOKRs();
    loadDepartments();
    loadWorkgroups();
  }, [selectedPeriod]);

  useEffect(() => {
    loadDepartments();
    loadWorkgroups();
  }, []);

  const loadWorkgroups = async () => {
    try {
      const { workgroupService } = await import('../services/workgroupService');
      const data = await workgroupService.getWorkgroups();
      setWorkgroups(data || []);
    } catch (err) {
      console.error('Failed to load workgroups', err);
    }
  };

  const handleGenerateKRs = async () => {
    if (!newObjective) return;
    setIsGenerating(true);
    const suggestions = await getOKRSuggestions(newObjective);
    if (suggestions && Array.isArray(suggestions)) {
      setPendingKRs([...pendingKRs, ...suggestions.map(s => ({
        ...s,
        id: `kr-ai-${Math.random()}`,
        source: 'MANUAL',
        confidenceScore: 10
      }))]);
    }
    setIsGenerating(false);
  };

  const addManualKR = () => {
    if (!manualKR.title) {
      alert("Vui lòng điền đủ thông tin KR.");
      return;
    }
    setPendingKRs([...pendingKRs, { ...manualKR, id: `kr-${Date.now()}` }]);
    setManualKR({ title: '', weight: 1, unit: '%', targetValue: 100, source: 'MANUAL', confidenceScore: 10 });
  };

  const validateKRs = (krs: any[]) => {
    if (!krs || krs.length < 1) return 'Cần ít nhất 1 KR.';
    for (const kr of krs) {
      if (!kr.title || kr.title.trim() === '') return 'Mỗi KR phải có tiêu đề.';
    }
    return null;
  };

  const saveOKR = async () => {
    const validationError = validateKRs(pendingKRs);
    if (!newObjective) return alert('Vui lòng nhập mục tiêu.');
    if (validationError) return alert(validationError);

    const payload: any = {
      id: editingOKRId || undefined,
      title: newObjective,
      description,
      type: okrType,
      priority,
      parentId: parentId || null,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      ownerId: user?.id,
      ownerName: user?.name,
      department: okrType === 'DEPARTMENT' ? (targetDepartment || user?.department) : (okrType === 'PERSONAL' ? 'Cá nhân' : user?.department),
      quarter: selectedPeriod.quarter,
      year: selectedPeriod.year,
      status: editingOKRId ? undefined : 'PENDING_APPROVAL',
      startDate,
      endDate,
      workgroupId: okrType === 'TEAM' ? workgroupId : null,
      keyResults: pendingKRs.map(kr => ({
        id: kr.id && !kr.id.startsWith('kr-') ? kr.id : undefined,
        title: kr.title,
        weight: kr.weight || 1,
        targetValue: kr.targetValue || 100,
        unit: kr.unit || '%',
        currentValue: kr.currentValue || 0,
        progress: kr.progress || 0,
        source: kr.source || 'MANUAL',
        confidenceScore: kr.confidenceScore || 10
      }))
    };

    setIsSubmitting(true);
    try {
      if (editingOKRId) {
        let res;
        if (okrType === 'PERSONAL') {
          res = await okrService.updateMyOKR(editingOKRId, payload);
        } else {
          res = await okrService.updateOKR(editingOKRId, payload);
        }
        const adapted = adaptOKR(res);
        setStatusMessage('Cập nhật OKR thành công');
        setOkrs(prev => prev.map(o => o.id === adapted.id ? adapted : o));
      } else {
        let res;
        if (okrType === 'PERSONAL') {
          res = await okrService.createMyOKR(payload);
        } else {
          res = await okrService.createOKR(payload);
        }
        const adapted = adaptOKR(res);
        setStatusMessage('Tạo OKR thành công');
        // If it was a personal OKR, we might want to fetch all just in case, but let's add it to local state if appropriate
        // However, usually OKRs.tsx shows Department OKRs.
        // Let's reload everything to be sure.
        await loadOKRs();
      }
      setTimeout(() => setStatusMessage(''), 3000);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.warn('API save failed', err);
      alert('Không thể lưu OKR: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveOKR = async (id: string) => {
    const okr = okrs.find(o => o.id === id);
    if (!okr) return;
    try {
      if (okr.type === 'PERSONAL') {
        await myOkrService.updateMyOKRStatus(id, 'APPROVED');
      } else {
        await okrService.updateOKRStatus(id, 'APPROVED');
      }
      setStatusMessage('Đã phê duyệt OKR');
      loadOKRs();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      alert('Không thể phê duyệt');
    }
  };

  const rejectOKR = async (id: string) => {
    if (!confirm('Từ chối OKR này?')) return;
    const okr = okrs.find(o => o.id === id);
    if (!okr) return;
    try {
      if (okr.type === 'PERSONAL') {
        await myOkrService.updateMyOKRStatus(id, 'REJECTED');
      } else {
        await okrService.updateOKRStatus(id, 'REJECTED');
      }
      setStatusMessage('Đã từ chối OKR');
      loadOKRs();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      alert('Không thể từ chối');
    }
  };

  const resetForm = () => {
    setNewObjective('');
    setDescription('');
    setOkrType('DEPARTMENT');
    setPriority('MEDIUM');
    setParentId('');
    setTags('');
    setPendingKRs([]);
    setEditingOKRId(null);
    setShowMoreOptions(false);
    setTargetDepartment(user?.department || '');
    setStartDate('');
    setEndDate('');
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
    loadDepartments();
  };

  const openEditModal = (okr: Objective) => {
    setEditingOKRId(okr.id);
    setNewObjective(okr.title);
    setDescription(okr.description || '');
    setOkrType(okr.type || 'DEPARTMENT');
    setPriority(okr.priority || 'MEDIUM');
    setParentId(okr.parentId || '');
    setTags(okr.tags?.join(', ') || '');
    setPendingKRs(okr.keyResults);
    setTargetDepartment(okr.department || '');
    const formatToDateInput = (d: any) => {
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch { return ''; }
    };
    setStartDate(formatToDateInput(okr.startDate));
    setEndDate(formatToDateInput(okr.endDate));
    setWorkgroupId(okr.workgroupId || '');
    setShowModal(true);
    loadDepartments();
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
      setTimeout(() => setStatusMessage(''), 3000);
      setOkrs(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
      // fallback to local storage
      await dataService.deleteOKR(id);
      await loadOKRs();
    } finally {
      setDeletingId(null);
    }
  };

  const duplicateOKR = (okr: Objective) => {
    setNewObjective(okr.title + ' (Copy)');
    setDescription(okr.description || '');
    setOkrType(okr.type || 'DEPARTMENT');
    setPriority(okr.priority || 'MEDIUM');
    setParentId(okr.parentId || '');
    setTags(okr.tags?.join(', ') || '');
    setPendingKRs(okr.keyResults.map(kr => ({ ...kr, id: undefined, currentValue: 0, progress: 0 })));
    setTargetDepartment(okr.department || '');
    setWorkgroupId(okr.workgroupId || '');
    setEditingOKRId(null); // Ensure it creates new
    setShowModal(true);
    setStatusMessage('Đã sao chép OKR, vui lòng kiểm tra và lưu lại');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} OKR đã chọn?`)) return;

    setIsLoading(true);
    try {
      // Loop delete as API doesn't support bulk delete yet
      for (const id of selectedIds) {
        try {
          // Check type to call correct service
          const okr = okrs.find(o => o.id === id);
          if (okr?.type === 'PERSONAL') {
            await myOkrService.deleteMyOKR(id);
          } else {
            await okrService.deleteOKR(id);
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
    }
  };

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

  const displayOkrs = okrs.filter(o =>
    o.quarter === selectedPeriod.quarter && o.year === selectedPeriod.year &&
    (user?.role === 'ADMIN' || o.department === user?.department || o.ownerId === user?.id) &&
    (
      filterType === 'ALL' ||
      (filterType === 'PERSONAL' && o.type === 'PERSONAL') ||
      (filterType === 'DEPARTMENT' && o.type === 'DEPARTMENT') ||
      (filterType === 'TEAM' && o.type === 'TEAM') ||
      (filterType === 'PENDING' && o.status === 'PENDING_APPROVAL')
    ) &&
    (filterPriority === 'ALL' || o.priority === filterPriority)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">OKR {selectedPeriod.quarter}/{selectedPeriod.year}</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={toggleSelectAll}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedIds.length === displayOkrs.length && displayOkrs.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {selectedIds.length === displayOkrs.length && displayOkrs.length > 0 ? 'Bỏ chọn' : 'Chọn tất cả'}
          </button>
          <div className="w-px bg-slate-300 mx-1 my-1"></div>
          <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tất cả</button>
          <button onClick={() => setFilterType('DEPARTMENT')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'DEPARTMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Phòng ban</button>
          <button onClick={() => setFilterType('TEAM')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'TEAM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Nhóm</button>
          <button onClick={() => setFilterType('PERSONAL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'PERSONAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Cá nhân</button>
          <button onClick={() => setFilterType('PENDING')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'PENDING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Chờ duyệt</button>
        </div>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as any)}
          className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">Mức ưu tiên: Tất cả</option>
          <option value="HIGH">Ưu tiên Cao</option>
          <option value="MEDIUM">Ưu tiên Trung bình</option>
          <option value="LOW">Ưu tiên Thấp</option>
        </select>
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.hash = '#/automation'}
            className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-indigo-100 transition-colors"
          >
            <span className="material-icons text-sm mr-2">smart_toy</span>
            Tạo OKR tự động
          </button>
          <button onClick={openNewModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">Tạo OKR mới</button>
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
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md">{statusMessage}</div>
      )}

      {isLoading ? (
        <div className="p-6 text-center">Đang tải OKR…</div>
      ) : (
        <div className="grid gap-6">
          {displayOkrs.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
              Không tìm thấy OKR nào trong kỳ {selectedPeriod.quarter}/{selectedPeriod.year}.
            </div>
          )}
          {displayOkrs.map(okr => (
            <div key={okr.id} className="bg-white p-6 rounded-2xl border border-slate-200 group relative shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between mb-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(okr.id)}
                    onChange={() => toggleSelect(okr.id)}
                    className="mt-1.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${okr.priority === 'HIGH' ? 'bg-red-100 text-red-600' :
                        okr.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {okr.priority || 'MEDIUM'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${okr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                        okr.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-600' :
                          okr.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {okr.status === 'APPROVED' ? 'Đã duyệt' : okr.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : okr.status === 'REJECTED' ? 'Từ chối' : 'Nháp'}
                      </span>
                      <span className="text-xs font-bold text-indigo-600">{okr.ownerName} - {okr.department}</span>
                      {okr.endDate && okr.status === 'APPROVED' && (
                        <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <span className="material-icons text-xs mr-1">timer</span>
                          Còn {getTimeRemaining(okr.endDate)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold">{okr.title}</h3>
                    {okr.tags && okr.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {okr.tags.map(t => <span key={t} className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded">#{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right w-24 mr-4">
                    <span className="text-2xl font-black text-indigo-600 leading-none">{okr.progress}%</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{okr.status}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-y-1 flex-col">
                    {user?.role === 'ADMIN' && okr.status === 'PENDING_APPROVAL' && (
                      <div className="flex space-x-1 mb-1">
                        <button onClick={() => approveOKR(okr.id)} className="p-1 px-2 bg-emerald-500 text-white rounded text-[10px] font-bold hover:bg-emerald-600 transition-colors">DUYỆT</button>
                        <button onClick={() => rejectOKR(okr.id)} className="p-1 px-2 bg-rose-500 text-white rounded text-[10px] font-bold hover:bg-rose-600 transition-colors">TỪ CHỐI</button>
                      </div>
                    )}
                    <div className="flex space-x-1">
                      <button onClick={() => duplicateOKR(okr)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Tạo bản sao">
                        <span className="material-icons text-lg">content_copy</span>
                      </button>
                      <button onClick={() => openEditModal(okr)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                        <span className="material-icons text-lg">edit</span>
                      </button>
                      <button onClick={() => deleteOKR(okr)} disabled={deletingId === okr.id} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                        <span className="material-icons text-lg">{deletingId === okr.id ? 'hourglass_top' : 'delete'}</span>
                      </button>
                    </div>
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
                      <span>{kr.currentValue}/{kr.targetValue} {kr.unit}</span>
                      <span className="font-bold text-indigo-600">{kr.progress}%</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${kr.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{editingOKRId ? 'Chỉnh sửa' : 'Tạo mới'} OKR</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Mục tiêu (Objective)</label>
                <textarea
                  value={newObjective}
                  onChange={e => setNewObjective(e.target.value)}
                  placeholder="Ví dụ: Trở thành số 1 trong thị trường SaaS tại VN..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Loại OKR</label>
                  <select
                    value={okrType}
                    onChange={e => setOkrType(e.target.value as any)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                  >
                    <option value="DEPARTMENT">Cấp Phòng ban</option>
                    <option value="TEAM">Cấp Nhóm</option>
                    <option value="PERSONAL">Cấp Cá nhân</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Độ ưu tiên</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                  >
                    <option value="LOW">Thấp (Low)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="HIGH">Cao (High)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                  />
                </div>
              </div>

              {okrType === 'DEPARTMENT' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Phòng ban gán cho</label>
                  <select
                    value={targetDepartment}
                    onChange={e => setTargetDepartment(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map((d, idx) => (
                      <option key={d._id || d.id || `dept-${idx}`} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {okrType === 'TEAM' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Nhóm gán cho</label>
                  <select
                    value={workgroupId}
                    onChange={e => setWorkgroupId(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                  >
                    <option value="">-- Chọn nhóm --</option>
                    {workgroups.map((w, idx) => (
                      <option key={w._id || w.id || `team-${idx}`} value={w._id || w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="text-xs font-bold text-indigo-600 flex items-center hover:underline px-1"
              >
                <span className="material-icons text-sm mr-1">{showMoreOptions ? 'expand_less' : 'expand_more'}</span>
                {showMoreOptions ? 'Ẩn bớt tùy chọn' : 'Thêm mô tả & Liên kết cha'}
              </button>

              {showMoreOptions && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">Mục tiêu cha (Alignment)</label>
                    <select
                      value={parentId}
                      onChange={e => setParentId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Không liên kết --</option>
                      {okrs
                        .filter(o => {
                          if (o.id === editingOKRId) return false;
                          if (o.status !== 'APPROVED') return false;
                          if (okrType === 'PERSONAL') return o.type === 'DEPARTMENT';
                          if (okrType === 'DEPARTMENT') return o.type === 'COMPANY';
                          return false;
                        })
                        .map(o => (
                          <option key={o.id} value={o.id}>[{o.type}] {o.title}</option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">Mô tả thêm</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Chi tiết về mục tiêu này..."
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">Tags (cách nhau bằng dấu phẩy)</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="SaaS, Growth, Tech..."
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="border border-slate-200 p-4 rounded-xl space-y-3 bg-white">
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs font-bold uppercase text-slate-500">Kết quả THEN CHỐT (Key Results)</p>
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{pendingKRs.length} KR</span>
                </div>

                <div className="flex space-x-2 items-center">
                  <input
                    type="text"
                    placeholder="Tên KR (Ví dụ: Doanh thu đạt 1 tỷ)"
                    className="flex-1 border p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    value={manualKR.title}
                    onChange={e => setManualKR({ ...manualKR, title: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Mục tiêu"
                    className="w-20 border p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    value={manualKR.targetValue}
                    onChange={e => setManualKR({ ...manualKR, targetValue: parseInt(e.target.value) || 100 })}
                  />
                  <input
                    type="text"
                    placeholder="Đơn vị"
                    className="w-20 border p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    value={manualKR.unit}
                    onChange={e => setManualKR({ ...manualKR, unit: e.target.value })}
                  />
                  <div className="flex items-center space-x-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">W:</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-12 p-1 border border-slate-200 rounded text-center text-xs font-bold text-indigo-600 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      value={manualKR.weight}
                      onChange={e => setManualKR({ ...manualKR, weight: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <button onClick={addManualKR} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
                    <span className="material-icons">add</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {pendingKRs.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                      <p className="text-slate-400 text-xs">Chưa có KR nào. Hãy thêm thủ công hoặc dùng AI.</p>
                    </div>
                  )}
                  {pendingKRs.map((kr, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-sm font-medium group/kr">
                      <div className="flex-1 truncate pr-2">
                        <span className="text-slate-800">{kr.title}</span>
                        {kr.source === 'KPI' && <span className="ml-2 text-[8px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-bold uppercase">KPI LINK</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">W: {kr.weight || 1}</span>
                        <button onClick={() => setPendingKRs(pendingKRs.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                          <span className="material-icons text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-xl flex items-center justify-between border border-indigo-100">
                  <div className="flex items-center">
                    <div className="bg-white p-1 rounded-lg mr-2 shadow-sm">
                      <span className="material-icons text-indigo-600 text-lg">psychology</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-700 uppercase">AI Assistant</p>
                      <p className="text-[9px] text-indigo-500">Tự động đề xuất KR từ mục tiêu của bạn</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateKRs}
                    disabled={!newObjective || isGenerating}
                    className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isGenerating ? 'Đang phân tích...' : 'Gợi ý KR'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-top border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 text-sm">Hủy</button>
              <button
                onClick={saveOKR}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all text-sm ${isSubmitting ? 'bg-slate-300 text-slate-700 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5'
                  }`}
              >
                {isSubmitting ? (editingOKRId ? 'Đang lưu…' : 'Đang gửi…') : (editingOKRId ? 'Lưu thay đổi' : 'Gửi phê duyệt')}
              </button>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};
