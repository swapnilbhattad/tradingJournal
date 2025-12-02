import React, { useState, useMemo } from 'react';
import { useStore } from '../context/Store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzePortfolio, SymbolStat } from '../services/geminiService';
import { BrainCircuit, Loader2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export const Analysis = () => {
    const { trades } = useStore();
    const [loading, setLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    
    // Date Range State
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
        start: '',
        end: ''
    });

    // 1. Filter trades by date
    const filteredTrades = useMemo(() => {
        if (!dateRange.start && !dateRange.end) return trades;

        const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
        const end = dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Infinity; // Add 1 day to include end date

        return trades.filter(t => {
            const tradeDate = new Date(t.date).getTime();
            return tradeDate >= start && tradeDate <= end;
        });
    }, [trades, dateRange]);

    // 2. Calculate Win Rate & Stats per Strategy
    const strategyStats = filteredTrades.reduce((acc, trade) => {
        if (!acc[trade.strategy]) {
            acc[trade.strategy] = { name: trade.strategy, wins: 0, total: 0, totalPnL: 0, totalConfidence: 0 };
        }
        acc[trade.strategy].total += 1;
        acc[trade.strategy].totalPnL += trade.pnl;
        acc[trade.strategy].totalConfidence += trade.confidence;
        if (trade.pnl > 0) acc[trade.strategy].wins += 1;
        return acc;
    }, {} as Record<string, { name: string; wins: number; total: number; totalPnL: number; totalConfidence: number }>);

    const chartData = (Object.values(strategyStats) as any[]).map(s => ({
        name: s.name,
        winRate: Math.round((s.wins / s.total) * 100),
        avgConfidence: (s.totalConfidence / s.total).toFixed(1),
        totalPnL: s.totalPnL
    }));

    // 3. Calculate Stats per Symbol
    const symbolStatsRaw = filteredTrades.reduce((acc, trade) => {
        if (!acc[trade.symbol]) {
            acc[trade.symbol] = { symbol: trade.symbol, pnl: 0, wins: 0, total: 0 };
        }
        acc[trade.symbol].total += 1;
        acc[trade.symbol].pnl += trade.pnl;
        if (trade.pnl > 0) acc[trade.symbol].wins += 1;
        return acc;
    }, {} as Record<string, { symbol: string; pnl: number; wins: number; total: number }>);

    const symbolData: SymbolStat[] = (Object.values(symbolStatsRaw) as { symbol: string; pnl: number; wins: number; total: number }[]).map(s => ({
        ...s,
        winRate: Math.round((s.wins / s.total) * 100)
    })).sort((a, b) => b.pnl - a.pnl);

    const handleGenerateAnalysis = async () => {
        setLoading(true);
        const feedback = await analyzePortfolio(symbolData);
        setAiFeedback(feedback);
        setLoading(false);
    };

    // Custom Tooltip for Strategy Chart
    const StrategyTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-xl text-xs z-50">
                    <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1">{data.name}</p>
                    <p className="flex justify-between gap-4"><span className="text-slate-500">Win Rate:</span> <span className="font-bold">{data.winRate}%</span></p>
                    <p className="flex justify-between gap-4"><span className="text-slate-500">Avg Confidence:</span> <span>{data.avgConfidence}/10</span></p>
                    <p className="flex justify-between gap-4"><span className="text-slate-500">Total PnL:</span> <span className={`font-mono ${data.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.totalPnL > 0 ? '+' : ''}{data.totalPnL.toLocaleString()}</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-12">
             <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Performance Analysis</h2>
                    <p className="text-slate-500">Deep dive into your trading patterns.</p>
                </div>
                
                {/* Date Range Picker */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <Calendar size={16} className="text-slate-400 ml-2" />
                    <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="text-sm bg-transparent outline-none text-slate-600"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="text-sm bg-transparent outline-none text-slate-600"
                    />
                    {(dateRange.start || dateRange.end) && (
                        <button 
                            onClick={() => setDateRange({ start: '', end: '' })}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategy Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4">Win Rate by Strategy</h3>
                    <div className="flex-1 min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 10}} 
                                    interval={0} 
                                    angle={-45}
                                    textAnchor="end"
                                />
                                <YAxis />
                                <Tooltip content={<StrategyTooltip />} cursor={{fill: '#f1f5f9'}} />
                                <Bar dataKey="winRate" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Win Rate %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Symbol Analysis Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-96">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Symbol Performance</h3>
                        <button 
                            onClick={handleGenerateAnalysis}
                            disabled={loading || symbolData.length === 0}
                            className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                            {loading ? 'Analyzing...' : 'Ask AI Insights'}
                        </button>
                    </div>

                    {aiFeedback ? (
                        <div className="flex-1 overflow-y-auto pr-2">
                             <div className="p-4 bg-indigo-50 text-indigo-900 rounded-lg border border-indigo-100 text-sm leading-relaxed whitespace-pre-line">
                                <strong className="block text-indigo-700 mb-2 flex items-center gap-2">
                                    <BrainCircuit size={16} /> Portfolio Intelligence
                                </strong>
                                {aiFeedback}
                            </div>
                            <button 
                                onClick={() => setAiFeedback(null)}
                                className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline w-full text-center"
                            >
                                View Table
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-2">
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="text-left pb-2 font-normal">Symbol</th>
                                        <th className="text-right pb-2 font-normal">Win Rate</th>
                                        <th className="text-right pb-2 font-normal">PnL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {symbolData.map((stat) => (
                                        <tr key={stat.symbol}>
                                            <td className="py-2.5 font-medium text-slate-700">{stat.symbol}</td>
                                            <td className="py-2.5 text-right">
                                                <span className={`px-2 py-0.5 rounded text-xs ${stat.winRate >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {stat.winRate}%
                                                </span>
                                            </td>
                                            <td className={`py-2.5 text-right font-bold ${stat.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {stat.pnl >= 0 ? '+' : ''}{stat.pnl.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {symbolData.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="text-center py-8 text-slate-400">
                                                No trades found in selected range.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Most Traded</p>
                        <p className="font-bold text-slate-800 text-lg">{symbolData[0]?.symbol || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <TrendingUp size={20} />
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Most Profitable</p>
                        <p className="font-bold text-green-600 text-lg">{symbolData[0]?.pnl > 0 ? symbolData[0].symbol : 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <TrendingUp size={20} />
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Biggest Loser</p>
                        <p className="font-bold text-red-600 text-lg">{symbolData[symbolData.length - 1]?.pnl < 0 ? symbolData[symbolData.length - 1].symbol : 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <TrendingDown size={20} />
                    </div>
                 </div>
            </div>
        </div>
    );
}