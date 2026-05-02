'use client';

import { useState, useMemo } from 'react';
import { DailyPerformance } from '@/lib/portfolioUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

interface BenchmarkPoint {
  date: Date;
  close: number;
}

export default function PerformanceChart({ 
  data, 
  dict,
  sp500Data,
  nasdaqData
}: { 
  data: DailyPerformance[], 
  dict: any,
  sp500Data?: BenchmarkPoint[],
  nasdaqData?: BenchmarkPoint[]
}) {
  const [timeSpan, setTimeSpan] = useState<'1W' | '1M' | 'YTD' | '1Y' | 'ALL'>('1W');
  const [showSp500, setShowSp500] = useState(false);
  const [showNasdaq, setShowNasdaq] = useState(false);

  const mergedData = useMemo(() => {
    if (data.length === 0) return [];
    
    const sp500Map = new Map();
    const nasdaqMap = new Map();
    
    const toYMD = (d: any) => new Date(d).toISOString().split('T')[0];
    
    if (sp500Data?.length) {
      sp500Data.forEach(d => sp500Map.set(toYMD(d.date), d.close));
    }
    if (nasdaqData?.length) {
      nasdaqData.forEach(d => nasdaqMap.set(toYMD(d.date), d.close));
    }

    const firstSp500 = sp500Data?.[0]?.close || 1;
    const firstNasdaq = nasdaqData?.[0]?.close || 1;

    let lastSp500Return = 0;
    let lastNasdaqReturn = 0;

    return data.map(d => {
      if (sp500Map.has(d.date)) lastSp500Return = (sp500Map.get(d.date) / firstSp500) - 1;
      if (nasdaqMap.has(d.date)) lastNasdaqReturn = (nasdaqMap.get(d.date) / firstNasdaq) - 1;

      return {
        ...d,
        sp500Return: lastSp500Return,
        nasdaqReturn: lastNasdaqReturn,
      };
    });
  }, [data, sp500Data, nasdaqData]);

  const filteredData = useMemo(() => {
    if (mergedData.length === 0) return [];
    const now = new Date();
    
    return mergedData.filter(d => {
      const date = new Date(d.timestamp);
      if (timeSpan === 'ALL') return true;
      if (timeSpan === 'YTD') return date.getFullYear() === now.getFullYear();
      
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
      if (timeSpan === '1W') return diffDays <= 7;
      if (timeSpan === '1M') return diffDays <= 30;
      if (timeSpan === '1Y') return diffDays <= 365;
      
      return true;
    });
  }, [mergedData, timeSpan]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border p-4 md:p-6 rounded-xl shadow-sm mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold">{dict.performanceChart || 'Performance'}</h2>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input 
                type="checkbox" 
                checked={showSp500} 
                onChange={e => setShowSp500(e.target.checked)} 
                className="rounded border-border bg-background text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              S&P 500
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input 
                type="checkbox" 
                checked={showNasdaq} 
                onChange={e => setShowNasdaq(e.target.checked)} 
                className="rounded border-border bg-background text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              Nasdaq 100
            </label>
          </div>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg">
          {(['1W', '1M', 'YTD', '1Y', 'ALL'] as const).map(span => (
            <button
              key={span}
              onClick={() => setTimeSpan(span)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeSpan === span 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {dict[span] || span}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => {
                const d = new Date(val);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
              stroke="#888888"
              fontSize={14}
              tickMargin={12}
              minTickGap={30}
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={(val) => `$${val}`} 
              stroke="#888888"
              fontSize={14}
              width={60}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
              stroke="#888888"
              fontSize={14}
              width={45}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
              formatter={(value: number, name: string) => {
                if (name === 'cumulativeRealizedPnL') return [formatCurrency(value), dict.realizedPnl];
                if (name === 'cumulativeROIC') return [formatPercent(value), 'ROIC'];
                if (name === 'sp500Return') return [formatPercent(value), 'S&P 500'];
                if (name === 'nasdaqReturn') return [formatPercent(value), 'Nasdaq 100'];
                return [value, name];
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
            <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
            
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="cumulativeRealizedPnL" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#3b82f6" }}
              name={dict.realizedPnl}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="cumulativeROIC" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#10b981" }}
              name="ROIC"
            />
            {showSp500 && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="sp500Return" 
                stroke="#f59e0b" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="S&P 500"
              />
            )}
            {showNasdaq && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="nasdaqReturn" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Nasdaq 100"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
