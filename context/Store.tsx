import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Trade, BrokerStatus, AppState, Metrics, BrokerName, AppSettings } from '../types';
import * as db from '../services/db';
import { fetchTradesFromBroker } from '../services/brokerApiService';

const INITIAL_BROKERS_DEFAULT: BrokerStatus[] = [
  { name: 'Zerodha', isConnected: false, lastSync: null },
  { name: 'Fyers', isConnected: false, lastSync: null },
  { name: 'Dhan', isConnected: false, lastSync: null },
  { name: 'Angel One', isConnected: false, lastSync: null },
];

const StoreContext = createContext<AppState | undefined>(undefined);

export const StoreProvider = ({ children }: { children?: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [brokers, setBrokers] = useState<BrokerStatus[]>(INITIAL_BROKERS_DEFAULT);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load data from DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTrades, savedBrokers, savedSettings, savedStrategies] = await Promise.all([
          db.getAllTrades(),
          db.getAllBrokers(),
          db.getSettings(),
          db.getStrategies()
        ]);

        setTrades(savedTrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setSettingsState(savedSettings);
        setStrategies(savedStrategies);

        // Merge saved broker status with default list
        if (savedBrokers.length > 0) {
          const mergedBrokers = INITIAL_BROKERS_DEFAULT.map(def => 
            savedBrokers.find(b => b.name === def.name) || def
          );
          setBrokers(mergedBrokers);
        }
      } catch (error) {
        console.error("Failed to load data from DB:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper to sync to Google Sheets
  const syncToSheet = async (tradesToSync: Trade[]) => {
    if (!settings.googleSheetUrl) return;

    try {
      // We use no-cors because Google Apps Script web apps are opaque
      await fetch(settings.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradesToSync)
      });
      console.log('Synced to Google Sheet');
    } catch (e) {
      console.error('Failed to sync to Google Sheet', e);
    }
  };

  const addTrade = async (trade: Trade) => {
    try {
      await db.saveTrade(trade);
      setTrades(prev => [trade, ...prev]);
      syncToSheet([trade]);
    } catch (error) {
      console.error("Failed to save trade:", error);
    }
  };

  const updateTrade = async (trade: Trade) => {
    try {
      await db.updateTrade(trade);
      setTrades(prev => prev.map(t => t.id === trade.id ? trade : t));
    } catch (error) {
      console.error("Failed to update trade:", error);
    }
  };

  const updateTradesBulk = async (updatedTrades: Trade[]) => {
    try {
      await db.updateTradesBulk(updatedTrades);
      setTrades(prev => {
        const updatesMap = new Map(updatedTrades.map(t => [t.id, t]));
        return prev.map(t => updatesMap.get(t.id) || t);
      });
    } catch (error) {
      console.error("Failed to bulk update trades:", error);
    }
  };

  const importTrades = async (newTrades: Trade[]) => {
    try {
      await db.saveTradesBulk(newTrades);
      setTrades(prev => {
        const combined = [...newTrades, ...prev];
        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      syncToSheet(newTrades);
    } catch (error) {
      console.error("Failed to import trades:", error);
    }
  };

  const toggleBroker = async (name: BrokerName) => {
    const updatedBrokers = brokers.map(b => 
      b.name === name 
        ? { ...b, isConnected: !b.isConnected, lastSync: !b.isConnected ? new Date().toLocaleString() : null } 
        : b
    );
    setBrokers(updatedBrokers);
    const changedBroker = updatedBrokers.find(b => b.name === name);
    if (changedBroker) {
      db.saveBroker(changedBroker).catch(err => console.error("Failed to save broker status:", err));
    }
  };

  const updateBrokerConfig = async (name: BrokerName, config: BrokerStatus['apiConfig']) => {
    const updatedBrokers = brokers.map(b => 
      b.name === name 
        ? { ...b, apiConfig: config }
        : b
    );
    setBrokers(updatedBrokers);
    const changedBroker = updatedBrokers.find(b => b.name === name);
    if (changedBroker) {
      db.saveBroker(changedBroker).catch(err => console.error("Failed to save broker config:", err));
    }
  };

  const syncBroker = async (name: BrokerName) => {
    const broker = brokers.find(b => b.name === name);
    if (!broker || !broker.apiConfig) {
      throw new Error("Broker not configured");
    }

    try {
      const newTrades = await fetchTradesFromBroker(name, broker.apiConfig);
      if (newTrades.length > 0) {
        await importTrades(newTrades);
        // Update last sync time
        const now = new Date().toLocaleString();
        const updatedBrokers = brokers.map(b => 
          b.name === name ? { ...b, lastSync: now } : b
        );
        setBrokers(updatedBrokers);
        db.saveBroker(updatedBrokers.find(b => b.name === name)!);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    }
  };

  const addStrategy = async (strategy: string) => {
    if (!strategies.includes(strategy)) {
      const newStrategies = [...strategies, strategy];
      setStrategies(newStrategies);
      await db.saveStrategies(newStrategies);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await db.saveSettings(newSettings);
      setSettingsState(newSettings);
    } catch (error) {
       console.error("Failed to save settings:", error);
    }
  };

  const getMetrics = (): Metrics => {
    const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
    const winningTrades = trades.filter(t => t.pnl > 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const avgTradeValue = trades.length > 0 ? totalPnL / trades.length : 0;
    
    const today = new Date().toDateString();
    const tradesToday = trades.filter(t => new Date(t.date).toDateString() === today).length;

    const brokerPnL: Record<string, number> = {};
    trades.forEach(t => {
      brokerPnL[t.broker] = (brokerPnL[t.broker] || 0) + t.pnl;
    });
    
    let bestBroker: BrokerName | 'N/A' = 'N/A';
    let maxPnL = -Infinity;
    
    Object.entries(brokerPnL).forEach(([broker, pnl]) => {
      if (pnl > maxPnL) {
        maxPnL = pnl;
        bestBroker = broker as BrokerName;
      }
    });

    return {
      totalPnL,
      winRate,
      avgTradeValue,
      totalTrades: trades.length,
      tradesToday,
      bestBroker
    };
  };

  return (
    <StoreContext.Provider value={{ trades, brokers, strategies, settings, addTrade, updateTrade, updateTradesBulk, importTrades, toggleBroker, updateBrokerConfig, syncBroker, addStrategy, saveSettings, getMetrics }}>
      {!isLoading && children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};