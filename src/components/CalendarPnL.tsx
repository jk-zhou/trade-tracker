'use client';

import { useState } from 'react';
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
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {weekDays.map(day => (<div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">{day}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((day) => {
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
              <span className={`text-xs md:text-sm self-end mb-auto ${isCurrentMonth ? 'opacity-80' : 'opacity-40'}`}>{format(day, 'd')}</span>
              {pnl !== 0 && (<span className={`text-[10px] md:text-sm text-center truncate ${textColor}`}>{pnl > 0 ? '+' : ''}{formatCurrencyCompact(pnl)}</span>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
