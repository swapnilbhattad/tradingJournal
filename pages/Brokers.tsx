import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../context/Store';
import { CheckCircle2, Wifi, WifiOff, Upload, Loader2, FileSpreadsheet, Settings, RefreshCw, Key } from 'lucide-react';
import { BrokerName } from '../types';
import { parseTradebook } from '../services/geminiService';

export const Brokers = () => {
  const { brokers, toggleBroker, importTrades, settings, saveSettings, updateBrokerConfig, syncBroker } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBroker, setActiveBroker] = useState<BrokerName | null>(null);
  const [processing, setProcessing] = useState(false);
  const [syncingBroker, setSyncingBroker] = useState<BrokerName | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Sheet Settings
  const [sheetUrl, setSheetUrl] = useState('');
  const [showSheetConfig, setShowSheetConfig] = useState(false);

  // API Config State
  const [expandedConfig, setExpandedConfig] = useState<BrokerName | null>(null);
  const [apiForm, setApiForm] = useState({ accessToken: '' });

  useEffect(() => {
    if (settings.googleSheetUrl) {
      setSheetUrl(settings.googleSheetUrl);
    }
  }, [settings]);

  const handleSaveSheetSettings = () => {
    saveSettings({ googleSheetUrl: sheetUrl });
    setStatusMsg({ type: 'success', text: "Google Sheet Webhook URL saved successfully." });
  };

  const handleImportClick = (brokerName: BrokerName) => {
    setActiveBroker(brokerName);
    setStatusMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBroker) return;

    setProcessing(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // Call AI Service
        const importedTrades = await parseTradebook(text, activeBroker);
        
        if (importedTrades.length > 0) {
          importTrades(importedTrades);
          setStatusMsg({ type: 'success', text: `Successfully imported ${importedTrades.length} closed trades from ${file.name}` });
        } else {
          setStatusMsg({ type: 'error', text: "No closed trades identified in file. Ensure there are matching Buy and Sell orders." });
        }
      } catch (error) {
        setStatusMsg({ type: 'error', text: "Failed to parse file. Please try again." });
      } finally {
        setProcessing(false);
        setActiveBroker(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfigClick = (brokerName: BrokerName) => {
    const broker = brokers.find(b => b.name === brokerName);
    setApiForm({ accessToken: broker?.apiConfig?.accessToken || '' });
    setExpandedConfig(expandedConfig === brokerName ? null : brokerName);
  };

  const saveApiConfig = (brokerName: BrokerName) => {
    updateBrokerConfig(brokerName, { accessToken: apiForm.accessToken });
    setExpandedConfig(null);
    setStatusMsg({ type: 'success', text: `${brokerName} API credentials saved.` });
  };

  const handleSyncClick = async (brokerName: BrokerName) => {
    setSyncingBroker(brokerName);
    setStatusMsg(null);
    try {
      await syncBroker(brokerName);
      setStatusMsg({ type: 'success', text: `Successfully synced trades from ${brokerName}.` });
    } catch (error) {
      setStatusMsg({ type: 'error', text: "Sync failed. Check your API credentials." });
    } finally {
      setSyncingBroker(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Connect Brokers</h2>
        <p className="text-slate-500">Manage your broker integrations to sync trades via API or CSV.</p>
      </header>

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept=".csv,.txt" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden" 
      />

      {statusMsg && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
           {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <FileSpreadsheet size={20} />}
           {statusMsg.text}
        </div>
      )}

      {processing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-center gap-3">
          <Loader2 className="animate-spin" />
          <div>
             <span className="font-bold">Analyzing Tradebook...</span>
             <p className="text-xs text-blue-600">AI is matching orders (FIFO) to calculate PnL...</p>
          </div>
        </div>
      )}

      {/* Google Sheets Config Section */}
      <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm mb-6">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowSheetConfig(!showSheetConfig)}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <FileSpreadsheet size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Google Sheets Sync</h3>
                    <p className="text-sm text-slate-500">Automatically backup new trades to a Google Sheet.</p>
                </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
                <Settings size={20} />
            </button>
        </div>

        {showSheetConfig && (
            <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Google Apps Script Webhook URL</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..." 
                        className="flex-1 p-2 border rounded text-sm font-mono text-slate-600"
                    />
                    <button 
                        onClick={handleSaveSheetSettings}
                        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
                    >
                        Save
                    </button>
                </div>
                
                <div className="mt-4 bg-slate-50 p-4 rounded text-xs text-slate-600 space-y-2 font-mono">
                    <p className="font-bold text-slate-800">Setup Instructions:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Create a new Google Sheet.</li>
                        <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
                        <li>Paste the code provided in documentation.</li>
                        <li>Deploy as Web App and set access to 'Anyone'.</li>
                    </ol>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brokers.map((broker) => (
          <div 
            key={broker.name} 
            className={`p-6 rounded-xl border transition-all duration-200 flex flex-col ${
              broker.isConnected 
                ? 'bg-green-50 border-green-200 shadow-sm' 
                : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{broker.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Status: <span className={broker.isConnected ? 'text-green-600 font-medium' : 'text-slate-400'}>
                      {broker.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </p>
                  {broker.isConnected && broker.lastSync && (
                    <p className="text-xs text-slate-400 mt-1">Synced: {broker.lastSync}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${broker.isConnected ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                  {broker.isConnected ? <Wifi size={24} /> : <WifiOff size={24} />}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                 <button
                  onClick={() => toggleBroker(broker.name)}
                  className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    broker.isConnected
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {broker.isConnected ? (
                    <>
                      <CheckCircle2 size={18} />
                      Connected
                    </>
                  ) : (
                    `Connect ${broker.name}`
                  )}
                </button>

                {broker.isConnected && (
                   <div className="grid grid-cols-2 gap-2">
                     <button
                       disabled={processing}
                       onClick={() => handleImportClick(broker.name)}
                       className="py-2.5 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors"
                     >
                       <Upload size={16} />
                       CSV Import
                     </button>
                     <button
                       onClick={() => handleConfigClick(broker.name)}
                       className="py-2.5 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors"
                     >
                       <Key size={16} />
                       API Config
                     </button>
                   </div>
                )}
              </div>

              {/* API Configuration Panel */}
              {expandedConfig === broker.name && (
                <div className="mt-4 pt-4 border-t border-slate-200 animate-in slide-in-from-top-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Access Token / API Key</label>
                  <input 
                    type="password" 
                    value={apiForm.accessToken}
                    onChange={(e) => setApiForm({ ...apiForm, accessToken: e.target.value })}
                    className="w-full p-2 border rounded text-sm mb-2"
                    placeholder="Paste token here..."
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => saveApiConfig(broker.name)}
                      className="flex-1 bg-slate-800 text-white py-1.5 rounded text-xs font-bold hover:bg-slate-700"
                    >
                      Save Credentials
                    </button>
                  </div>
                </div>
              )}

              {/* One Click Sync Button */}
              {broker.isConnected && broker.apiConfig?.accessToken && (
                <div className="mt-3 pt-3 border-t border-green-100">
                  <button
                    onClick={() => handleSyncClick(broker.name)}
                    disabled={syncingBroker === broker.name}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-70"
                  >
                    {syncingBroker === broker.name ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {syncingBroker === broker.name ? 'Syncing...' : 'One-Click Sync'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};