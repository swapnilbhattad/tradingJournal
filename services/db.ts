import { Trade, BrokerStatus, AppSettings } from '../types';

const DB_NAME = 'TradingJournalDB';
const DB_VERSION = 2;
const STORE_TRADES = 'trades';
const STORE_BROKERS = 'brokers';
const STORE_SETTINGS = 'settings';
const STORE_STRATEGIES = 'strategies';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_TRADES)) {
        db.createObjectStore(STORE_TRADES, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORE_BROKERS)) {
        db.createObjectStore(STORE_BROKERS, { keyPath: 'name' });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_STRATEGIES)) {
        db.createObjectStore(STORE_STRATEGIES, { keyPath: 'id' });
      }
    };
  });
};

// Helper to get transaction
const getStore = async (storeName: string, mode: IDBTransactionMode) => {
  const db = await initDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

// --- TRADES ---

export const getAllTrades = async (): Promise<Trade[]> => {
  const store = await getStore(STORE_TRADES, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveTrade = async (trade: Trade): Promise<void> => {
  const store = await getStore(STORE_TRADES, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(trade);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const updateTrade = saveTrade;

export const saveTradesBulk = async (trades: Trade[]): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_TRADES, 'readwrite');
  const store = tx.objectStore(STORE_TRADES);

  return new Promise((resolve, reject) => {
    trades.forEach(trade => store.put(trade));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const updateTradesBulk = saveTradesBulk;

// --- BROKERS ---

export const getAllBrokers = async (): Promise<BrokerStatus[]> => {
  const store = await getStore(STORE_BROKERS, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveBroker = async (broker: BrokerStatus): Promise<void> => {
  const store = await getStore(STORE_BROKERS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(broker);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- SETTINGS ---

export const getSettings = async (): Promise<AppSettings> => {
  const store = await getStore(STORE_SETTINGS, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get('app_settings');
    request.onsuccess = () => resolve(request.result || {});
    request.onerror = () => reject(request.error);
  });
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const store = await getStore(STORE_SETTINGS, 'readwrite');
  return new Promise((resolve, reject) => {
    // We use a fixed ID 'app_settings' to mimic a singleton settings object
    const request = store.put({ ...settings, id: 'app_settings' });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- STRATEGIES ---

export const getStrategies = async (): Promise<string[]> => {
  const store = await getStore(STORE_STRATEGIES, 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get('user_strategies');
    request.onsuccess = () => resolve(request.result?.list || ['Manual', 'Trend-Following', 'Mean-Reversion', 'Breakout']);
    request.onerror = () => reject(request.error);
  });
};

export const saveStrategies = async (strategies: string[]): Promise<void> => {
  const store = await getStore(STORE_STRATEGIES, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put({ id: 'user_strategies', list: strategies });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};