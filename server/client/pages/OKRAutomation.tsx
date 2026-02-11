import React, { useState, useEffect } from 'react';
import { automationService } from '../services/automationService';
import '../styles/Automation.css';

interface Template {
    _id: string;
    title: string;
    description: string;
    type: string;
    category: string;
    industry: string;
    priority: string;
    suggestedKRs: any[];
}

const OKRAutomation: React.FC = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
    const [quarter, setQuarter] = useState('Q1');
    const [year, setYear] = useState(2026);
    const [cascadeToDept, setCascadeToDept] = useState(false);
    const [cascadeToTeam, setCascadeToTeam] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // New states for customization
    const [overrides, setOverrides] = useState<Record<string, any>>({});
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: '', description: '', keyResults: [] as any[] });
    const [isCleaning, setIsCleaning] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setError(null);
            const data = await automationService.getTemplates({ type: 'COMPANY' });
            if (Array.isArray(data)) {
                setTemplates(data);
            } else {
                console.warn('Templates response is not an array:', data);
                setTemplates([]);
                setError('Không thể tải templates. Vui lòng thử lại.');
            }
        } catch (err: any) {
            console.error('Failed to load templates:', err);
            setTemplates([]);
            setError('Lỗi khi tải templates: ' + (err.message || 'Unknown error'));
        }
    };

    const toggleTemplate = (id: string) => {
        setSelectedTemplates(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (selectedTemplates.length === 0) {
            alert('Vui lòng chọn ít nhất 1 template');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const data = await automationService.runWorkflow({
                quarter,
                year,
                templateIds: selectedTemplates,
                cascadeToDept,
                cascadeToTeam,
                overrides // Pass overrides to backend
            });

            setResult(data);
            alert(`✅ Thành công!\n🏢 Company: ${data.summary.company}\n🏛️ Department: ${data.summary.department}\n👥 Team: ${data.summary.team}`);
        } catch (err: any) {
            alert('❌ Lỗi: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleCleanup = async () => {
        if (!confirm('⚠️ CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu OKR, KPI và Task hiện tại trong hệ thống!\n\nBạn có chắc chắn muốn tiếp tục không?')) return;

        setIsCleaning(true);
        try {
            // @ts-ignore
            await automationService.cleanupData();
            alert('🧹 Đã xóa sạch dữ liệu! Hệ thống đã được reset.');
            setResult(null);
            setSelectedTemplates([]);
            setOverrides({});
        } catch (err: any) {
            alert('❌ Lỗi khi xóa dữ liệu: ' + (err.message || 'Unknown error'));
        } finally {
            setIsCleaning(false);
        }
    };

    const openEditModal = (template: Template) => {
        const override = overrides[template._id] || {};
        setEditingTemplateId(template._id);
        setEditForm({
            title: override.title || template.title,
            description: override.description || template.description,
            keyResults: override.keyResults || template.suggestedKRs.map((kr: any) => ({ ...kr }))
        });
    };

    const saveEditTemplate = () => {
        if (!editingTemplateId) return;
        setOverrides(prev => ({
            ...prev,
            [editingTemplateId]: { ...editForm }
        }));
        setEditingTemplateId(null);
    };

    const updateKR = (index: number, field: string, value: any) => {
        const newKRs = [...editForm.keyResults];
        newKRs[index] = { ...newKRs[index], [field]: value };
        setEditForm({ ...editForm, keyResults: newKRs });
    };

    const removeKR = (index: number) => {
        const newKRs = editForm.keyResults.filter((_, i) => i !== index);
        setEditForm({ ...editForm, keyResults: newKRs });
    };

    const addKR = () => {
        setEditForm({
            ...editForm,
            keyResults: [...editForm.keyResults, { title: 'New Key Result', targetValue: 100, unit: '%', weight: 1 }]
        });
    };

    return (
        <div className="automation-demo">
            <div className="automation-header">
                <div>
                    <h1>🤖 OKR Automation Demo</h1>
                    <p>Tạo tự động OKRs từ templates có sẵn</p>
                </div>
                <button
                    onClick={handleCleanup}
                    disabled={isCleaning}
                    className="btn-cleanup"
                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: isCleaning ? 0.7 : 1 }}
                >
                    {isCleaning ? '🧹 Đang dọn dẹp...' : '🗑️ Xóa dữ liệu ảo'}
                </button>
            </div>

            <div className="automation-content">
                {/* Settings Panel */}
                <div className="settings-panel">
                    <h2>⚙️ Cài đặt</h2>

                    <div className="form-group">
                        <label>Quý:</label>
                        <select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                            <option value="Q4">Q4</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Năm:</label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            min="2024"
                            max="2030"
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={cascadeToDept}
                                onChange={(e) => setCascadeToDept(e.target.checked)}
                            />
                            <span>Cascade xuống Department</span>
                        </label>
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={cascadeToTeam}
                                onChange={(e) => setCascadeToTeam(e.target.checked)}
                                disabled={!cascadeToDept}
                            />
                            <span>Cascade xuống Team (cần Department)</span>
                        </label>
                    </div>

                    <button
                        className="btn-generate"
                        onClick={handleGenerate}
                        disabled={loading || selectedTemplates.length === 0}
                    >
                        {loading ? '⏳ Đang tạo...' : '🚀 Tạo OKRs'}
                    </button>

                    <div className="selected-count">
                        Đã chọn: <strong>{selectedTemplates.length}</strong> templates
                    </div>
                </div>

                {/* Templates List */}
                <div className="templates-panel">
                    <h2>📋 Chọn Templates</h2>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                            <button onClick={loadTemplates} className="btn-retry">🔄 Thử lại</button>
                        </div>
                    )}

                    {templates.length === 0 && !error && (
                        <div className="empty-state">
                            <p>📭 Không có templates nào. Vui lòng chạy seed script:</p>
                            <code>node scripts/seedTemplates.js</code>
                        </div>
                    )}

                    <div className="templates-list">
                        {templates.map(template => (
                            <div
                                key={template._id}
                                className={`template-card ${selectedTemplates.includes(template._id) ? 'selected' : ''}`}
                                onClick={() => toggleTemplate(template._id)}
                            >
                                <div className="template-header">
                                    <h3>{overrides[template._id]?.title || template.title}</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(template); }}
                                            className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                                        >
                                            EDIT
                                        </button>
                                        <span className={`badge priority-${template.priority.toLowerCase()}`}>
                                            {template.priority}
                                        </span>
                                    </div>
                                </div>

                                <p className="template-description">{template.description}</p>

                                <div className="template-meta">
                                    <span className="badge badge-category">{template.category}</span>
                                    <span className="badge badge-industry">{template.industry}</span>
                                </div>

                                <div className="template-krs">
                                    <strong>Key Results ({template.suggestedKRs.length}):</strong>
                                    <ul>
                                        <ul>
                                            {(overrides[template._id]?.keyResults || template.suggestedKRs).slice(0, 3).map((kr: any, idx: number) => (
                                                <li key={idx}>
                                                    {kr.title} ({kr.targetValue} {kr.unit})
                                                </li>
                                            ))}
                                        </ul>
                                    </ul>
                                </div>

                                <div className="template-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedTemplates.includes(template._id)}
                                        onChange={() => { }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="results-panel">
                    <h2>✅ Kết quả</h2>
                    <div className="results-summary">
                        <div className="result-card">
                            <div className="result-number">{result.summary.company}</div>
                            <div className="result-label">Company OKRs</div>
                        </div>
                        <div className="result-card">
                            <div className="result-number">{result.summary.department}</div>
                            <div className="result-label">Department OKRs</div>
                        </div>
                        <div className="result-card">
                            <div className="result-number">{result.summary.team}</div>
                            <div className="result-label">Team OKRs</div>
                        </div>
                    </div>

                    <div className="results-actions">
                        <a href="/#/okrs?status=DRAFT" className="btn-view-okrs">
                            👀 Xem OKRs đã tạo
                        </a>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTemplateId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg">Chỉnh sửa Template</h3>
                            <button onClick={() => setEditingTemplateId(null)} className="text-slate-400 hover:text-red-500">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Tiêu đề (Objective)</label>
                                <input
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Mô tả</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Key Results</label>
                                    <button onClick={addKR} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">+ Thêm KR</button>
                                </div>
                                <div className="space-y-2">
                                    {editForm.keyResults.map((kr, idx) => (
                                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                                            <input
                                                value={kr.title}
                                                onChange={e => updateKR(idx, 'title', e.target.value)}
                                                className="flex-1 p-1 text-sm border rounded"
                                                placeholder="Title"
                                            />
                                            <input
                                                type="number"
                                                value={kr.targetValue}
                                                onChange={e => updateKR(idx, 'targetValue', parseInt(e.target.value))}
                                                className="w-16 p-1 text-sm border rounded text-center"
                                                placeholder="Target"
                                            />
                                            <input
                                                value={kr.unit}
                                                onChange={e => updateKR(idx, 'unit', e.target.value)}
                                                className="w-12 p-1 text-sm border rounded text-center"
                                                placeholder="Unit"
                                            />
                                            <button onClick={() => removeKR(idx)} className="text-red-400 hover:text-red-600">
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setEditingTemplateId(null)} className="px-4 py-2 text-slate-500 font-bold text-sm">Hủy</button>
                            <button onClick={saveEditTemplate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OKRAutomation;
