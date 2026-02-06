import React from 'react';

// Vì chưa có API lấy blocker riêng lẻ (mới chỉ có aggregate trong HealthScore), 
// ta sẽ giả lập hoặc lấy dữ liệu từ tasks có vấn đề
interface Props {
    // Để đơn giản, ta nhận vào một list các item có blocker problem
    items?: any[];
}

export const BlockerList: React.FC<Props> = ({ items = [] }) => {
    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-lg font-black text-slate-800 flex items-center mb-4">
                <span className="material-icons mr-2 text-rose-500">block</span>
                Top Blockers
            </h3>

            <div className="space-y-3">
                {/* Demo items nếu chưa có real data đủ nhiều */}
                {items.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs font-bold">Không có blocker nghiêm trọng nào.</div>
                )}

                {items.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-start p-3 bg-red-50 rounded-xl border border-red-100">
                        <span className="material-icons text-red-500 text-sm mt-0.5 mr-2">error</span>
                        <div>
                            <div className="text-xs font-bold text-slate-700">{item.title}</div>
                            <div className="text-[10px] text-red-500 font-bold mt-1">
                                {item.riskFactors?.hasBlocker ? 'Đang bị chặn' : 'Nghiêm trọng'}
                            </div>
                        </div>
                        <div className="ml-auto text-[10px] font-bold text-slate-400">
                            {item.ownerName}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
