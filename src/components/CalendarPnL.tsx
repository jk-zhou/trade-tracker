'use client';

import React, { useState } from 'react';
import { DailyPerformance } from '@/lib/portfolioUtils';
import { formatCurrencyCompact } from '@/lib/format';
import type { Dict } from '@/lib/i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

export default function CalendarPnL({ data, dict }: { data: DailyPerformance[], dict: Dict }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(endOfMonth(monthStart));
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dataMap = new Map(data.map(d => [d.date, d]));
  
  // Group days into weeks (each interval week is always 7 days starting Sunday)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  // Exclude weekends, add Weekly total
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Total'];

  return (
    <div className="bg-card border border-border p-4 md:p-6 rounded-xl shadow-sm mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">{dict.calendarView}</h2>
          <p className="text-sm text-muted-foreground">{dict.realizedPnl}</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-muted rounded-full transition-colors"><ChevronLeft size={20} /></button>
          <span className="font-semibold min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-muted rounded-full transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-6 gap-1 md:gap-2 mb-2">
        {weekDays.map(day => (<div key={day} className="text-center text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">{day}</div>))}
      </div>
      
      <div className="grid grid-cols-6 gap-1 md:gap-2">
        {weeks.map((week, weekIdx) => {
          let weeklyTotal = 0;
          week.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            weeklyTotal += dataMap.get(dateStr)?.dailyRealizedPnL || 0;
          });

          // Mon-Fri are indices 1 to 5 in the 7-day week array
          const workDays = week.slice(1, 6);

          return (
            <React.Fragment key={weekIdx}>
              {workDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const pnl = dataMap.get(dateStr)?.dailyRealizedPnL || 0;
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                
                let bgColor = 'bg-muted/30';
                let textColor = 'text-foreground';
                
                if (pnl > 0) { bgColor = 'bg-success/20 border-success/30 border'; textColor = 'text-success font-semibold'; }
                else if (pnl < 0) { bgColor = 'bg-destructive/20 border-destructive/30 border'; textColor = 'text-destructive font-semibold'; }
                else if (!isCurrentMonth) { textColor = 'text-muted-foreground/30'; bgColor = 'bg-transparent'; }
                
                if (isToday) bgColor += ' ring-2 ring-primary ring-offset-1 ring-offset-background';
                
                return (
                  <div key={dateStr} className={`flex flex-col h-16 md:h-24 p-1 md:p-2 rounded-lg transition-colors ${bgColor}`}>
                    <span className={`text-[10px] md:text-xs self-end mb-auto ${isCurrentMonth ? 'opacity-80' : 'opacity-40'}`}>{format(day, 'd')}</span>
                    {pnl !== 0 && (<span className={`text-[10px] md:text-sm text-center truncate ${textColor}`}>{pnl > 0 ? '+' : ''}{formatCurrencyCompact(pnl)}</span>)}
                  </div>
                );
              })}
              
              {/* Weekly Total Column */}
              <div className={`flex flex-col justify-center items-center h-16 md:h-24 p-1 md:p-2 rounded-lg border border-border/40 bg-muted/10`}>
                <span className="text-[9px] md:text-[10px] text-muted-foreground/60 uppercase mb-1 hidden md:block">Week</span>
                <span className={`text-[10px] md:text-sm font-bold truncate ${weeklyTotal > 0 ? 'text-success' : weeklyTotal < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {weeklyTotal > 0 ? '+' : ''}{weeklyTotal !== 0 ? formatCurrencyCompact(weeklyTotal) : '-'}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

