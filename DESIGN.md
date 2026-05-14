# Trade Tracker 设计文档 (Design Document)

本文档旨在为后续接手开发本项目的 AI Agent 或是人类开发者提供系统层面的设计思路与架构指南。

## 1. 核心架构与设计思想

本项目采用 **单表事件溯源 (Single-Table Event-Sourcing)** 的设计理念。由于股票和期权交易涉及频繁的加仓、平仓、行权等操作，如果直接维护“持仓快照表”，在修改或删除历史记录时将面临极大的状态同步灾难。因此：

- **数据源唯一 (Source of Truth)**：所有的盈亏 (PnL)、持仓数量、历史最大已用资金 (Max Capital Deployed)、回报率 (ROIC) 都是**动态计算**出来的，底层仅存储用户的“交易流水 (Transaction)”。
- **实时推演**：每次页面加载时，系统会将用户的所有流水按照时间排序，从头到尾进行状态推演，得出当前的持仓快照与投资指标。这种做法在个人投资级别（数万条交易记录内）性能完全可以接受，并且拥有极高的数据健壮性。

## 2. 数据库设计 (Prisma + SQLite)

底层使用 SQLite 进行轻量级存储，定义在 `prisma/schema.prisma`。核心模型 `Transaction` 包含以下关键字段：
- `tradeDate`: 交易日期，用于推演顺序和生成日历热力图。
- `symbol`: 标的代码（如 AAPL, SPY）。
- `assetType`: 资产类型，仅支持 `STOCK`（正股）, `CALL`（看涨期权）, `PUT`（看跌期权）。
- `action`: 操作行为（`BUY`, `SELL`, `EXERCISE`, `ASSIGNMENT`, `EXPIRATION`）。
- `quantity`: 交易数量（负数代表卖出/做空，正数代表买入/做多）。
- `price`, `strike`, `expiration`, `multiplier`, `fees`: 其他计算必备的金融要素。
- `groupId`: 组合交易标识符 (UUID)。用于将多条独立的流水（如展期中的“平仓”与“开仓”）在逻辑上绑定在一起。

## 3. 核心计算逻辑 (`src/lib/portfolioUtils.ts`)

这是整个系统最核心、最复杂的引擎文件：

### A. 仓位与盈亏合并 (`analyzePortfolio`)
- 对每一笔交易，通过 `symbol-assetType-strike-expiration` 生成唯一 Key。
- 采用**平均成本法 (Average Cost Basis)**：同向交易会摊薄成本，反向交易会触发“已实现盈亏 (Realized PnL)”的结算。
- `Total PnL = Realized PnL + Unrealized PnL`。

### B. 回报率计算 (ROIC & Annualized ROIC)
- **占用资金 (Capital Deployed)**：多头股票占用“均价 × 数量”的资金，裸卖看跌期权 (Short Put) 占用“行权价 × 100 × 合约数”的保证金。
- 系统在遍历流水时，会记录出现过的**历史最高并发占用资金 (historicalMaxCapitalDeployed)**。这也就是用户的“总投入本金池”。
- **总回报率 (ROIC)** = 总盈亏 / 历史最大占用资金。
- **年化回报率 (Annualized ROIC)** = ROIC × (365 / 距离首笔交易的天数)。
- **组合交易 (Composite Transactions)**：对于 Roll (展期) 或 Spread (价差)，系统会同时产生两条流水。虽然它们在底层是独立记录，但在 UI 层通过 `groupId` 进行关联展示，并且在录入时通过 `prisma.$transaction` 保证原子性。

## 4. 行情数据层 (`src/lib/marketData.ts`)

- 外部依赖：使用了 `yahoo-finance2` 库获取实时报价与基准指数（标普500、纳指100）的历史曲线。
- **注意**：Yahoo Finance 接口存在严格的参数校验（例如日期必须是特定的 Date 格式），底层经常抛出 Schema Validation 错误。修改这部分代码时，务必捕获异常，并使用 `force-dynamic` 来确保不会在 Next.js 的静态打包中失败。

## 5. 组件划分与前端结构

项目基于 Next.js 15+ (App Router) + TailwindCSS + Lucide React 构建。

- `src/app/page.tsx`: 服务端入口，负责获取全部交易记录、调用推演引擎、抓取现价，然后将全盘结果传递给客户端组件。
- `src/components/DashboardClient.tsx`: 客户端总控，管理“概览 / 持仓 / 交易记录”三大标签页的状态切换，支持左右滑动。
- `src/components/PositionsAccordion.tsx`: 按 `symbol` 分组的持仓展示，包含加仓/平仓的快速跳转逻辑。
- `src/components/PerformanceChart.tsx`: 基于 Recharts 的资产表现走势图，包含基准对标。

## 6. 后续开发与扩展建议

任何接手该项目的 AI Agent 在修改功能时应遵循：
1. **不要轻易打破事件溯源逻辑**：如果在 `portfolioUtils.ts` 中新增业务逻辑（例如处理期权行权带来的正股转换），请遵循**追加流水**而非**修改历史**的原则，在状态机中推演。
2. **防范缓存滥用**：投资追踪工具需要极高的实时性，请保持关键页面的 `export const dynamic = 'force-dynamic'`。如果频繁调用 Yahoo 接口触发限流，可考虑引入 `React Query` 在客户端进行短暂的 SWR (Stale-While-Revalidate) 缓存。
3. **增加新字段**：如果需要在表单 (`TransactionForm.tsx`) 增加新字段，必须先改 `schema.prisma` -> 运行 `npx prisma db push` -> 更新 `actions/transaction.ts` -> 更新前端表单。
