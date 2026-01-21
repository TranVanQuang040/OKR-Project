
import React, { useState, useEffect } from 'react';
import { getOKRSuggestions } from '../services/geminiService';
import { Objective, KeyResult, ObjectiveStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import * as myOkrService from '../services/myOkrService';

export const MyOKRs: React.FC = () => {
  const { user, selectedPeriod } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingOKRId, setEditingOKRId] = useState<string | null>(null);
  const [newObjective, setNewObjective] = useState('');
  const [description, setDescription] = useState('');
  const [okrType, setOkrType] = useState<'COMPANY' | 'DEPARTMENT' | 'PERSONAL'>('PERSONAL');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [parentId, setParentId] = useState('');
  const [tags, setTags] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [pendingKRs, setPendingKRs] = useState<any[]>([]);
  const [manualKR, setManualKR] = useState({ title: '', weight: 1, source: 'MANUAL', confidenceScore: 10 });
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const adaptOKR = (okr: any) => ({
    ...okr,
    id: okr._id || okr.id,
    keyResults: (okr.keyResults || []).map((kr: any) => ({ ...kr, id: kr._id || kr.id }))
  });

  const loadOKRs = async () => {
    setIsLoading(true);
    try {
      const data = await myOkrService.getMyOKRs({ quarter: selectedPeriod.quarter, year: selectedPeriod.year });
      setOkrs((data || []).map((o: any) => adaptOKR(o)));
    } catch (err) {
      const data = await dataService.getOKRs();
      setOkrs((data || []).map((o: any) => adaptOKR(o)));
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
    setManualKR({ title: '', weight: 1, source: 'MANUAL', confidenceScore: 10 });
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
      department: user?.department,
      quarter: selectedPeriod.quarter,
      year: selectedPeriod.year,
      status: editingOKRId ? undefined : 'DRAFT',
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
        const res = await myOkrService.updateMyOKR(editingOKRId, payload);
        const adapted = adaptOKR(res);
        setStatusMessage('Cập nhật OKR thành công');
        setOkrs(prev => prev.map(o => o.id === adapted.id ? adapted : o));
      } else {
        const res = await myOkrService.createMyOKR(payload);
        const adapted = adaptOKR(res);
        setStatusMessage('Tạo OKR thành công');
        setOkrs(prev => [adapted, ...prev]);
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

  const resetForm = () => {
    setNewObjective('');
    setDescription('');
    setOkrType('PERSONAL');
    setPriority('MEDIUM');
    setParentId('');
    setTags('');
    setPendingKRs([]);
    setEditingOKRId(null);
    setShowMoreOptions(false);
  };

  const deleteOKR = async (id: string) => {
    if (!confirm('Xóa OKR này?')) return;
    setDeletingId(id);
    try {
      await myOkrService.deleteMyOKR(id);
      setStatusMessage('Xóa OKR thành công');
      setTimeout(() => setStatusMessage(''), 3000);
      setOkrs(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      await dataService.deleteOKR(id);
      await loadOKRs();
    } finally {
      setDeletingId(null);
    }
  };

  const displayOkrs = okrs.filter(o =>
    o.quarter === selectedPeriod.quarter && o.year === selectedPeriod.year
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">OKR Của Tôi {selectedPeriod.quarter}/{selectedPeriod.year}</h2>
        <button onClick={() => { setShowModal(true); resetForm(); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Tạo OKR mới</button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 animate-in fade-in duration-300">{statusMessage}</div>
      )}

      {isLoading ? (
        <div className="p-6 text-center text-slate-400">Đang tải OKR cá nhân…</div>
      ) : (
        <div className="grid gap-6">
          {displayOkrs.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
              Bạn chưa có OKR nào trong kỳ này. Hãy tạo một mục tiêu mới!
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
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                    <button onClick={() => {
                      setEditingOKRId(okr.id);
                      setNewObjective(okr.title);
                      setDescription(okr.description || '');
                      setOkrType(okr.type || 'PERSONAL');
                      setPriority(okr.priority || 'MEDIUM');
                      setParentId(okr.parentId || '');
                      setTags(okr.tags?.join(', ') || '');
                      setPendingKRs(okr.keyResults);
                      setShowModal(true);
                    }} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                      <span className="material-icons">edit</span>
                    </button>
                    <button onClick={() => deleteOKR(okr.id)} disabled={deletingId === okr.id} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-icons">{deletingId === okr.id ? 'hourglass_top' : 'delete'}</span>
                    </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{editingOKRId ? 'Chỉnh sửa' : 'Tạo mới'} OKR Cá nhân</h3>
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
                  placeholder="Ví dụ: Hoàn thành khóa học React nâng cao trong Q1..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Loại OKR</label>
                  <select
                    value={okrType}
                    onChange={e => setOkrType(e.target.value as any)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                  >
                    <option value="PERSONAL">Cá nhân (Personal)</option>
                    <option value="DEPARTMENT">Phòng ban (Department)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Độ ưu tiên</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                  >
                    <option value="HIGH">Cao (High)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="LOW">Thấp (Low)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="text-xs font-bold text-indigo-600 flex items-center hover:underline px-1"
              >
                <span className="material-icons text-sm mr-1">{showMoreOptions ? 'expand_less' : 'expand_more'}</span>
                {showMoreOptions ? 'Ẩn bớt tùy chọn' : 'Thêm mô tả & Thẻ phân loại'}
              </button>

              {showMoreOptions && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200 border border-slate-100 text-sm">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mô tả chi tiết</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ghi chú thêm về mục tiêu này..."
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white min-h-[60px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Gắn thẻ (Tags)</label>
                      <input
                        type="text"
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="Learning, React, Q1..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Liên kết OKR Cấp trên</label>
                      <select
                        value={parentId}
                        onChange={e => setParentId(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">Không có</option>
                        {/* Optionally fetch and map departmental OKRs here */}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 p-4 rounded-xl space-y-3 bg-white">
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs font-bold uppercase text-slate-500">Key Results (Kế hoạch thực hiện)</p>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{pendingKRs.length} KR</span>
                </div>

                <div className="flex space-x-2 items-center">
                  <input type="text" placeholder="Tên KR (Ví dụ: Hoàn thành 5 project mẫu)" className="flex-1 border p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={manualKR.title} onChange={e => setManualKR({ ...manualKR, title: e.target.value })} />
                  <div className="flex items-center space-x-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">W:</span>
                    <input type="range" min="1" max="10" step="1" className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={manualKR.weight} onChange={e => setManualKR({ ...manualKR, weight: parseInt(e.target.value) || 1 })} />
                    <span className="text-xs font-bold text-indigo-600 w-4">{manualKR.weight}</span>
                  </div>
                  <button onClick={addManualKR} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    <span className="material-icons text-sm">add</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {pendingKRs.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-50 rounded-lg text-slate-400 text-xs">
                      Hãy bắt đầu bằng cách thêm các kết quả quan trọng cần đạt được.
                    </div>
                  )}
                  {pendingKRs.map((kr, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-sm group/kr shadow-sm">
                      <span className="truncate flex-1 font-medium">{kr.title}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">W: {kr.weight || 1}</span>
                        <button onClick={() => setPendingKRs(pendingKRs.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                          <span className="material-icons text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-xl flex items-center justify-between border border-indigo-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-white p-1 rounded-lg mr-2">
                      <span className="material-icons text-indigo-600 text-lg">auto_awesome</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-700 uppercase">Sáng tạo cùng AI</p>
                      <p className="text-[9px] text-indigo-500">Tự động gợi ý các bước đi thông minh</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateKRs}
                    disabled={!newObjective || isGenerating}
                    className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    {isGenerating ? 'Đang phân tích...' : 'Gợi ý ngay'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 text-sm">Bỏ qua</button>
              <button
                onClick={saveOKR}
                disabled={isSubmitting}
                className={`px-8 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all text-sm ${isSubmitting ? 'bg-slate-300 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5'
                  }`}
              >
                {isSubmitting ? 'Đang lưu…' : (editingOKRId ? 'Lưu thay đổi' : 'Tạo OKR')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
