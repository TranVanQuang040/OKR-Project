import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Props {
    okrId: string;
}

export const ExpectedVsActualChart: React.FC<Props> = ({ okrId }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch data from new API
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('okr_auth_token');
                const res = await fetch(`/api/analytics/progress-comparison/${okrId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();

                // Merge expected and actual for chart
                // Logic merge đơn giản: dùng list dài nhất hoặc merge theo date
                // MVP: Chỉ hiển thị các điểm mốc chính nếu data phức tạp
                // Ở đây ta giả định json trả về 2 array, ta cần map về 1 array chung

                // Xử lý dữ liệu sample cho demo nếu API chưa có data thực tế
                if (json.expectedSeries && json.actualSeries) {
                    const merged = json.expectedSeries.map((e: any, i: number) => ({
                        name: new Date(e.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                        Expected: e.value,
                        Actual: json.actualSeries[i] ? json.actualSeries[i].value : null
                    }));
                    // Nếu actual dài hơn (checkin nhiều hơn expected points), cần logic phức tạp hơn.
                    // Tạm thời hiển thị demo 2 endpoints Start/End
                    setData(merged);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (okrId) fetchData();
    }, [okrId]);

    if (loading) return <div className="h-40 bg-slate-50 animate-pulse rounded-xl"></div>;

    return (
        <div className="h-[200px] w-full mt-4">
            <p className="text-xs font-bold text-slate-400 mb-2">Tiến độ: Dự kiến vs Thực tế</p>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Expected" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Actual" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
