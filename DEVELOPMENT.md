# 开发规范与最佳实践 (Development Guidelines)

这份文档规定了 Trade Tracker 项目的开发标准。无论是人类开发者还是 AI Agent，在修改或增加功能时，请严格遵守以下规范。

## 1. 架构与编码规范 (Architecture & Coding)

### 1.1 Server Components vs Client Components
- **默认优先使用 Server Components**。由于我们需要在服务端抓取数据库记录与实时行情，尽量在 Server 端（例如 `page.tsx`）完成数据处理和计算（如 `analyzePortfolio`）。
- **慎用 `'use client'`**。只有当组件确实需要交互状态（如 `useState`, `onClick`, 轮播滑动等）时，才将其抽离为独立的 Client Component 并加上 `'use client'` 指令。
- **避免在 Client 端直接查库**。必须通过 Server Actions (`src/actions/*.ts`) 进行数据库读写操作。

### 1.2 数据库修改 (Prisma)
- **永远不要手动修改 `.db` 文件**。
- 若需增加/修改字段，流程必须是：
  1. 修改 `prisma/schema.prisma`。
  2. 运行 `npx prisma db push` 更新本地 SQLite 结构并重新生成 Client。
  3. 更新所有涉及到新字段的前后端逻辑（如 `src/actions/transaction.ts`）。
- **不可改变事件溯源原则**。业务逻辑应通过**追加交易流水**实现，切勿破坏已有的核心推演模型。
- **组合交易录入**：若新增涉及多个腿的复杂策略（如 Spread/Straddle），应优先在 `src/actions/transaction.ts` 中使用 `rollTransaction` 方法（或其变体），通过 `prisma.$transaction` 确保多条流水的原子性提交，并统一分配 `groupId`。

### 1.3 样式系统 (TailwindCSS)
- 项目使用 TailwindCSS v4。
- **避免行内样式 (`style={{...}}`)**。所有 UI 调整应通过 Tailwind 的 utility classes 完成。
- 遵循现有的设计系统（如使用 `bg-card`, `border-border`, `text-muted-foreground` 等语义化颜色变量），以确保深浅色模式（如果未来支持）的统一兼容。

### 1.4 多语言支持 (i18n)
- 任何新增的页面文本**必须**包含中英双语。
- 所有翻译文本集中定义在 `src/lib/i18n.ts` 的 `DICT` 对象中，不要在组件内创建独立的字典。
- 使用 `getDict(lang)` 获取当前语言的字典。
- 获取当前语言的模式：Server Component 通过 `cookies().get('lang')` 读取，Client Component 通过传入的 `lang` 或 `dict` props 接收。

---

## 2. Git 工作流与提交流程 (Git Workflow)

### 2.1 语义化提交信息 (Semantic Commits)
每一次代码提交必须包含明确的语义前缀：
- `feat:` 新功能或大的重构。
- `fix:` 修复 Bug。
- `docs:` 修改文档（如 README, DESIGN）。
- `style:` 不影响代码逻辑的样式或格式修改。
- `refactor:` 代码重构（不增加新功能也不修复 Bug）。
- `chore:` 构建过程、依赖更新、工具配置等杂项。

**示例：** `feat: add symbol-level ROIC to positions tab`

### 2.2 Agent 开发纪律
- **单一职责**：每次 Tool Call 和 Git 提交应当只解决一个明确的问题或功能，避免巨大的 Monolithic Commits。
- **测试再提交**：在执行 `git commit` 前，确保应用可以正常 `npm run build` 或正常启动，没有控制台致命报错。

---

## 3. 注意事项与防坑指南 (Caveats)

1. **Yahoo Finance API 的脆弱性**：`yahoo-finance2` 对参数格式非常敏感，特别是 `chart()` 和 `historical()` 接口的日期类型。如果增加新的股票指标拉取，必须确保有容错 (`try/catch`)，防止某一标的退市/停牌导致整个页面 500 崩溃。
2. **Date 对象的时区陷阱**：在推演日历盈亏图时，请严格使用 `portfolioUtils.ts` 里的 `formatUTCDate` 进行日期对齐，避免跨时区造成的日期漂移（例如北美东部时间晚上的交易被算作前一天）。
3. **性能问题**：当交易记录超过 10,000 条时，全量推演可能会占用数十毫秒。对于个人级 App 这不是瓶颈，但如果未来打算做成多租户 SaaS，必须重构引入“月度快照 (Monthly Snapshots)”以截断推演。
