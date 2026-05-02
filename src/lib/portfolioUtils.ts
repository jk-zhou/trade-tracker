import { Transaction } from '@prisma/client';
import { differenceInDays, format } from 'date-fns';

export interface Position {
  symbol: string;
  assetType: 'STOCK' | 'CALL' | 'PUT';
  quantity: number;
  averageCost: number; // For options, negative means premium received (short)
  strike?: number | null;
  expiration?: Date | null;
  multiplier: number;
  realizedPnL: number;
}

export interface PortfolioSummary {
  positions: Position[];
  totalRealizedPnL: number;
  historicalMaxCapitalDeployed: number;
  currentMarginLocked: number;
  firstTradeDate: Date | null;
}

// Helper to uniquely identify an option contract or stock
const getPositionKey = (t: Transaction) => {
  if (t.assetType === 'STOCK') return `${t.symbol}-STOCK`;
  const exp = t.expiration ? t.expiration.toISOString().split('T')[0] : 'NO_EXP';
  return `${t.symbol}-${t.assetType}-${t.strike}-${exp}`;
};

export function analyzePortfolio(transactions: Transaction[]): PortfolioSummary {
  // Ensure transactions are chronologically sorted
  const sorted = [...transactions].sort((a, b) => a.tradeDate.getTime() - b.tradeDate.getTime());

  const positions = new Map<string, Position>();
  let totalRealizedPnL = 0;
  let maxCapitalDeployed = 0;

  for (const t of sorted) {
    const key = getPositionKey(t);
    const pos = positions.get(key) || {
      symbol: t.symbol,
      assetType: t.assetType as 'STOCK' | 'CALL' | 'PUT',
      quantity: 0,
      averageCost: 0,
      strike: t.strike,
      expiration: t.expiration,
      multiplier: t.multiplier,
      realizedPnL: 0,
    };

    // Calculate effect on position
    if (t.assetType === 'STOCK') {
      if (t.quantity > 0) {
        // Buy stock
        const totalCost = (pos.quantity * pos.averageCost) + (t.quantity * t.price) + t.fees;
        pos.quantity += t.quantity;
        pos.averageCost = totalCost / pos.quantity;
      } else {
        // Sell stock
        const sellQty = Math.abs(t.quantity);
        const pnl = ((t.price - pos.averageCost) * sellQty) - t.fees;
        pos.quantity += t.quantity; // quantity is negative for sell
        pos.realizedPnL += pnl;
        totalRealizedPnL += pnl;
        if (pos.quantity === 0) pos.averageCost = 0;
      }
    } else {
      // Options (CALL/PUT)
      if (Math.sign(pos.quantity) === Math.sign(t.quantity) || pos.quantity === 0) {
        // Opening or adding to position
        const tradeCost = (t.price * t.multiplier * t.quantity) + t.fees * Math.sign(t.quantity);
        const totalCost = (pos.quantity * pos.averageCost) + tradeCost;
        pos.quantity += t.quantity;
        pos.averageCost = totalCost / pos.quantity;
      } else {
        // Closing position
        const closeQty = Math.abs(t.quantity);
        // Cost basis of the closed portion
        const costBasisOfClosed = (pos.averageCost / Math.abs(pos.quantity)) * closeQty * Math.sign(pos.quantity);
        // Proceeds/Cost of closing trade
        const closingTradeValue = t.price * t.multiplier * t.quantity; 
        
        // PnL: if we were short (- qty), closing is buying (+ qty). 
        // PnL = Initial Premium Received (which is negative costBasis) - Premium Paid to close - fees
        // Mathematically: -(costBasisOfClosed) - closingTradeValue - t.fees
        const pnl = -(costBasisOfClosed) - closingTradeValue - t.fees;
        
        pos.quantity += t.quantity;
        pos.realizedPnL += pnl;
        totalRealizedPnL += pnl;
        if (pos.quantity === 0) pos.averageCost = 0;
      }
    }

    positions.set(key, pos);

    // Calculate simultaneous capital deployed at this moment
    let currentCapitalDeployed = 0;
    let currentMargin = 0;
    for (const [_, p] of positions) {
      if (p.quantity === 0) continue;
      
      if (p.assetType === 'STOCK' && p.quantity > 0) {
        currentCapitalDeployed += p.quantity * p.averageCost;
      } else if (p.assetType === 'PUT' && p.quantity < 0) {
        // Short put margin = Strike * 100 * contracts
        const margin = (p.strike || 0) * p.multiplier * Math.abs(p.quantity);
        currentMargin += margin;
        currentCapitalDeployed += margin;
      }
      // Note: Covered calls (Short Call) are covered by stock, so they don't lock additional margin in a cash/basic margin account
    }

    if (currentCapitalDeployed > maxCapitalDeployed) {
      maxCapitalDeployed = currentCapitalDeployed;
    }
  }

  // Current Margin calculation (only active positions)
  let currentMarginLocked = 0;
  const activePositions: Position[] = [];
  for (const [_, p] of positions) {
    if (p.quantity !== 0) {
      activePositions.push(p);
      if (p.assetType === 'PUT' && p.quantity < 0) {
        currentMarginLocked += (p.strike || 0) * p.multiplier * Math.abs(p.quantity);
      }
    }
  }

  const firstTradeDate = sorted.length > 0 ? sorted[0].tradeDate : null;

  return {
    positions: activePositions,
    totalRealizedPnL,
    historicalMaxCapitalDeployed: maxCapitalDeployed,
    currentMarginLocked,
    firstTradeDate,
  };
}

export function calculateAnnualizedROIC(roic: number, firstTradeDate: Date | null): number {
  if (!firstTradeDate) return 0;
  const days = differenceInDays(new Date(), firstTradeDate);
  if (days <= 0) return roic * 365; // prevent infinity
  return roic * (365 / days);
}

export function formatUTCDate(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return format(localDate, formatStr);
}
