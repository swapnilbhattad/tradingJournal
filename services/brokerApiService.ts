import { BrokerName, Trade } from "../types";

// In a real production app, this would call a backend server which then calls the Broker API.
// Direct browser-to-broker calls are usually blocked by CORS or expose secrets.
// This service simulates that interaction.

export const fetchTradesFromBroker = async (
  brokerName: BrokerName, 
  config: { clientId?: string; accessToken?: string; apiKey?: string }
): Promise<Trade[]> => {
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!config.accessToken) {
    throw new Error("Access Token is missing. Please configure the broker API.");
  }

  // MOCK LOGIC: generate some realistic looking trades based on the "connected" broker
  // This allows the user to test the "One Click Sync" feature without a complex backend.
  const now = new Date();
  const trades: Trade[] = [];

  // Generate 1-3 random trades
  const count = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < count; i++) {
    const isWin = Math.random() > 0.4;
    const symbol = getRandomSymbol();
    const entry = Math.floor(Math.random() * 1000) + 100;
    const exit = isWin ? entry * 1.05 : entry * 0.95;
    const qty = Math.floor(Math.random() * 50) + 10;
    
    trades.push({
      id: `api-${brokerName}-${Date.now()}-${i}`,
      date: new Date(now.getTime() - Math.floor(Math.random() * 86400000)).toISOString(),
      symbol: symbol,
      broker: brokerName,
      entryPrice: parseFloat(entry.toFixed(2)),
      exitPrice: parseFloat(exit.toFixed(2)),
      quantity: qty,
      pnl: parseFloat(((exit - entry) * qty).toFixed(2)),
      segment: 'Equity',
      confidence: 5,
      strategy: 'Manual', // Default for sync
      notes: `Auto-synced from ${brokerName} API`,
      mistake: '',
      aiAnalysis: ''
    });
  }

  return trades;
};

const getRandomSymbol = () => {
  const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'BAJFINANCE'];
  return symbols[Math.floor(Math.random() * symbols.length)];
};