export type BrokerName = 'Zerodha' | 'Fyers' | 'Dhan' | 'Angel One';
export type Segment = 'Equity' | 'F&O';
export type Strategy = string;

export interface Trade {
  id: string;
  date: string; // ISO string
  symbol: string;
  broker: BrokerName;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  segment: Segment;
  productType?: 'Intraday' | 'Delivery'; // New field for analytics
  confidence: number; // 1-10
  strategy: Strategy;
  notes: string;
  mistake?: string;
  aiAnalysis?: string;
}

export interface BrokerStatus {
  name: BrokerName;
  isConnected: boolean;
  lastSync: string | null;
  apiConfig?: {
    clientId?: string;
    accessToken?: string;
    apiKey?: string;
  };
}

export interface AppSettings {
  googleSheetUrl?: string;
}

export interface AppState {
  trades: Trade[];
  brokers: BrokerStatus[];
  strategies: string[];
  settings: AppSettings;
  addTrade: (trade: Trade) => void;
  updateTrade: (trade: Trade) => Promise<void>;
  updateTradesBulk: (trades: Trade[]) => Promise<void>;
  importTrades: (trades: Trade[]) => void;
  toggleBroker: (name: BrokerName) => void;
  updateBrokerConfig: (name: BrokerName, config: BrokerStatus['apiConfig']) => void;
  syncBroker: (name: BrokerName) => Promise<void>;
  addStrategy: (strategy: string) => void;
  saveSettings: (settings: AppSettings) => void;
  getMetrics: () => Metrics;
}

export interface Metrics {
  totalPnL: number;
  winRate: number;
  avgTradeValue: number;
  totalTrades: number;
  tradesToday: number;
  bestBroker: BrokerName | 'N/A';
}