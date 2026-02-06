import React from 'react';

interface Props {
    definitions?: { score: string; heatmap?: string; blocker?: string };
}

export const InsightCard: React.FC<Props> = ({ definitions }) => {
    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-lg border border-slate-700 text-slate-300">
            <div className="flex items-center mb-4">
                <span className="bg-indigo-500/20 text-indigo-300 p-2 rounded-lg mr-3">
                    <span className="material-icons">lightbulb</span>
                </span>
                <h3 className="text-lg font-bold text-white">Giải thích Chỉ số & Thuật ngữ</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                    <h4 className="text-sm font-black text-emerald-400 mb-2 uppercase tracking-wider flex items-center">
                        <span className="material-icons text-xs mr-1">health_and_safety</span> OKR Health Score
                    </h4>
                    <p className="text-xs leading-relaxed">
                        {definitions?.score || "Điểm sức khỏe tổng hợp (0-100%) được tính dựa trên 4 yếu tố: Tiến độ trung bình (40%), Tỷ lệ đúng hạn (20%), Tỷ lệ giải quyết Blocker (20%) và Tần suất Check-in (20%). Điểm càng cao chứng tỏ tổ chức càng khỏe mạnh."}
                    </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                    <h4 className="text-sm font-black text-indigo-400 mb-2 uppercase tracking-wider flex items-center">
                        <span className="material-icons text-xs mr-1">grid_view</span> Department Heatmap
                    </h4>
                    <p className="text-xs leading-relaxed">
                        {definitions?.heatmap || "Bản đồ nhiệt thể hiện hiệu suất của từng phòng ban. Các ô màu xanh thể hiện phòng ban đang hoạt động tốt (>70%), màu vàng là cảnh báo, và màu đỏ thể hiện sự chậm trễ hoặc gặp nhiều rủi ro cần sự can thiệp của lãnh đạo."}
                    </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                    <h4 className="text-sm font-black text-rose-400 mb-2 uppercase tracking-wider flex items-center">
                        <span className="material-icons text-xs mr-1">block</span> Blockers & Rủi ro
                    </h4>
                    <p className="text-xs leading-relaxed">
                        {definitions?.blocker || "Blockers là các vấn đề, rào cản ngăn cản việc hoàn thành mục tiêu (VD: Thiếu ngân sách, Kỹ thuật khó). At Risk là các OKR đang bị chậm tiến độ so với kế hoạch hoặc không được cập nhật thường xuyên."}
                    </p>
                </div>
            </div>
        </div>
    );
};
