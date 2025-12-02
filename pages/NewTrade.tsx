import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { BrokerName, Segment, Trade } from '../types';
import { analyzeTrade } from '../services/geminiService';
import { Loader2, BrainCircuit, CheckCircle, Plus } from 'lucide-react';

export const NewTrade = () => {
  const { addTrade, strategies, addStrategy } = useStore();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAddingStrategy, setIsAddingStrategy] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');

  const [formData, setFormData] = useState({
    broker: 'Zerodha' as BrokerName,
    symbol: '',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    segment: 'Equity' as Segment,
    confidence: 5,
    strategy: 'Manual',
    notes: '',
    mistake: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'strategy' && value === 'ADD_NEW') {
      setIsAddingStrategy(true);
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStrategy = () => {
    if (newStrategyName.trim()) {
      addStrategy(newStrategyName.trim());
      setFormData(prev => ({ ...prev, strategy: newStrategyName.trim() }));
      setNewStrategyName('');
      setIsAddingStrategy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const qty = parseInt(formData.quantity);
    const pnl = (exit - entry) * qty;

    const newTrade: Trade = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      symbol: formData.symbol.toUpperCase(),
      broker: formData.broker,
      entryPrice: entry,
      exitPrice: exit,
      quantity: qty,
      pnl: pnl,
      segment: formData.segment,
      confidence: formData.confidence,
      strategy: formData.strategy,
      notes: formData.notes,
      mistake: formData.mistake
    };

    // AI Call
    const analysis = await analyzeTrade(newTrade);
    newTrade.aiAnalysis = analysis;

    addTrade(newTrade);
    setFeedback(analysis);
    setLoading(false);
    
    // Reset form mostly, keep broker/segment
    setFormData(prev => ({
      ...prev,
      symbol: '',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      confidence: 5,
      notes: '',
      mistake: ''
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">New Journal Entry</h2>
        <p className="text-slate-500">Log your trade details to get instant AI analysis.</p>
      </header>

      {feedback && (
        <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-900 mb-2">AI Trade Analysis</h3>
              <p className="text-indigo-800 leading-relaxed text-sm md:text-base">{feedback}</p>
              <div className="mt-4 flex items-center gap-2 text-indigo-600 text-sm font-medium">
                <CheckCircle size={16} />
                <span>Trade saved successfully</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Broker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Broker</label>
            <select
              name="broker"
              value={formData.broker}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            >
              <option value="Zerodha">Zerodha</option>
              <option value="Fyers">Fyers</option>
              <option value="Dhan">Dhan</option>
              <option value="Angel One">Angel One</option>
            </select>
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Symbol</label>
            <input
              type="text"
              name="symbol"
              required
              placeholder="e.g., RELIANCE"
              value={formData.symbol}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none uppercase"
            />
          </div>

          {/* Entry & Exit */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Entry Price</label>
            <input
              type="number"
              step="0.05"
              name="entryPrice"
              required
              value={formData.entryPrice}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Exit Price</label>
            <input
              type="number"
              step="0.05"
              name="exitPrice"
              required
              value={formData.exitPrice}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Quantity & Segment */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Quantity</label>
            <input
              type="number"
              name="quantity"
              required
              value={formData.quantity}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Segment</label>
            <select
              name="segment"
              value={formData.segment}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="Equity">Equity</option>
              <option value="F&O">F&O</option>
            </select>
          </div>
        </div>

        {/* Confidence Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-700">Confidence Level</label>
            <span className="text-sm font-bold text-green-600">{formData.confidence}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            name="confidence"
            value={formData.confidence}
            onChange={handleChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
        </div>

        {/* Strategy (Dynamic) */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Strategy</label>
          {!isAddingStrategy ? (
            <select
              name="strategy"
              value={formData.strategy}
              onChange={handleChange}
              className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            >
              {strategies.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Strategy</option>
            </select>
          ) : (
            <div className="flex gap-2">
               <input 
                 type="text" 
                 autoFocus
                 placeholder="Enter strategy name"
                 value={newStrategyName}
                 onChange={(e) => setNewStrategyName(e.target.value)}
                 className="flex-1 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
               />
               <button 
                 type="button" 
                 onClick={handleAddStrategy}
                 className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700"
               >
                 <CheckCircle size={20} />
               </button>
               <button 
                 type="button" 
                 onClick={() => setIsAddingStrategy(false)}
                 className="bg-slate-200 text-slate-600 p-3 rounded-lg hover:bg-slate-300"
               >
                 <Plus size={20} className="rotate-45" />
               </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Why did you take this trade?</label>
          <textarea
            name="notes"
            required
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="Setup details, market conditions..."
          ></textarea>
        </div>

        {/* Mistakes */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Did anything go wrong? (Optional)</label>
          <input
            type="text"
            name="mistake"
            value={formData.mistake}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="e.g., FOMO, Late Entry, Exited too early"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Analyzing...
            </>
          ) : (
            'Save Trade & Get Analysis'
          )}
        </button>
      </form>
    </div>
  );
};