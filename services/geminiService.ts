import { GoogleGenAI, Type } from "@google/genai";
import { Trade, BrokerName } from "../types";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const analyzeTrade = async (trade: Trade): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Returning mock analysis.");
    return "AI Analysis Unavailable: Please configure your API Key to get real-time feedback. Good job logging the trade!";
  }

  try {
    const isImported = trade.notes.includes("Imported via Tradebook CSV") || trade.notes.trim() === "";
    
    let promptContext = "";
    if (isImported) {
      promptContext = `
        NOTE: This trade was imported from a CSV and lacks user notes.
        Please infer potential reasons for this trade based on the Price Action (Entry: ${trade.entryPrice}, Exit: ${trade.exitPrice}, Direction: ${trade.pnl > 0 ? 'Win' : 'Loss'}).
        - What kind of market move usually corresponds to this outcome?
        - Comment on the Risk/Reward purely based on the numbers.
      `;
    } else {
      promptContext = `
        User Notes: "${trade.notes}"
        Mistake: "${trade.mistake || 'None'}"
        Analyze alignment of confidence vs result and strategy execution.
      `;
    }

    const prompt = `
      Act as a professional senior trading psychology coach and risk manager.
      Analyze this trade execution:
      
      Symbol: ${trade.symbol}
      Broker: ${trade.broker}
      Strategy: ${trade.strategy}
      Entry: ${trade.entryPrice}
      Exit: ${trade.exitPrice}
      Quantity: ${trade.quantity}
      PnL: ${trade.pnl}
      Confidence: ${trade.confidence}/10
      Date: ${trade.date}

      ${promptContext}

      Provide 2-3 sentences of concise, actionable feedback. 
      Do not be overly verbose. Be direct and helpful.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Error generating trade analysis:", error);
    return "Error generating analysis. Please try again later.";
  }
};

export interface SymbolStat {
  symbol: string;
  pnl: number;
  wins: number;
  total: number;
  winRate: number;
}

export const analyzePortfolio = async (stats: SymbolStat[]): Promise<string> => {
  if (!ai) {
    return "AI Analysis Unavailable: Please configure your API Key.";
  }

  try {
    const dataSummary = stats.map(s => 
      `${s.symbol}: PnL ${s.pnl}, Win Rate ${s.winRate}% (${s.wins}/${s.total})`
    ).join('\n');

    const prompt = `
      Act as a hedge fund portfolio manager. Review these trading statistics by asset (Symbol):
      
      ${dataSummary}

      Provide a strategic assessment in bullet points:
      1. **Best Performers**: Which assets are generating alpha?
      2. **Problem Areas**: Which assets are dragging down the portfolio?
      3. **Actionable Advice**: Suggest what to trade more of and what to avoid/review.

      Keep it professional, encouraging, and under 150 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate portfolio analysis.";
  } catch (error) {
    console.error("Error generating portfolio analysis:", error);
    return "Error generating analysis. Please try again later.";
  }
};

export const parseTradebook = async (csvText: string, broker: BrokerName): Promise<Trade[]> => {
  if (!ai) {
    throw new Error("API Key not found");
  }

  try {
    const prompt = `
      You are an expert financial data parser. I have a raw CSV tradebook from a broker (likely ${broker}).
      
      Your task is to:
      1. Parse this CSV data. Ignore top-level metadata headers (like 'Report Title', 'Client Name', etc.) and find the actual data table.
      2. Identify CLOSED TRADES. This means you must match 'BUY' and 'SELL' orders for the same symbol. 
         - Use FIFO (First-In, First-Out) logic if multiple orders exist for the same symbol.
         - If a Buy exists without a Sell (or vice versa), it is an open position: IGNORE IT.
         - Only output trades where a complete entry and exit cycle has occurred.
      3. Calculate the PnL (Profit and Loss) for each matched trade.
      4. Extract standard fields: Date (of the exit), Symbol, Entry Price, Exit Price, Quantity.
      5. Assume strategy is 'Manual' and confidence is 5 (neutral) for imported trades.
      6. Remove any "NSE:" or "BSE:" prefixes or "-EQ" suffixes from symbols (e.g., "NSE:SOUTHBANK-EQ" becomes "SOUTHBANK").
      7. Return a strictly valid JSON array.

      CSV CONTENT:
      ${csvText}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "ISO 8601 date string of the trade exit time" },
              symbol: { type: Type.STRING },
              entryPrice: { type: Type.NUMBER },
              exitPrice: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER },
              pnl: { type: Type.NUMBER },
              segment: { type: Type.STRING, description: "Equity or F&O" },
            },
            required: ["date", "symbol", "entryPrice", "exitPrice", "quantity", "pnl", "segment"]
          }
        }
      }
    });

    const rawTrades = JSON.parse(response.text || "[]");
    
    // Map to application Trade type
    return rawTrades.map((t: any, index: number) => ({
      id: `imported-${Date.now()}-${index}`,
      date: t.date,
      symbol: t.symbol,
      broker: broker,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      quantity: t.quantity,
      pnl: t.pnl,
      segment: t.segment || 'Equity',
      confidence: 5,
      strategy: 'Manual',
      notes: 'Imported via Tradebook CSV',
      mistake: '',
      aiAnalysis: 'Trade imported from broker records.'
    }));

  } catch (error) {
    console.error("Error parsing tradebook:", error);
    throw new Error("Failed to parse tradebook. Ensure CSV format is correct.");
  }
};