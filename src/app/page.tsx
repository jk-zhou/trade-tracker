export const dynamic = 'force-dynamic';
import { getAllTransactions } from '@/actions/transaction';
import { analyzePortfolio, calculateAnnualizedROIC, formatUTCDate } from '@/lib/portfolioUtils';
import { getCurrentPrice } from '@/lib/marketData';
import { Plus, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import LanguageToggle from '@/components/LanguageToggle';
import TermTooltip from '@/components/TermTooltip';
import PositionsAccordion from '@/components/PositionsAccordion';

const DICT = {
  en: {
    portfolio: 'Portfolio',
    subtitle: 'Real-time Options & Stock Tracker',
    newTrade: 'New Trade',
    totalPnl: 'Total PnL',
    exp_totalPnl: 'The sum of all realized gains/losses from closed positions and unrealized gains/losses from active positions.',
    totalRoic: 'Total ROIC',
    exp_totalRoic: 'Return on Invested Capital. Calculated as Total PnL divided by the maximum capital deployed historically.',
    annualizedRoic: 'Annualized ROIC',
    exp_annualizedRoic: 'Total ROIC scaled to an annual rate based on the time since your first trade.',
    marginUtilized: 'Margin Utilized',
    exp_marginUtilized: 'The amount of cash or margin currently locked to secure open positions (e.g. short puts or stock).',
    max: 'Max',
    activePositions: 'Active Positions',
    noPositions: 'No active positions. Add a trade to get started.',
    units: 'Units',
    unit: 'Unit',
    strike: 'Strike',
    exp: 'Exp',
    realizedPnl: 'Realized PnL',
    exp_realizedPnl: 'Profit or loss from trades that have been closed.',
    unrealizedPnl: 'Unrealized PnL',
    unrealizedLive: 'Unrealized (Live: ',
    recentActivity: 'Recent Activity',
    viewAll: 'View All',
    livePrice: 'Live Price',
    combinedRealized: 'Combined Realized',
    combinedUnrealized: 'Combined Unrealized',
  },
  zh: {
    portfolio: '投资组合',
    subtitle: '实时期权与股票追踪器',
    newTrade: '新建交易',
    totalPnl: '总盈亏',
    exp_totalPnl: '所有已平仓头寸的已实现盈亏与当前活跃头寸的未实现盈亏之和。',
    totalRoic: '总回报率 (ROIC)',
    exp_totalRoic: '投资回报率。计算方式为“总盈亏”除以历史上的“最大已部署资金”。',
    annualizedRoic: '年化回报率',
    exp_annualizedRoic: '根据自首笔交易以来的时间跨度，将“总回报率”折算为年度的预期回报率。',
    marginUtilized: '已用保证金',
    exp_marginUtilized: '当前被锁定用于维持敞口（例如卖出看跌期权或持股）的现金或保证金总额。',
    max: '最大记录',
    activePositions: '当前持仓',
    noPositions: '暂无持仓，请添加交易开始使用。',
    units: '单位',
    unit: '单位',
    strike: '行权价',
    exp: '到期日',
    realizedPnl: '已实现盈亏',
    exp_realizedPnl: '因平仓交易而已经兑现的实际利润或亏损。',
    unrealizedPnl: '未实现盈亏',
    unrealizedLive: '未实现 (现价: ',
    recentActivity: '最近活动',
    viewAll: '查看全部',
    livePrice: '最新现价',
    combinedRealized: '合并已实现盈亏',
    combinedUnrealized: '合并未实现盈亏',
  }
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'zh';
  const t = DICT[lang as keyof typeof DICT] || DICT.en;

  const transactions = await getAllTransactions();
  const summary = analyzePortfolio(transactions);

  // Fetch real-time market data for open positions
  const positionsWithLivePrice = await Promise.all(
    summary.positions.map(async (pos) => {
      const livePrice = await getCurrentPrice(pos.symbol) || pos.averageCost;
      let currentPrice = livePrice;
      
      let unrealizedPnL = 0;
      if (pos.assetType === 'STOCK') {
        unrealizedPnL = (currentPrice - pos.averageCost) * pos.quantity;
      }
      
      return {
        ...pos,
        currentPrice,
        unrealizedPnL,
      };
    })
  );

  const totalUnrealizedPnL = positionsWithLivePrice.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalPnL = summary.totalRealizedPnL + totalUnrealizedPnL;
  const roic = summary.historicalMaxCapitalDeployed > 0 ? (totalPnL / summary.historicalMaxCapitalDeployed) : 0;
  const annualizedRoic = calculateAnnualizedROIC(roic, summary.firstTradeDate);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.portfolio}</h1>
            <LanguageToggle currentLang={lang} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
        </div>
        <Link 
          href="/trade" 
          className="bg-primary hover:bg-blue-600 text-primary-foreground px-4 py-2 rounded-full font-medium flex items-center shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={18} className="mr-1" /> {t.newTrade}
        </Link>
      </header>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title={<span className="flex items-center">{t.totalPnl} <TermTooltip term={t.totalPnl} explanation={t.exp_totalPnl} /></span>} 
          value={formatCurrency(totalPnL)} 
          isPositive={totalPnL >= 0}
          icon={<DollarSign size={16} />}
        />
        <MetricCard 
          title={<span className="flex items-center">{t.totalRoic} <TermTooltip term={t.totalRoic} explanation={t.exp_totalRoic} /></span>} 
          value={formatPercent(roic)} 
          isPositive={roic >= 0}
          icon={<Activity size={16} />}
        />
        <MetricCard 
          title={<span className="flex items-center">{t.annualizedRoic} <TermTooltip term={t.annualizedRoic} explanation={t.exp_annualizedRoic} /></span>} 
          value={formatPercent(annualizedRoic)} 
          isPositive={annualizedRoic >= 0}
          icon={<TrendingUp size={16} />}
        />
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider flex items-center">
            {t.marginUtilized} <TermTooltip term={t.marginUtilized} explanation={t.exp_marginUtilized} />
          </span>
          <span className="text-xl font-semibold mt-1">{formatCurrency(summary.currentMarginLocked)}</span>
          <span className="text-xs text-muted-foreground mt-1">{t.max}: {formatCurrency(summary.historicalMaxCapitalDeployed)}</span>
        </div>
      </div>

      {/* Active Positions */}
      <h2 className="text-xl font-semibold mt-10 mb-4 border-b border-border pb-2 flex items-center">
        {t.activePositions}
      </h2>
      <PositionsAccordion positions={positionsWithLivePrice} dict={t} />

      {/* Recent Activity */}
      <div className="flex justify-between items-center mt-10 mb-4 border-b border-border pb-2">
        <h2 className="text-xl font-semibold flex items-center">
          {t.recentActivity}
        </h2>
        <Link href="/history" className="text-sm text-primary hover:underline">{t.viewAll}</Link>
      </div>
      <div className="space-y-3">
        {transactions.slice(0, 5).map((tx) => (
          <div key={tx.id} className="flex justify-between items-center p-3 bg-card border border-border rounded-lg">
            <div>
              <span className="font-semibold">{tx.symbol}</span> <span className="text-muted-foreground text-sm">{tx.assetType}</span>
              <div className="text-xs text-muted-foreground mt-0.5">{formatUTCDate(tx.tradeDate, 'MMM dd, yyyy')}</div>
            </div>
            <div className="text-right">
              <span className={`font-medium text-sm px-2 py-1 rounded ${
                tx.action === 'BUY' ? 'bg-success/10 text-success' : 
                tx.action === 'SELL' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              }`}>
                {tx.action}
              </span>
              <div className="text-sm mt-1">
                {tx.quantity} @ {formatCurrency(tx.price)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function MetricCard({ title, value, isPositive, icon }: { title: React.ReactNode, value: string, isPositive: boolean, icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="flex items-center text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
        <span className="mr-1">{icon}</span>
        {title}
      </div>
      <span className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {isPositive ? '+' : ''}{value}
      </span>
    </div>
  );
}
