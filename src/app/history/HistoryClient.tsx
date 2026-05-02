'use client';

import { Transaction } from '@prisma/client';
import { deleteTransaction, bulkDeleteTransactions } from '@/actions/transaction';
import { formatUTCDate } from '@/lib/portfolioUtils';
import { ArrowLeft, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';

const DICT = {
  en: {
    back: 'Back to Dashboard',
    title: 'Transaction History',
    subtitle: 'Deleting a transaction recalculates all metrics.',
    confirmDelete: 'Are you sure you want to delete this transaction? This will recalculate all PnL.',
    confirmBulkDelete: 'Are you sure you want to delete the selected transactions? This action cannot be undone.',
    failedDelete: 'Failed to delete transaction(s)',
    units: 'Units',
    strike: 'Strike',
    fees: 'Fees',
    empty: 'No transactions found.',
    buy: 'BUY',
    sell: 'SELL',
    all: 'All',
    searchTicker: 'Search Ticker...',
    assetType: 'Asset Type',
    action: 'Action',
    dateRange: 'Date Range',
    last30: 'Last 30 days',
    last90: 'Last 90 days',
    last365: 'Last 1 year',
    stock: 'Stock',
    call: 'Call Option',
    put: 'Put Option',
    exercise: 'Exercise',
    assignment: 'Assignment',
    expiration: 'Expiration',
    bulkDelete: 'Delete Selected',
    selectAll: 'Select All',
    sortBy: 'Sort By',
    sortDate: 'Date',
    sortSymbol: 'Symbol',
    sortType: 'Asset Type',
    sortAmount: 'Amount',
  },
  zh: {
    back: '返回控制面板',
    title: '交易历史记录',
    subtitle: '删除交易将重新计算所有指标。',
    confirmDelete: '确定要删除此交易吗？这将重新计算所有盈亏。',
    confirmBulkDelete: '确定要删除选中的交易吗？此操作无法撤销。',
    failedDelete: '删除交易失败',
    units: '单位',
    strike: '行权价',
    fees: '费用',
    empty: '未找到符合条件的交易记录。',
    buy: '买入',
    sell: '卖出',
    all: '全部',
    searchTicker: '搜索标的 (Ticker)...',
    assetType: '资产类型',
    action: '操作',
    dateRange: '时间范围',
    last30: '过去 30 天',
    last90: '过去 90 天',
    last365: '过去 1 年',
    stock: '股票',
    call: '看涨期权',
    put: '看跌期权',
    exercise: '行权',
    assignment: '指派',
    expiration: '到期',
    bulkDelete: '批量删除',
    selectAll: '全选当前',
    sortBy: '排序依据',
    sortDate: '交易日期',
    sortSymbol: '标的代码',
    sortType: '资产类型',
    sortAmount: '交易金额',
  }
};

export default function HistoryClient({ initialTransactions, lang = 'zh', isEmbedded = false }: { initialTransactions: Transaction[], lang?: string, isEmbedded?: boolean }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [tickerFilter, setTickerFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  
  const [sortField, setSortField] = useState<'date' | 'symbol' | 'type' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const t_dict = DICT[lang as keyof typeof DICT] || DICT.zh;

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      // Ticker filter
      if (tickerFilter && !t.symbol.toLowerCase().includes(tickerFilter.toLowerCase())) return false;
      
      // Asset type filter
      if (assetFilter !== 'ALL' && t.assetType !== assetFilter) return false;
      
      // Action filter
      if (actionFilter !== 'ALL' && t.action !== actionFilter) return false;
      
      // Date filter
      if (dateFilter !== 'ALL') {
        const now = new Date();
        const tradeDate = new Date(t.tradeDate);
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
    if (!confirm(t_dict.confirmDelete)) return;
    
    const res = await deleteTransaction(id);
    if (res.success) {
      setTransactions(transactions.filter(t => t.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      alert(t_dict.failedDelete);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t_dict.confirmBulkDelete)) return;

    const ids = Array.from(selectedIds);
    const res = await bulkDeleteTransactions(ids);
    if (res.success) {
      setTransactions(transactions.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
    } else {
      alert(t_dict.failedDelete);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredTransactions.map(t => t.id);
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className={isEmbedded ? "space-y-6" : "max-w-4xl mx-auto p-4 md:p-8 space-y-6"}>
      {!isEmbedded && (
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} className="mr-1" /> {t_dict.back}
        </Link>
      )}

      {!isEmbedded && (
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">{t_dict.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t_dict.subtitle}</p>
          </div>
        </div>
      )}

      {/* Control Panel: Filters */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t_dict.searchTicker}</label>
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t_dict.assetType}</label>
            <select 
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t_dict.all}</option>
              <option value="STOCK">{t_dict.stock}</option>
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t_dict.action}</label>
            <select 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t_dict.all}</option>
              <option value="BUY">{t_dict.buy}</option>
              <option value="SELL">{t_dict.sell}</option>
              <option value="EXERCISE">{t_dict.exercise}</option>
              <option value="ASSIGNMENT">{t_dict.assignment}</option>
              <option value="EXPIRATION">{t_dict.expiration}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t_dict.dateRange}</label>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t_dict.all}</option>
              <option value="30">{t_dict.last30}</option>
              <option value="90">{t_dict.last90}</option>
              <option value="365">{t_dict.last365}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t_dict.sortBy}:</span>
            <select 
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            >
              <option value="date">{t_dict.sortDate}</option>
              <option value="symbol">{t_dict.sortSymbol}</option>
              <option value="type">{t_dict.sortType}</option>
              <option value="amount">{t_dict.sortAmount}</option>
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
          <span className="font-medium">{t_dict.selectAll} ({filteredTransactions.length})</span>
        </label>

        {selectedIds.size > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors shadow-sm animate-in fade-in"
          >
            <Trash2 size={14} className="mr-1.5" />
            {t_dict.bulkDelete} ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.map((t) => {
          const isSelected = selectedIds.has(t.id);
          return (
            <div 
              key={t.id} 
              className={`bg-card border p-4 rounded-xl flex justify-between items-center group transition-colors ${
                isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(t.id, e.target.checked)}
                  className="rounded border-border bg-background focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    {t.symbol} 
                    <span className={`text-xs font-normal px-2 py-0.5 rounded ${
                      t.assetType === 'STOCK' ? 'bg-blue-500/20 text-blue-400' :
                      t.assetType === 'CALL' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {t.assetType === 'STOCK' ? t_dict.stock : t.assetType === 'CALL' ? 'CALL' : 'PUT'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      t.action === 'BUY' ? 'text-success bg-success/10' :
                      t.action === 'SELL' ? 'text-destructive bg-destructive/10' :
                      'text-primary bg-primary/10'
                    }`}>
                      {t.action === 'BUY' ? t_dict.buy : t.action === 'SELL' ? t_dict.sell : 
                       t.action === 'EXERCISE' ? t_dict.exercise : t.action === 'ASSIGNMENT' ? t_dict.assignment : 
                       t.action === 'EXPIRATION' ? t_dict.expiration : t.action}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {t.quantity} {t_dict.units} @ {formatCurrency(t.price)}
                    {t.strike && ` • ${t_dict.strike} ${t.strike}`}
                    {t.fees > 0 && ` • ${t_dict.fees} ${formatCurrency(t.fees)}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatUTCDate(t.tradeDate, 'PP')}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleDelete(t.id)}
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
            <p>{t_dict.empty}</p>
          </div>
        )}
      </div>
    </div>
  );
}
