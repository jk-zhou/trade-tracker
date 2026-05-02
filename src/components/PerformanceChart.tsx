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
  ReferenceLine
} from 'recharts';

export default function PerformanceChart({ data, dict }: { data: DailyPerformance[], dict: any }) {
  const [timeSpan, setTimeSpan] = useState<'1W' | '1M' | 'YTD' | '1Y' | 'ALL'>('1M');

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    const now = new Date();
    
    return data.filter(d => {
      const date = new Date(d.timestamp);
      if (timeSpan === 'ALL') return true;
      if (timeSpan === 'YTD') return date.getFullYear() === now.getFullYear();
      
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
      if (timeSpan === '1W') return diffDays <= 7;
      if (timeSpan === '1M') return diffDays <= 30;
      if (timeSpan === '1Y') return diffDays <= 365;
      
      return true;
    });
  }, [data, timeSpan]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border p-4 md:p-6 rounded-xl shadow-sm mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold">{dict.performanceChart || 'Performance'}</h2>
          <p className="text-sm text-muted-foreground">{dict.realizedPnl} & ROIC</p>
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

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(val) => {
                const d = new Date(val);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={(val) => `$${val}`} 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={60}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={40}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}
              formatter={(value: number, name: string) => {
                if (name === 'cumulativeRealizedPnL') return [formatCurrency(value), dict.realizedPnl];
                if (name === 'cumulativeROIC') return [formatPercent(value), 'ROIC'];
                return [value, name];
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            />
            <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="cumulativeRealizedPnL" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#3b82f6" }}
              name="cumulativeRealizedPnL"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="cumulativeROIC" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#10b981" }}
              name="cumulativeROIC"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
