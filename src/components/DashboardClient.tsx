'use client';

import { useState, useRef, useEffect } from 'react';
import TermTooltip from './TermTooltip';
import PerformanceChart from './PerformanceChart';
import CalendarPnL from './CalendarPnL';
import PositionsAccordion from './PositionsAccordion';
import HistoryClient from '../app/history/HistoryClient';
import { calculateAnnualizedROIC } from '@/lib/portfolioUtils';
import { DollarSign, Activity, TrendingUp } from 'lucide-react';

interface DashboardClientProps {
  dict: any;
  summary: any;
  performanceHistory: any[];
  positionsWithLivePrice: any[];
  transactions: any[];
  sp500Data: any[];
  nasdaqData: any[];
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);

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
          {t.tabOverview || '概览'}
        </button>
        <button 
          onClick={() => setActiveTab('positions')}
          className={`flex-1 min-w-[100px] py-3 text-center text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'positions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.tabPositions || '持仓'}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[100px] py-3 text-center text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.tabHistory || '交易记录'}
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                title={<span className="flex items-center">{t.totalPnl} <TermTooltip term={t.totalPnl} explanation={t.exp_totalPnl} /></span>} 
                value={formatCurrency(totalPnL)} 
                isPositive={totalPnL >= 0}
                icon={<DollarSign size={16} />}
                subRealized={formatCurrency(summary.totalRealizedPnL)}
                subUnrealized={formatCurrency(totalUnrealizedPnL)}
                dict={t}
              />
              <MetricCard 
                title={<span className="flex items-center">{t.totalRoic} <TermTooltip term={t.totalRoic} explanation={t.exp_totalRoic} /></span>} 
                value={formatPercent(roic)} 
                isPositive={roic >= 0}
                icon={<Activity size={16} />}
                subRealized={formatPercent(realizedRoic)}
                subUnrealized={formatPercent(unrealizedRoic)}
                dict={t}
              />
              <MetricCard 
                title={<span className="flex items-center">{t.annualizedRoic} <TermTooltip term={t.annualizedRoic} explanation={t.exp_annualizedRoic} /></span>} 
                value={formatPercent(annualizedRoic)} 
                isPositive={annualizedRoic >= 0}
                icon={<TrendingUp size={16} />}
                subRealized={formatPercent(annRealizedRoic)}
                subUnrealized={formatPercent(annUnrealizedRoic)}
                dict={t}
              />
              <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider flex items-center">
                  {t.marginUtilized} <TermTooltip term={t.marginUtilized} explanation={t.exp_marginUtilized} />
                </span>
                <span className="text-xl font-semibold mt-1">{formatCurrency(summary.currentMarginLocked)}</span>
                <span className="text-xs text-muted-foreground mt-1 flex items-center">
                  {t.max}: {formatCurrency(summary.historicalMaxCapitalDeployed)}
                  <TermTooltip term={t.max} explanation={t.exp_max} />
                </span>
              </div>
            </div>

            <PerformanceChart 
              data={performanceHistory} 
              dict={t} 
              sp500Data={sp500Data} 
              nasdaqData={nasdaqData} 
            />
            
            <CalendarPnL 
              data={performanceHistory} 
              dict={t} 
            />
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

function MetricCard({ title, value, isPositive, icon, subRealized, subUnrealized, dict }: { title: React.ReactNode, value: string, isPositive: boolean, icon: React.ReactNode, subRealized?: string, subUnrealized?: string, dict?: any }) {
  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
          <span className="mr-1">{icon}</span>
          {title}
        </div>
        <span className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? '+' : ''}{value}
        </span>
      </div>
      {(subRealized || subUnrealized) && (
        <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span className="opacity-80">{dict?.realizedLabel || 'R:'}</span>
            <span className={`font-medium ${subRealized?.startsWith('-') ? 'text-destructive/80' : 'text-success/80'}`}>
              {!subRealized?.startsWith('-') && subRealized !== '0%' && subRealized !== '$0.00' ? '+' : ''}{subRealized}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-80">{dict?.unrealizedLabel || 'U:'}</span>
            <span className={`font-medium ${subUnrealized?.startsWith('-') ? 'text-destructive/80' : 'text-success/80'}`}>
              {!subUnrealized?.startsWith('-') && subUnrealized !== '0%' && subUnrealized !== '$0.00' ? '+' : ''}{subUnrealized}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
