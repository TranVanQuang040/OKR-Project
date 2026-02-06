import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface HealthProps {
    score: number;
    components?: {
        avgProgress: number;
        onTrackRate: number;
        blockerRate: number;
        checkinRate: number;
    };
}

export const HealthScoreCard: React.FC<HealthProps> = ({ score, components }) => {
    // Logic màu sắc
    let color = '#ef4444'; // Red < 50
    if (score >= 70) color = '#10b981'; // Green
    else if (score >= 50) color = '#f59e0b'; // Yellow

    // Data cho chart
    const data = [{ name: 'Score', value: score, fill: color }];

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center">
                        <span className="material-icons mr-2 text-indigo-500">health_and_safety</span>
                        OKR Health Score
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Sức khỏe toàn tổ chức</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black text-white`} style={{ backgroundColor: color }}>
                    {score >= 70 ? 'HEALTHY' : score >= 50 ? 'WARNING' : 'CRITICAL'}
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative z-10 mt-4">
                <div className="w-40 h-40 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart innerRadius="80%" outerRadius="100%" barSize={15} data={data} startAngle={90} endAngle={-270}>
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar background dataKey="value" cornerRadius={10} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-slate-800" style={{ color }}>{score}%</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Total Score</span>
                    </div>
                </div>

                {/* Chỉ số phụ */}
                {components && (
                    <div className="ml-8 grid grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Progress</span>
                            <span className="text-lg font-black text-slate-700">{Math.round(components.avgProgress)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">On Track</span>
                            <span className="text-lg font-black text-slate-700">{Math.round(components.onTrackRate)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Resolve Blocker</span>
                            <span className="text-lg font-black text-slate-700">{Math.round(components.blockerRate)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Check-in</span>
                            <span className="text-lg font-black text-slate-700">{Math.round(components.checkinRate)}%</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Decor background */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-slate-50 rounded-full z-0 opacity-50" />
        </div>
    );
};
