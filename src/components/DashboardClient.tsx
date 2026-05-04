'use client';

import { useState, useRef } from 'react';
import TermTooltip from './TermTooltip';
import PerformanceChart from './PerformanceChart';
import CalendarPnL from './CalendarPnL';
import PositionsAccordion from './PositionsAccordion';
import HistoryClient from '../app/history/HistoryClient';
import { calculateAnnualizedROIC, type PortfolioSummary, type DailyPerformance } from '@/lib/portfolioUtils';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { Dict } from '@/lib/i18n';
import { DollarSign, Activity, TrendingUp } from 'lucide-react';
import { Transaction } from '@prisma/client';

interface BenchmarkPoint {
  date: Date;
  close: number;
}

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

interface DashboardClientProps {
  dict: Dict;
  summary: PortfolioSummary;
  performanceHistory: DailyPerformance[];
  positionsWithLivePrice: PositionWithLivePrice[];
  transactions: Transaction[];
  sp500Data: BenchmarkPoint[];
  nasdaqData: BenchmarkPoint[];
  totalPnL: number;
  totalUnrealizedPnL: number;
  roic: number;
  annualizedRoic: number;
  lang: string;
}

export default function DashboardClient({
  dict: t,
  summary,
  performanceHistory,
  positionsWithLivePrice,
  transactions,
  sp500Data,
  nasdaqData,
  totalPnL,
  totalUnrealizedPnL,
  roic,
  annualizedRoic,
  lang,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history'>('positions');
  const touchStartX = useRef<number | null>(null);

  const tabs = ['overview', 'positions', 'history'] as const;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;

    // 50px threshold for swipe
    if (Math.abs(deltaX) > 50) {
      const currentIndex = tabs.indexOf(activeTab);
      if (deltaX > 0 && currentIndex < tabs.length - 1) {
        // Swipe Left -> Next Tab
        setActiveTab(tabs[currentIndex + 1]);
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe Right -> Prev Tab
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
    touchStartX.current = null;
  };

  const realizedRoic = summary.historicalMaxCapitalDeployed > 0 ? (summary.totalRealizedPnL / summary.historicalMaxCapitalDeployed) : 0;
  const unrealizedRoic = summary.historicalMaxCapitalDeployed > 0 ? (totalUnrealizedPnL / summary.historicalMaxCapitalDeployed) : 0;
  
  const annRealizedRoic = calculateAnnualizedROIC(realizedRoic, summary.firstTradeDate);
  const annUnrealizedRoic = calculateAnnualizedROIC(unrealizedRoic, summary.firstTradeDate);

  return (
    <div 
      className="w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Tabs Header */}
      <div className="flex border-b border-border mb-6 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[100px] py-3 text-center text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.tabOverview}
        </button>
        <button 
          onClick={() => setActiveTab('positions')}
          className={`flex-1 min-w-[100px] py-3 text-center text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'positions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.tabPositions}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[100px] py-3 text-center text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.tabHistory}
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PerformanceChart 
              data={performanceHistory} 
              dict={t} 
              sp500Data={sp500Data} 
              nasdaqData={nasdaqData} 
              summary={summary}
              totalUnrealizedPnL={totalUnrealizedPnL}
            />

            
            <CalendarPnL 
              data={performanceHistory} 
              dict={t} 
            />
            
            <AssetPerformanceList summary={summary} dict={t} />
          </div>
        )}

        {/* POSITIONS TAB */}
        {activeTab === 'positions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
              <h2 className="text-xl font-semibold">{t.activePositions}</h2>
            </div>
            <PositionsAccordion positions={positionsWithLivePrice} dict={t} summary={summary} />
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <HistoryClient 
              initialTransactions={transactions} 
              lang={lang} 
              isEmbedded={true} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AssetPerformanceList({ summary, dict }: { summary: PortfolioSummary, dict: Dict }) {
  const symbols = Object.keys(summary.symbolRealizedPnL || {}).sort((a, b) => summary.symbolRealizedPnL[b] - summary.symbolRealizedPnL[a]);
  
  if (symbols.length === 0) return null;

  return (
    <div className="bg-card border border-border p-4 md:p-6 rounded-xl shadow-sm mb-6 mt-6">
      <h2 className="text-xl font-bold mb-4">{dict.assetPerformance || '标的表现 (Asset Performance)'}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">{dict.symbol}</th>
              <th className="px-4 py-3 text-right">{dict.realizedPnl}</th>
              <th className="px-4 py-3 text-right">{dict.realizedRoic}</th>
              <th className="px-4 py-3 text-right rounded-tr-lg">{dict.annualizedRoic}</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map(sym => {
              const pnl = summary.symbolRealizedPnL[sym] || 0;
              const maxCap = summary.symbolMaxCapitalDeployed[sym] || 0;
              const roic = maxCap > 0 ? pnl / maxCap : 0;
              
              const hasOpenPosition = summary.positions.some(p => p.symbol === sym);
              const endDate = hasOpenPosition ? new Date() : summary.symbolLastTradeDate[sym];
              const annRoic = calculateAnnualizedROIC(roic, summary.symbolFirstTradeDate[sym], endDate);
              return (
                <tr key={sym} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{sym}</td>
                  <td className={`px-4 py-3 text-right ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                  </td>
                  <td className={`px-4 py-3 text-right ${roic >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatPercent(roic)}
                  </td>
                  <td className={`px-4 py-3 text-right ${annRoic >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatPercent(annRoic)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
