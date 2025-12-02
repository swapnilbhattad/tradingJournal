import React from 'react';
import { useStore } from '../context/Store';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Bar, Legend, BarChart
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity, AlertTriangle, ArrowRight, BarChart3, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard = () => {
  const { getMetrics, trades } = useStore();
  const metrics = getMetrics();

  // 1. Prepare data for Cumulative PnL Chart (Point-by-point trade detail)
  const pnlData = trades
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((trade, index, array) => {
      const cumulativePnL = array.slice(0, index + 1).reduce((sum, t) => sum + t.pnl, 0);
      return {
        date: new Date(trade.date).toLocaleDateString(),
        time: new Date(trade.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pnl: cumulativePnL,
        rawDate: trade.date,
        // Details for Tooltip
        symbol: trade.symbol,
        strategy: trade.strategy,
        confidence: trade.confidence,
        tradePnL: trade.pnl,
        broker: trade.broker
      };
    });

  // 2. Prepare data for Daily PnL vs Trade Count Chart
  const dailyStatsMap = trades.reduce((acc, trade) => {
    const dateKey = new Date(trade.date).toLocaleDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, dailyPnL: 0, tradeCount: 0, rawDate: new Date(trade.date) };
    }
    acc[dateKey].dailyPnL += trade.pnl;
    acc[dateKey].tradeCount += 1;
    return acc;
  }, {} as Record<string, { date: string, dailyPnL: number, tradeCount: number, rawDate: Date }>);

  const dailyStatsData = Object.values(dailyStatsMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  // 3. Broker Distribution
  const brokerDistribution = (Object.values(
    trades.reduce((acc, trade) => {
      acc[trade.broker] = acc[trade.broker] || { name: trade.broker, value: 0 };
      acc[trade.broker].value += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  ) as { name: string; value: number }[]);

  // 4. Product Type Distribution (PnL)
  const productTypePnL = trades.reduce((acc, trade) => {
    const type = trade.productType || 'Delivery';
    acc[type] = (acc[type] || 0) + trade.pnl;
    return acc;
  }, {} as Record<string, number>);

  const productTypeData = Object.entries(productTypePnL).map(([name, pnl]) => ({ name, pnl }));

  // Custom Tooltip for Cumulative Chart
  const CumulativeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-xl text-xs z-50">
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1">{data.date} <span className="text-slate-400 font-normal">at {data.time}</span></p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4"><span className="text-slate-500">Cumulative PnL:</span> <span className={`font-mono font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.pnl.toLocaleString()}</span></p>
            <div className="pt-1 mt-1 border-t border-slate-50">
               <p className="font-semibold text-slate-700 mb-1">{data.symbol} ({data.broker})</p>
               <p className="flex justify-between gap-4"><span className="text-slate-500">Trade PnL:</span> <span className={`font-mono ${data.tradePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.tradePnL > 0 ? '+' : ''}{data.tradePnL}</span></p>
               <p className="flex justify-between gap-4"><span className="text-slate-500">Strategy:</span> <span>{data.strategy}</span></p>
               <p className="flex justify-between gap-4"><span className="text-slate-500">Confidence:</span> <span>{data.confidence}/10</span></p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Daily Chart
  const DailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-xl text-xs z-50">
           <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1">{data.date}</p>
           <p className="flex justify-between gap-4"><span className="text-slate-500">Net PnL:</span> <span className={`font-mono font-bold ${data.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{data.dailyPnL > 0 ? '+' : ''}{data.dailyPnL.toLocaleString()}</span></p>
           <p className="flex justify-between gap-4"><span className="text-slate-500">Trades Taken:</span> <span className="font-bold text-slate-800">{data.tradeCount}</span></p>
        </div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500">Welcome back, Trader.</p>
        </header>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center py-16">
          <div className="max-w-md mx-auto space-y-4">
             <div className="p-4 bg-slate-50 rounded-full inline-block">
                <Target size={48} className="text-slate-400" />
             </div>
             <h3 className="text-xl font-bold text-slate-800">No Trades Yet</h3>
             <p className="text-slate-500">Connect a broker to import your tradebook or manually log your first trade to see analytics.</p>
             <div className="flex gap-4 justify-center pt-4">
                <Link to="/brokers" className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Connect Broker
                </Link>
                <Link to="/new-trade" className="px-5 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
                  New Manual Trade <ArrowRight size={16} />
                </Link>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500">Welcome back, Trader.</p>
      </header>

      {metrics.tradesToday > 5 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-center gap-3 animate-pulse">
          <AlertTriangle className="text-red-500" />
          <div>
            <h3 className="font-bold text-red-700">Overtrading Warning</h3>
            <p className="text-sm text-red-600">You have executed {metrics.tradesToday} trades today. Review your plan.</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total PnL</p>
              <h3 className={`text-2xl font-bold mt-1 ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnL.toLocaleString()}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${metrics.totalPnL >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {metrics.totalPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Win Rate</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">
                {metrics.winRate.toFixed(1)}%
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Target size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Avg Trade</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">
                {Math.round(metrics.avgTradeValue).toLocaleString()}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Activity size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Best Broker</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800 truncate">
                {metrics.bestBroker}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative PnL */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-green-50 rounded text-green-600"><TrendingUp size={18} /></div>
             <h3 className="text-lg font-bold text-slate-800">Cumulative PnL Performance</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} interval="preserveStartEnd" />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} />
                <RechartsTooltip content={<CumulativeTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#16a34a" 
                  strokeWidth={2} 
                  dot={{ r: 3, strokeWidth: 1, fill: '#fff', stroke: '#16a34a' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Broker Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Trades by Broker</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brokerDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {brokerDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {brokerDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600">{entry.name}</span>
                </div>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Daily PnL and Product Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily PnL vs Frequency */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-blue-50 rounded text-blue-600"><BarChart3 size={18} /></div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">Daily PnL vs Trade Count</h3>
                  <p className="text-xs text-slate-500">Correlation between volume and profitability</p>
               </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyStatsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} />
                  <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#64748b'}} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#64748b'}} />
                  <RechartsTooltip content={<DailyTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="dailyPnL" name="Net PnL" fill="#8884d8" barSize={20}>
                    {dailyStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.dailyPnL >= 0 ? '#16a34a' : '#ef4444'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="tradeCount" name="Trade Count" stroke="#f59e0b" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* Performance by Product Type */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
               <div className="p-2 bg-purple-50 rounded text-purple-600"><Clock size={18} /></div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">PnL by Product Type</h3>
                  <p className="text-xs text-slate-500">Intraday vs Delivery Performance</p>
               </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={productTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} />
                    <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#1e293b', fontWeight: 600}} width={80} />
                    <RechartsTooltip 
                       contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                       formatter={(value: number) => [value >= 0 ? `+${value.toLocaleString()}` : value.toLocaleString(), 'Net PnL']}
                    />
                    <Bar dataKey="pnl" barSize={32} radius={[0, 4, 4, 0]}>
                      {productTypeData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#16a34a' : '#ef4444'} />
                      ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};