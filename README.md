# Trade Tracker (交易追踪仪)

Trade Tracker 是一款现代化的全栈 Web 应用，专门为投资者设计，用于追踪股票和期权的实时持仓、计算盈亏 (PnL)、监控已用保证金 (Margin) 以及动态评估资金的回报率 (ROIC 和年化 ROIC)。

![Overview](.tempmediaStorage/media_fb5902c9-49f2-4311-ad21-c2de0e9236f4_1777721248320.png)

---

## 🤖 专属 Agent 交接指南 (For AI Agents)

**如果你是接手此项目的新 AI Agent，请在进行任何实质性代码修改前，务必先阅读本项目架构核心指南：[👉 DESIGN.md](./DESIGN.md) 👈**

该文档包含了项目的**“单表事件溯源”**设计理念、数据库结构分析、核心 ROIC 的计算公式来源以及后续增加新功能的避坑指南。了解了 `DESIGN.md`，你就能理解为何我们不存储快照，而是通过交易流水动态推演持仓。

---

## 🚀 本地开发指南

### 1. 安装依赖

```bash
npm install
```

### 2. 同步数据库

项目默认使用本地 SQLite 数据库（位于 `prisma/schema.prisma`），你需要先同步表结构：

```bash
npx prisma db push
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可查看结果。

---

## 🐳 Docker 部署指南 (针对 NAS / Unraid)

本项目已经配置了多阶段构建的 `Dockerfile` 和自动执行数据库迁移的 `docker-entrypoint.sh`，非常适合部署在 Unraid 或群晖等带有持久化目录的 NAS 环境中。

### 构建镜像

在本项目根目录下运行：
```bash
docker build -t your-dockerhub-username/trade-tracker:latest .
```

### 运行与卷挂载 (Volume Mapping)

**🚨 极其重要**：必须将容器内的 `/app/data` 目录映射到主机的物理路径上。SQLite 的数据库文件 `trade-tracker.db` 将保存在该路径下。如果不映射，容器重启后所有账单记录将**全部丢失**！

```bash
docker run -d \
  --name trade-tracker \
  -p 3000:3000 \
  -v /你的物理机绝对路径/trade-tracker-data:/app/data \
  your-dockerhub-username/trade-tracker:latest
```

*(如果在 Unraid 的图形界面部署，请在 "Add Path" 中将 Container Path 设为 `/app/data`，Host Path 设为你自己的 appdata 目录)*

---

## 🛠 技术栈

- **框架**: Next.js 15+ (App Router)
- **样式**: TailwindCSS v4 + Lucide React
- **数据库**: Prisma + SQLite
- **数据源**: `yahoo-finance2` (获取实时行情与基准历史表现)
- **图表**: Recharts

## ✨ 主要功能

- **多资产支持**：支持股票 (STOCK) 及期权 (CALL / PUT) 的交易追踪。
- **全方位指标推演**：自动根据历史买卖流水推演“总盈亏”、“总回报率 (ROIC)”、“年化回报率”以及“已用保证金”。
- **细粒度追踪**：可同时查阅**整体投资组合**表现与**单一标的**表现（含专属 ROIC）。
- **动态表现图表**：对标标普 500 (`^GSPC`) 与纳斯达克 100 (`^NDX`) 的历史相对收益率折线图，以及日历盈亏热力图。
- **多语言支持**：原生支持中文与英文无缝切换。
