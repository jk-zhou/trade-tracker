export const dynamic = 'force-dynamic';
import { getAllTransactions } from '@/actions/transaction';
import { analyzePortfolio, calculateAnnualizedROIC } from '@/lib/portfolioUtils';
import { getCurrentPrice, getBenchmarkHistory } from '@/lib/marketData';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import DashboardClient from '@/components/DashboardClient';
import { analyzePerformanceHistory } from '@/lib/portfolioUtils';

const DICT = {
  en: {
    portfolio: 'Trade Tracker',
    subtitle: 'Real-time Options & Stock Tracker',
    newTrade: 'New Trade',
    totalPnl: 'Total PnL',
    exp_totalPnl: 'The sum of all realized gains/losses from closed positions and unrealized gains/losses from active positions.\n\nFormula: Total PnL = Realized PnL + Unrealized PnL',
    totalRoic: 'Total ROIC',
    exp_totalRoic: 'Return on Invested Capital. Calculated as Total PnL divided by the maximum capital deployed historically.\n\nFormula: Total ROIC = Total PnL / Historical Max Capital Deployed',
    annualizedRoic: 'Annualized ROIC',
    exp_annualizedRoic: 'Total ROIC scaled to an annual rate based on the time since your first trade.\n\nFormula: Annualized ROIC = Total ROIC * (365 / Days Since First Trade)',
    marginUtilized: 'Margin Utilized',
    exp_marginUtilized: 'The amount of cash or margin currently locked to secure open positions (e.g. short puts or stock).',
    max: 'Max',
    exp_max: 'The historical maximum amount of capital that was simultaneously deployed or locked as margin at any point in time. This is used as the denominator for calculating ROIC.',
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
    livePrice: 'Live Price',
    combinedRealized: 'Combined Realized',
    combinedUnrealized: 'Combined Unrealized',
    performanceChart: 'Performance Curve',
    calendarView: 'Calendar PnL',
    tabOverview: 'Overview',
    tabPositions: 'Positions',
    tabHistory: 'History',
    buyAction: 'Buy',
    sellAction: 'Sell',
    realizedRoic: 'Realized ROIC',
    realizedLabel: 'R:',
    unrealizedLabel: 'U:',
    '1W': '1W',
    '1M': '1M',
    'YTD': 'YTD',
    '1Y': '1Y',
    'ALL': 'ALL',
  },
  zh: {
    portfolio: '交易追踪',
    subtitle: '实时期权与股票追踪器',
    newTrade: '新建交易',
    totalPnl: '总盈亏',
    exp_totalPnl: '所有已平仓头寸的已实现盈亏与当前活跃头寸的未实现盈亏之和。\n\n计算公式：总盈亏 = 已实现盈亏 + 未实现盈亏',
    totalRoic: '总回报率 (ROIC)',
    exp_totalRoic: '投资回报率。计算方式为“总盈亏”除以历史上的“最大已部署资金”。\n\n计算公式：总回报率 (ROIC) = 总盈亏 ÷ 历史最大已用资金',
    annualizedRoic: '年化回报率',
    exp_annualizedRoic: '根据自首笔交易以来的时间跨度，将“总回报率”折算为年度的预期回报率。\n\n计算公式：年化回报率 = 总回报率 × (365 ÷ 距离首笔交易的天数)',
    marginUtilized: '已用保证金',
    exp_marginUtilized: '当前被锁定用于维持敞口（例如卖出看跌期权或持股）的现金或保证金总额。',
    max: '最大记录',
    exp_max: '在历史上的任意时刻，同时投入或锁定作为保证金的最大资金数额。该数值被作为计算回报率 (ROIC) 的核心分母。',
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
    livePrice: '最新现价',
    combinedRealized: '合并已实现盈亏',
    combinedUnrealized: '合并未实现盈亏',
    performanceChart: '历史表现折线图',
    calendarView: '日历盈亏热力图',
    tabOverview: '概览',
    tabPositions: '持仓',
    tabHistory: '交易记录',
    buyAction: '买入',
    sellAction: '卖出',
    realizedRoic: '已实现回报率 (ROIC)',
    realizedLabel: '已实现:',
    unrealizedLabel: '未实现:',
    '1W': '近1周',
    '1M': '近1月',
    'YTD': '今年',
    '1Y': '近1年',
    'ALL': '全部',
  }
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'zh';
  const t = DICT[lang as keyof typeof DICT] || DICT.en;

  const transactions = await getAllTransactions();
  const summary = analyzePortfolio(transactions);
  const performanceHistory = analyzePerformanceHistory(transactions);

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

  // Fetch benchmark data
  let sp500Data: any[] = [];
  let nasdaqData: any[] = [];
  if (summary.firstTradeDate) {
    const [sp500, ndx] = await Promise.all([
      getBenchmarkHistory('^GSPC', summary.firstTradeDate),
      getBenchmarkHistory('^NDX', summary.firstTradeDate)
    ]);
    sp500Data = sp500;
    nasdaqData = ndx;
  }

  return (
    <main className="w-full min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.portfolio}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <Settings size={20} />
          </Link>
          <Link 
            href="/trade" 
            className="bg-primary hover:bg-blue-600 text-primary-foreground px-4 py-2 rounded-full font-medium flex items-center shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} className="mr-1" /> {t.newTrade}
          </Link>
        </div>
      </header>

      <DashboardClient 
        dict={t}
        summary={summary}
        performanceHistory={performanceHistory}
        positionsWithLivePrice={positionsWithLivePrice}
        transactions={transactions}
        sp500Data={sp500Data}
        nasdaqData={nasdaqData}
        totalPnL={totalPnL}
        totalUnrealizedPnL={totalUnrealizedPnL}
        roic={roic}
        annualizedRoic={annualizedRoic}
        lang={lang}
      />
    </main>
  );
}
