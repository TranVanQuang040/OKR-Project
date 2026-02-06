import React from 'react';

interface Props {
    data: {
        name: string;
        progress: number;
        healthScore: number;
    }[];
}

export const DepartmentHeatmap: React.FC<Props> = ({ data }) => {
    const getColor = (progress: number) => {
        if (progress >= 80) return 'bg-emerald-500';
        if (progress >= 60) return 'bg-teal-400';
        if (progress >= 40) return 'bg-yellow-400';
        return 'bg-rose-500';
    };

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 h-full flex flex-col">
            <h3 className="text-lg font-black text-slate-800 flex items-center mb-4">
                <span className="material-icons mr-2 text-indigo-500">grid_view</span>
                Department Heatmap
            </h3>

            {/* Scrollable Container */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto flex-1 min-h-0 pr-2 custom-scrollbar">
                {data.map((dept, idx) => (
                    <div key={idx} className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50 hover:shadow-md cursor-pointer transition-all hover:border-indigo-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-slate-600 uppercase break-words w-2/3 line-clamp-2" title={dept.name}>{dept.name}</span>
                            <span className={`w-3 h-3 rounded-full shadow-sm ${getColor(dept.progress)}`}></span>
                        </div>

                        <div className="mt-auto">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">Health Score</div>
                            <div className="flex items-end items-baseline">
                                <span className="text-xl font-black text-slate-700 mr-1">{dept.healthScore}</span>
                                <span className="text-[10px] text-slate-400">/ 100</span>
                            </div>
                        </div>
                    </div>
                ))}
                {data.length === 0 && (
                    <div className="col-span-3 text-center text-slate-400 py-4 text-xs">Chưa có dữ liệu phòng ban.</div>
                )}
            </div>
        </div>
    );
};
