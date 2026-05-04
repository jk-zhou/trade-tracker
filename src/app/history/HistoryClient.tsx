'use client';

import { Transaction } from '@prisma/client';
import { deleteTransaction, bulkDeleteTransactions } from '@/actions/transaction';
import { formatUTCDate } from '@/lib/portfolioUtils';
import { formatCurrency } from '@/lib/format';
import { getDict } from '@/lib/i18n';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export default function HistoryClient({ initialTransactions, lang = 'zh', isEmbedded = false }: { initialTransactions: Transaction[], lang?: string, isEmbedded?: boolean }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [tickerFilter, setTickerFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  
  const [sortField, setSortField] = useState<'date' | 'symbol' | 'type' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const t = getDict(lang);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(tx => {
      // Ticker filter
      if (tickerFilter && !tx.symbol.toLowerCase().includes(tickerFilter.toLowerCase())) return false;
      
      // Asset type filter
      if (assetFilter !== 'ALL' && tx.assetType !== assetFilter) return false;
      
      // Action filter
      if (actionFilter !== 'ALL' && tx.action !== actionFilter) return false;
      
      // Date filter
      if (dateFilter !== 'ALL') {
        const now = new Date();
        const tradeDate = new Date(tx.tradeDate);
        const diffDays = (now.getTime() - tradeDate.getTime()) / (1000 * 3600 * 24);
        
        if (dateFilter === '30' && diffDays > 30) return false;
        if (dateFilter === '90' && diffDays > 90) return false;
        if (dateFilter === '365' && diffDays > 365) return false;
      }
      
      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'type':
          comparison = a.assetType.localeCompare(b.assetType);
          break;
        case 'amount':
          const amountA = a.price * a.quantity * (a.multiplier || 1);
          const amountB = b.price * b.quantity * (b.multiplier || 1);
          comparison = Math.abs(amountA) - Math.abs(amountB);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, tickerFilter, assetFilter, actionFilter, dateFilter, sortField, sortDirection]);

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    
    const res = await deleteTransaction(id);
    if (res.success) {
      setTransactions(transactions.filter(tx => tx.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      alert(t.failedDelete);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t.confirmBulkDelete)) return;

    const ids = Array.from(selectedIds);
    const res = await bulkDeleteTransactions(ids);
    if (res.success) {
      setTransactions(transactions.filter(tx => !selectedIds.has(tx.id)));
      setSelectedIds(new Set());
    } else {
      alert(t.failedDelete);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredTransactions.map(tx => tx.id);
      setSelectedIds(new Set(allFilteredIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className={isEmbedded ? "space-y-6" : "max-w-4xl mx-auto p-4 md:p-8 space-y-6"}>
      {!isEmbedded && (
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} className="mr-1" /> {t.back}
        </Link>
      )}

      {!isEmbedded && (
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">{t.historyTitle}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t.historySubtitle}</p>
          </div>
        </div>
      )}

      {/* Control Panel: Filters */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.searchTicker}</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                placeholder="AAPL..." 
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.assetType}</label>
            <select 
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t.all}</option>
              <option value="STOCK">{t.stock}</option>
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.action}</label>
            <select 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t.all}</option>
              <option value="BUY">{t.buy}</option>
              <option value="SELL">{t.sell}</option>
              <option value="EXERCISE">{t.exercise}</option>
              <option value="ASSIGNMENT">{t.assignment}</option>
              <option value="EXPIRATION">{t.expiration}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dateRange}</label>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t.all}</option>
              <option value="30">{t.last30}</option>
              <option value="90">{t.last90}</option>
              <option value="365">{t.last365}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.sortBy}:</span>
            <select 
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            >
              <option value="date">{t.sortDate}</option>
              <option value="symbol">{t.sortSymbol}</option>
              <option value="type">{t.sortType}</option>
              <option value="amount">{t.sortAmount}</option>
            </select>
          </div>
          <button 
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            title="Toggle Sort Direction"
          >
            <ArrowUpDown size={14} />
            {sortDirection === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* List Header with Bulk Actions */}
      <div className="flex items-center justify-between px-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input 
            type="checkbox" 
            checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
            onChange={handleSelectAll}
            className="rounded border-border bg-background focus:ring-primary w-4 h-4 cursor-pointer"
          />
          <span className="font-medium">{t.selectAll} ({filteredTransactions.length})</span>
        </label>

        {selectedIds.size > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors shadow-sm animate-in fade-in"
          >
            <Trash2 size={14} className="mr-1.5" />
            {t.bulkDelete} ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => {
          const isSelected = selectedIds.has(tx.id);
          return (
            <div 
              key={tx.id} 
              className={`bg-card border p-4 rounded-xl flex justify-between items-center group transition-colors ${
                isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(tx.id, e.target.checked)}
                  className="rounded border-border bg-background focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    {tx.symbol} 
                    <span className={`text-xs font-normal px-2 py-0.5 rounded ${
                      tx.assetType === 'STOCK' ? 'bg-blue-500/20 text-blue-400' :
                      tx.assetType === 'CALL' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {tx.assetType === 'STOCK' ? t.stock : tx.assetType === 'CALL' ? 'CALL' : 'PUT'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      tx.action === 'BUY' ? 'text-success bg-success/10' :
                      tx.action === 'SELL' ? 'text-destructive bg-destructive/10' :
                      'text-primary bg-primary/10'
                    }`}>
                      {tx.action === 'BUY' ? t.buy : tx.action === 'SELL' ? t.sell : 
                       tx.action === 'EXERCISE' ? t.exercise : tx.action === 'ASSIGNMENT' ? t.assignment : 
                       tx.action === 'EXPIRATION' ? t.expiration : tx.action}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {tx.quantity} {t.units} @ {formatCurrency(tx.price)}
                    {tx.strike && ` • ${t.strike} ${tx.strike}`}
                    {tx.expiration && ` • ${t.exp} ${formatUTCDate(tx.expiration, 'yyyy-MM-dd')}`}
                    {tx.fees > 0 && ` • ${t.fees} ${formatCurrency(tx.fees)}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(tx.tradeDate), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleDelete(tx.id)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                title="Delete Transaction"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl border-dashed flex flex-col items-center gap-2">
            <Filter size={32} className="text-muted-foreground/50" />
            <p>{t.empty}</p>
          </div>
        )}
      </div>
    </div>
  );
}
