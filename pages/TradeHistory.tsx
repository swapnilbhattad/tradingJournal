import React, { useState, useMemo } from 'react';
import { useStore } from '../context/Store';
import { Trade, BrokerName, Segment } from '../types';
import { ChevronDown, ChevronUp, Edit2, Save, X, BrainCircuit, Layers, Filter, ArrowUpDown } from 'lucide-react';
import { analyzeTrade } from '../services/geminiService';

interface GroupedTrade {
  id: string; // Composite ID
  date: string;
  symbol: string;
  broker: string;
  totalPnL: number;
  totalQty: number;
  trades: Trade[];
}

type SortField = 'date' | 'symbol' | 'broker' | 'totalPnL' | 'totalQty';
type SortDirection = 'asc' | 'desc';

export const TradeHistory = () => {
  const { trades, updateTrade, updateTradesBulk, strategies } = useStore();
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Filters
  const [filterBroker, setFilterBroker] = useState<BrokerName | 'All'>('All');
  const [filterSegment, setFilterSegment] = useState<Segment | 'All'>('All');
  const [filterStrategy, setFilterStrategy] = useState<string>('All');
  const [filterProductType, setFilterProductType] = useState<string>('All');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Individual Edit State
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Trade>>({});
  
  // Group Edit State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupEditForm, setGroupEditForm] = useState({
    strategy: 'Manual',
    confidence: 5,
    notes: '',
    mistake: ''
  });

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Group trades logic with Filtering and Sorting
  const groupedTrades = useMemo(() => {
    // 1. Filter
    const filteredTrades = trades.filter(t => {
        if (filterBroker !== 'All' && t.broker !== filterBroker) return false;
        if (filterSegment !== 'All' && t.segment !== filterSegment) return false;
        if (filterStrategy !== 'All' && t.strategy !== filterStrategy) return false;
        if (filterProductType !== 'All' && (t.productType || 'Delivery') !== filterProductType) return false;
        return true;
    });

    // 2. Group
    const groups: Record<string, GroupedTrade> = {};

    filteredTrades.forEach(trade => {
      const dateKey = new Date(trade.date).toDateString();
      const groupKey = `${dateKey}_${trade.symbol}_${trade.broker}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          date: trade.date,
          symbol: trade.symbol,
          broker: trade.broker,
          totalPnL: 0,
          totalQty: 0,
          trades: []
        };
      }

      groups[groupKey].trades.push(trade);
      groups[groupKey].totalPnL += trade.pnl;
      groups[groupKey].totalQty += trade.quantity;
    });

    const groupArray = Object.values(groups);

    // 3. Sort
    return groupArray.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        // Date specific comparison
        if (sortField === 'date') {
            valA = new Date(a.date).getTime();
            valB = new Date(b.date).getTime();
        }
        // String comparison for text
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

  }, [trades, filterBroker, filterSegment, filterStrategy, filterProductType, sortField, sortDirection]);

  const toggleGroup = (id: string) => {
    setExpandedGroupId(expandedGroupId === id ? null : id);
  };

  const handleSort = (field: SortField) => {
      if (sortField === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDirection('desc'); // Default new sort to desc
      }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-300" />;
      return sortDirection === 'asc' ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />;
  };

  // --- INDIVIDUAL EDIT HANDLERS ---
  const startEditing = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setEditForm({ ...trade });
  };

  const cancelEditing = () => {
    setEditingTradeId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (editingTradeId && editForm.id) {
      await updateTrade(editForm as Trade);
      setEditingTradeId(null);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // --- GROUP EDIT HANDLERS ---
  const startGroupEditing = (group: GroupedTrade, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling accordion
    setEditingGroupId(group.id);
    
    // Pre-fill with data from the first trade in the group as a baseline
    const firstTrade = group.trades[0];
    setGroupEditForm({
      strategy: firstTrade.strategy,
      confidence: firstTrade.confidence,
      notes: firstTrade.notes === 'Imported via Tradebook CSV' ? '' : firstTrade.notes,
      mistake: firstTrade.mistake || ''
    });
    // Ensure group is expanded so they see what they are editing
    setExpandedGroupId(group.id); 
  };

  const cancelGroupEditing = () => {
    setEditingGroupId(null);
  };

  const saveGroupEdit = async (group: GroupedTrade) => {
    const updatedTrades = group.trades.map(t => ({
      ...t,
      strategy: groupEditForm.strategy,
      confidence: groupEditForm.confidence,
      notes: groupEditForm.notes,
      mistake: groupEditForm.mistake
    }));

    await updateTradesBulk(updatedTrades);
    setEditingGroupId(null);
  };

  const handleGroupEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGroupEditForm(prev => ({ ...prev, [name]: value }));
  };

  const runAnalysis = async (trade: Trade) => {
    setAnalyzingId(trade.id);
    const analysis = await analyzeTrade(trade);
    await updateTrade({ ...trade, aiAnalysis: analysis });
    setAnalyzingId(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Trade History</h2>
          <p className="text-slate-500">Grouped by Day & Symbol.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm px-2">
                <Filter size={16} /> Filters:
            </div>
            <select 
                value={filterBroker} 
                onChange={(e) => setFilterBroker(e.target.value as any)}
                className="text-sm border-slate-200 rounded p-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
                <option value="All">All Brokers</option>
                <option value="Zerodha">Zerodha</option>
                <option value="Fyers">Fyers</option>
                <option value="Dhan">Dhan</option>
                <option value="Angel One">Angel One</option>
            </select>
            <select 
                value={filterSegment} 
                onChange={(e) => setFilterSegment(e.target.value as any)}
                className="text-sm border-slate-200 rounded p-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
                <option value="All">All Segments</option>
                <option value="Equity">Equity</option>
                <option value="F&O">F&O</option>
            </select>
            <select 
                value={filterProductType} 
                onChange={(e) => setFilterProductType(e.target.value)}
                className="text-sm border-slate-200 rounded p-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
                <option value="All">All Types</option>
                <option value="Intraday">Intraday</option>
                <option value="Delivery">Delivery</option>
            </select>
            <select 
                value={filterStrategy} 
                onChange={(e) => setFilterStrategy(e.target.value)}
                className="text-sm border-slate-200 rounded p-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
                <option value="All">All Strategies</option>
                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop Header with Sorting */}
        <div className="hidden md:grid grid-cols-7 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 text-sm">
          <div 
            className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-indigo-600 select-none"
            onClick={() => handleSort('date')}
          >
            Date <SortIcon field="date" />
          </div>
          <div 
            className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-indigo-600 select-none"
            onClick={() => handleSort('symbol')}
          >
            Symbol <SortIcon field="symbol" />
          </div>
          <div 
            className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-indigo-600 select-none"
            onClick={() => handleSort('broker')}
          >
            Broker <SortIcon field="broker" />
          </div>
          <div className="col-span-1 text-center text-slate-400 cursor-default">Executions</div>
          <div 
            className="col-span-1 flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-600 select-none"
            onClick={() => handleSort('totalQty')}
          >
            Total Qty <SortIcon field="totalQty" />
          </div>
          <div 
            className="col-span-1 flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-600 select-none"
            onClick={() => handleSort('totalPnL')}
          >
            Total PnL <SortIcon field="totalPnL" />
          </div>
          <div className="col-span-1 text-center text-slate-400 cursor-default">Actions</div>
        </div>

        {/* Group List */}
        <div className="divide-y divide-slate-100">
          {groupedTrades.map((group) => (
            <div key={group.id} className="transition-colors hover:bg-slate-50">
              
              {/* --- GROUP EDIT FORM --- */}
              {editingGroupId === group.id ? (
                 <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                    <div className="flex justify-between items-center mb-3">
                       <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                         <Layers size={18} /> Batch Edit Journal for {group.symbol} ({group.trades.length} trades)
                       </h3>
                       <div className="flex gap-2">
                         <button onClick={() => saveGroupEdit(group)} className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium flex items-center gap-1"><Save size={14} /> Apply to All</button>
                         <button onClick={cancelGroupEditing} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 text-xs font-medium flex items-center gap-1"><X size={14} /> Cancel</button>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-semibold text-slate-500 uppercase">Strategy (Group)</label>
                           <select name="strategy" value={groupEditForm.strategy} onChange={handleGroupEditChange} className="w-full p-2 border rounded mt-1 text-sm bg-white">
                             {strategies.map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Confidence (Group)</label>
                            <input type="number" name="confidence" max="10" min="1" value={groupEditForm.confidence} onChange={handleGroupEditChange} className="w-full p-2 border rounded mt-1 text-sm bg-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Notes / Reasoning (Applies to entire group)</label>
                            <textarea name="notes" rows={2} value={groupEditForm.notes} onChange={handleGroupEditChange} className="w-full p-2 border rounded mt-1 text-sm bg-white" placeholder="Why did you take this position?"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Mistake (Applies to entire group)</label>
                            <input type="text" name="mistake" value={groupEditForm.mistake} onChange={handleGroupEditChange} className="w-full p-2 border rounded mt-1 text-sm bg-white" placeholder="e.g. FOMO" />
                        </div>
                    </div>
                 </div>
              ) : (
                /* --- GROUP ROW DISPLAY --- */
                <div 
                  onClick={() => toggleGroup(group.id)}
                  className="grid md:grid-cols-7 gap-4 p-4 items-center cursor-pointer group"
                >
                  <div className="md:col-span-1 text-sm text-slate-500 font-medium">
                    {new Date(group.date).toLocaleDateString()}
                  </div>
                  
                  <div className="md:col-span-1 font-bold text-slate-800">
                    {group.symbol}
                    <div className="flex gap-1 mt-1">
                         <span className="md:hidden text-xs font-normal px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                           {group.broker}
                         </span>
                         {/* Product Type Badge */}
                         {group.trades[0].productType === 'Intraday' && (
                             <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wide">Intraday</span>
                         )}
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-1 text-sm text-slate-600">
                      {group.broker}
                      <div className="mt-1">
                        {group.trades[0].productType === 'Intraday' ? (
                             <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wide">Intraday</span>
                         ) : (
                             <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full uppercase tracking-wide">Delivery</span>
                         )}
                      </div>
                  </div>
                  
                  <div className="hidden md:flex md:col-span-1 justify-center items-center gap-1 text-xs text-slate-500">
                    <Layers size={14} /> {group.trades.length} {group.trades.length === 1 ? 'Trade' : 'Trades'}
                  </div>
                  
                  <div className="md:col-span-1 text-right text-sm">
                    <span className="md:hidden text-slate-400 mr-2">Total Qty:</span>
                    {group.totalQty}
                  </div>
                  
                  <div className={`md:col-span-1 text-right font-bold ${group.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {group.totalPnL >= 0 ? '+' : ''}{group.totalPnL.toLocaleString()}
                  </div>

                  <div className="hidden md:flex md:col-span-1 justify-center items-center gap-2 text-slate-400">
                    <button 
                      onClick={(e) => startGroupEditing(group, e)}
                      className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                      title="Edit Journal for Group"
                    >
                      <Edit2 size={16} />
                    </button>
                    {expandedGroupId === group.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              )}

              {/* Expanded Trades List */}
              {expandedGroupId === group.id && !editingGroupId && (
                <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-200">
                  {group.trades.map(trade => (
                    <div key={trade.id} className="p-4 pl-4 md:pl-12">
                      {editingTradeId === trade.id ? (
                        // EDIT MODE (Individual)
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="font-bold text-slate-700 text-xs uppercase">Edit Single Trade Execution</h4>
                             <div className="flex gap-2">
                               <button onClick={saveEdit} className="p-2 bg-green-600 text-white rounded hover:bg-green-700"><Save size={14} /></button>
                               <button onClick={cancelEditing} className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X size={14} /></button>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase">Strategy</label>
                              <select 
                                name="strategy" 
                                value={editForm.strategy} 
                                onChange={handleEditChange}
                                className="w-full p-2 border rounded mt-1 text-sm"
                              >
                                {strategies.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                               <label className="block text-xs font-semibold text-slate-500 uppercase">Confidence (1-10)</label>
                               <input 
                                  type="number" 
                                  name="confidence" 
                                  max="10" 
                                  min="1" 
                                  value={editForm.confidence} 
                                  onChange={handleEditChange}
                                  className="w-full p-2 border rounded mt-1 text-sm"
                               />
                            </div>
                            <div className="md:col-span-2">
                               <label className="block text-xs font-semibold text-slate-500 uppercase">Notes / Reasoning</label>
                               <textarea 
                                  name="notes" 
                                  rows={2} 
                                  value={editForm.notes} 
                                  onChange={handleEditChange}
                                  className="w-full p-2 border rounded mt-1 text-sm"
                                  placeholder="Why did you take this trade?"
                               ></textarea>
                            </div>
                            <div className="md:col-span-2">
                               <label className="block text-xs font-semibold text-slate-500 uppercase">Mistake (Optional)</label>
                               <input 
                                  type="text" 
                                  name="mistake" 
                                  value={editForm.mistake} 
                                  onChange={handleEditChange}
                                  className="w-full p-2 border rounded mt-1 text-sm"
                                  placeholder="e.g. Early Exit, FOMO"
                               />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                           <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded">
                                  {new Date(trade.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className="font-semibold text-slate-700">Execution Details</span>
                              </div>
                              <div className="space-y-1 text-slate-600 pl-2 border-l-2 border-slate-200">
                                <p>Entry: <span className="font-mono font-medium text-slate-800">{trade.entryPrice}</span></p>
                                <p>Exit: <span className="font-mono font-medium text-slate-800">{trade.exitPrice}</span></p>
                                <p>Qty: {trade.quantity}</p>
                                <p>Strategy: <span className="bg-slate-100 px-1 rounded">{trade.strategy}</span></p>
                                <p>Type: <span className="font-medium text-slate-800">{trade.productType || 'Delivery'}</span></p>
                              </div>
                              
                              <div className="mt-4">
                                <button 
                                  onClick={() => startEditing(trade)}
                                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 font-medium"
                                >
                                  <Edit2 size={12} /> Edit Specific Trade
                                </button>
                              </div>
                           </div>
                           
                           <div>
                              <h4 className="font-semibold text-slate-700 mb-2">Analysis & Notes</h4>
                              <p className="italic text-slate-600 mb-2 bg-white p-2 rounded border border-slate-100">
                                "{trade.notes}"
                              </p>
                              {trade.mistake && (
                                <p className="text-red-600 text-xs mb-2"><span className="font-bold">Mistake:</span> {trade.mistake}</p>
                              )}
                              
                              {trade.aiAnalysis ? (
                                <div className="mt-2 p-3 bg-indigo-50 text-indigo-800 rounded border border-indigo-100 text-xs">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold flex items-center gap-1"><BrainCircuit size={12} /> AI Analysis</span>
                                    <button 
                                      onClick={() => runAnalysis(trade)}
                                      disabled={analyzingId === trade.id}
                                      className="text-[10px] underline text-indigo-500 hover:text-indigo-700"
                                    >
                                      {analyzingId === trade.id ? 'Thinking...' : 'Re-analyze'}
                                    </button>
                                  </div>
                                  {trade.aiAnalysis}
                                </div>
                              ) : (
                                <button 
                                  onClick={() => runAnalysis(trade)}
                                  disabled={analyzingId === trade.id}
                                  className="mt-2 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-indigo-200 transition-colors"
                                >
                                  {analyzingId === trade.id ? 'Analyzing...' : <><BrainCircuit size={12} /> Analyze with AI</>}
                                </button>
                              )}
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {groupedTrades.length === 0 && (
             <div className="p-12 text-center text-slate-400">
                No trades match your filter criteria.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};