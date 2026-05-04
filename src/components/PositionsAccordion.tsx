'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatUTCDate, calculateAnnualizedROIC, type PortfolioSummary } from '@/lib/portfolioUtils';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { Dict } from '@/lib/i18n';
import TermTooltip from './TermTooltip';
import Link from 'next/link';

interface PositionWithLivePrice {
  symbol: string;
  assetType: 'STOCK' | 'CALL' | 'PUT';
  quantity: number;
  averageCost: number;
  strike?: number | null;
  expiration?: Date | null;
  multiplier: number;
  realizedPnL: number;
  currentPrice: number;
  unrealizedPnL: number;
}

export default function PositionsAccordion({ positions, dict, summary }: { positions: PositionWithLivePrice[], dict: Dict, summary: PortfolioSummary }) {
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});

  const toggleSymbol = (symbol: string) => {
    setExpandedSymbols(prev => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  // Group positions by symbol
  const grouped = positions.reduce((acc, pos) => {
    if (!acc[pos.symbol]) {
      acc[pos.symbol] = { positions: [], unrealizedPnL: 0, realizedPnL: 0, livePrice: pos.currentPrice };
    }
    acc[pos.symbol].positions.push(pos);
    acc[pos.symbol].unrealizedPnL += pos.unrealizedPnL || 0;
    acc[pos.symbol].realizedPnL += pos.realizedPnL || 0;
    // Always prefer the STOCK current price as the livePrice for the symbol if available
    if (pos.assetType === 'STOCK') {
      acc[pos.symbol].livePrice = pos.currentPrice;
    }
    return acc;
  }, {} as Record<string, { positions: PositionWithLivePrice[], unrealizedPnL: number, realizedPnL: number, livePrice: number }>);

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed">
        <p className="text-muted-foreground">{dict.noPositions}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([symbol, group]) => {
        const isExpanded = expandedSymbols[symbol];

        // Pre-compute ROIC values to avoid inline repetition
        const symbolCapital = summary.symbolMaxCapitalDeployed?.[symbol] || 0;
        const symbolRoic = symbolCapital > 0 ? group.realizedPnL / symbolCapital : 0;
        const symbolAnnRoic = calculateAnnualizedROIC(symbolRoic, summary.symbolFirstTradeDate?.[symbol]);

        return (
          <div key={symbol} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-200">
            {/* Accordion Header (Summary) */}
            <div 
              onClick={() => toggleSymbol(symbol)}
              className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <button className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <div>
                  <span className="text-xl font-bold flex items-center gap-2">
                    {symbol}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {dict.livePrice}: {formatCurrency(group.livePrice)}
                  </span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col justify-between items-end gap-1">
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {dict.combinedUnrealized}
                  </span>
                  <span className={`font-medium ${group.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {group.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(group.unrealizedPnL)}
                  </span>
                </div>
              </div>


            </div>

            {/* Accordion Body (Individual Positions) */}
            {isExpanded && (
              <div className="bg-muted/10 border-t border-border p-4 space-y-3">
                {group.positions.map((pos, idx) => (
                  <div key={idx} className="bg-card border border-border p-3 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-4 ml-6 relative">
                    {/* Decorative tree branch line */}
                    <div className="absolute -left-6 top-1/2 w-4 border-t-2 border-border/50"></div>
                    <div className="absolute -left-6 -top-4 h-[calc(50%+1rem)] border-l-2 border-border/50"></div>

                    <div className="flex flex-col">
                      <span className="text-base font-semibold flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          pos.assetType === 'STOCK' ? 'bg-blue-500/20 text-blue-400' :
                          pos.assetType === 'CALL' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {pos.assetType}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground mt-1">
                        {pos.quantity} {Math.abs(pos.quantity) === 1 ? dict.unit : dict.units} @ {formatCurrency(pos.averageCost)}
                        {pos.strike && ` • ${dict.strike}: ${formatCurrency(pos.strike)}`}
                        {pos.expiration && ` • ${dict.exp}: ${formatUTCDate(pos.expiration, 'MMM dd, yyyy')}`}
                      </span>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between items-end gap-1">

                      {pos.assetType === 'STOCK' && (
                        <div className="text-right">
                          <span className="block text-xs text-muted-foreground">{dict.unrealizedPnl}</span>
                          <span className={`font-medium text-sm ${pos.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {pos.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnL)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <select 
                          className="text-xs font-medium bg-muted text-foreground border border-border px-2 py-1.5 rounded-md cursor-pointer outline-none focus:ring-1 focus:ring-primary appearance-none pr-6 relative"
                          style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.65rem auto' }}
                          onChange={(e) => {
                            if (e.target.value) {
                              window.location.href = e.target.value;
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>{dict.action}</option>
                          <option value={`/trade?symbol=${pos.symbol}&assetType=${pos.assetType}&action=BUY${pos.strike ? '&strike=' + pos.strike : ''}${pos.expiration ? '&expiration=' + new Date(pos.expiration).toISOString() : ''}`}>{dict.buy}</option>
                          <option value={`/trade?symbol=${pos.symbol}&assetType=${pos.assetType}&action=SELL${pos.strike ? '&strike=' + pos.strike : ''}${pos.expiration ? '&expiration=' + new Date(pos.expiration).toISOString() : ''}`}>{dict.sell}</option>
                          {pos.assetType !== 'STOCK' && (
                            <>
                              <option value={`/trade?symbol=${pos.symbol}&assetType=${pos.assetType}&action=EXERCISE${pos.strike ? '&strike=' + pos.strike : ''}${pos.expiration ? '&expiration=' + new Date(pos.expiration).toISOString() : ''}`}>{dict.exercise}</option>
                              <option value={`/trade?symbol=${pos.symbol}&assetType=${pos.assetType}&action=ASSIGNMENT${pos.strike ? '&strike=' + pos.strike : ''}${pos.expiration ? '&expiration=' + new Date(pos.expiration).toISOString() : ''}`}>{dict.assignment}</option>
                              <option value={`/trade?symbol=${pos.symbol}&assetType=${pos.assetType}&action=EXPIRATION${pos.strike ? '&strike=' + pos.strike : ''}${pos.expiration ? '&expiration=' + new Date(pos.expiration).toISOString() : ''}`}>{dict.expire}</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
