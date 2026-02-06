import React, { useState } from 'react';

interface RiskItem {
    _id: string;
    title: string;
    ownerName: string;
    department: string;
    progress: number;
    riskFactors: {
        isBehind: boolean;
        noCheckin: boolean;
        hasBlocker: boolean;
        expectedProgress: number;
    };
    keyResults?: any[];
}

interface Props {
    data: RiskItem[];
}

export const AtRiskTable: React.FC<Props> = ({ data }) => {
    const [selectedItem, setSelectedItem] = useState<RiskItem | null>(null);

    // if (!data || data.length === 0) return null; // Always render to keep layout stable or show empty state

    return (
        <>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full">
                <h3 className="text-lg font-black text-slate-800 flex items-center mb-4">
                    <span className="material-icons mr-2 text-rose-500">warning_amber</span>
                    At-Risk OKRs
                    <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] rounded-full">{data?.length || 0}</span>
                </h3>

                {/* Scrollable Container with Fixed Header */}
                <div className="overflow-y-auto max-h-[260px] pr-2 custom-scrollbar flex-1 relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr>
                                <th className="p-3 text-xs font-black text-slate-400 uppercase border-b border-slate-100">OKR</th>
                                <th className="p-3 text-xs font-black text-slate-400 uppercase border-b border-slate-100">Owner</th>
                                <th className="p-3 text-xs font-black text-slate-400 uppercase border-b border-slate-100">Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data && data.length > 0) ? data.map((item) => (
                                <tr key={item._id}
                                    onClick={() => setSelectedItem(item)}
                                    className="group hover:bg-slate-50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-indigo-500">
                                    <td className="p-3 text-sm font-bold text-slate-700 border-b border-slate-50 max-w-[200px] truncate" title={item.title}>
                                        <div className="flex items-center">
                                            {item.title}
                                            <span className="ml-2 opacity-0 group-hover:opacity-100 material-icons text-xs text-indigo-400">info</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-sm font-medium text-slate-600 border-b border-slate-50">
                                        {/* HARDCODED ADMIN AS REQUESTED */}
                                        ADMIN
                                    </td>
                                    <td className="p-3 border-b border-slate-50">
                                        <div className="flex items-center">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full mr-2 w-12">
                                                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-rose-500">{item.progress}%</span>
                                        </div>
                                        <div className="flex mt-1 gap-1">
                                            {item.riskFactors?.hasBlocker && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Has Blocker"></span>}
                                            {item.riskFactors?.noCheckin && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="No Checkin"></span>}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center text-slate-400 text-xs py-4">Không có OKR nào cần chú ý.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DRILL-DOWN MODAL */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 uppercase tracking-wider">At Risk Detail</span>
                                <h2 className="text-2xl font-black text-slate-800 mt-2 line-clamp-2">{selectedItem.title}</h2>
                                <p className="text-slate-500 font-bold text-sm mt-1 flex items-center">
                                    <span className="material-icons text-sm mr-1">person</span> ADMIN
                                    <span className="mx-2">•</span>
                                    <span className="material-icons text-sm mr-1">apartment</span> {selectedItem.department}
                                </p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Risk Analysis Card */}
                            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 relative overflow-hidden">
                                <h4 className="text-sm font-black text-rose-800 mb-3 uppercase flex items-center relative z-10">
                                    <span className="material-icons mr-2">analytics</span> Why is this at risk?
                                </h4>
                                <ul className="space-y-2 text-sm text-slate-700 relative z-10">
                                    {selectedItem.riskFactors?.isBehind && (
                                        <li className="flex items-start">
                                            <span className="material-icons text-rose-500 text-sm mr-2 mt-0.5">trending_down</span>
                                            <span>Tiến độ thực tế <b>{selectedItem.progress}%</b> thấp hơn dự kiến <b>{selectedItem.riskFactors.expectedProgress}%</b>.</span>
                                        </li>
                                    )}
                                    {selectedItem.riskFactors?.noCheckin && (
                                        <li className="flex items-start">
                                            <span className="material-icons text-orange-500 text-sm mr-2 mt-0.5">history_toggle_off</span>
                                            <span>Không có Check-in nào trong <b>14 ngày qua</b>. Dữ liệu có thể không chính xác.</span>
                                        </li>
                                    )}
                                    {selectedItem.riskFactors?.hasBlocker && (
                                        <li className="flex items-start">
                                            <span className="material-icons text-red-600 text-sm mr-2 mt-0.5">report_problem</span>
                                            <span className="font-bold text-red-700">Đang có Blocker chưa được giải quyết.</span>
                                        </li>
                                    )}
                                </ul>
                                <span className="material-icons absolute -right-5 -bottom-5 text-rose-100 text-[100px] z-0">warning</span>
                            </div>

                            {/* Sub Items / KR (Real Data) */}
                            <div>
                                <h4 className="text-sm font-black text-slate-700 mb-3 uppercase flex items-center">
                                    Chi tiết OKR con / Key Results
                                    <span className="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        {selectedItem.keyResults?.length || 0}
                                    </span>
                                </h4>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedItem.keyResults && selectedItem.keyResults.length > 0 ? (
                                        selectedItem.keyResults.map((kr: any, idx: number) => (
                                            <div key={idx} className={`p-4 border rounded-2xl flex justify-between items-center transition-all
                                        ${kr.progress < 30 ? 'border-rose-100 bg-white hover:bg-rose-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                                                <div>
                                                    <span className="text-sm font-bold text-slate-700 block mb-1">{kr.title}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">{kr.status || 'IN_PROGRESS'}</span>
                                                </div>
                                                <div className="flex flex-col items-end min-w-[60px]">
                                                    <span className={`text-lg font-black ${kr.progress < 30 ? 'text-rose-500' : 'text-indigo-600'}`}>
                                                        {kr.progress}%
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                        <div className={`h-full rounded-full ${kr.progress < 30 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${kr.progress}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-400 text-sm py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            Không có Key Results nào.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button onClick={() => setSelectedItem(null)} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition transform hover:-translate-y-0.5">
                                    Đã Hiểu & Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
