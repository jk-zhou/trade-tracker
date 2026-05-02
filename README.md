# 期权与股票追踪器 (Option Tracker)

这是一个基于 [Next.js](https://nextjs.org) 开发的实时期权和股票投资组合追踪应用。

## 核心特性

- **实时期权追踪**：支持追踪个股股票、看涨期权 (Call) 和看跌期权 (Put)。
- **P2021 数据库集成**：使用 Prisma 和 SQLite 进行交易数据的事件溯源存储。
- **实时行情**：集成 `yahoo-finance2` 获取最新的市场价格。
- **中英双语支持**：支持根据用户偏好切换中文或英文界面。
- **时区校准**：解决了常见的 UTC 日期偏移问题，确保交易日期显示准确。

## 快速开始

首先，安装依赖：

```bash
npm install
```

然后，同步数据库：

```bash
npx prisma db push
```

最后，启动开发服务器：

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可查看结果。

## 技术栈

- **框架**: Next.js 15+ (App Router)
- **数据库**: Prisma + SQLite
- **行情数据**: yahoo-finance2
- **样式**: Tailwind CSS
- **图标**: Lucide React
