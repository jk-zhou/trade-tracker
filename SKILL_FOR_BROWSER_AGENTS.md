# AI Agent 自动化浏览器操作指南 (Trade Tracker)

如果你是负责模拟用户操作的 AI Agent，请在启动浏览器和执行操作前仔细阅读本指南。

## 1. 解决浏览器启动失败 (Chrome Sandbox Issue)
由于执行环境限制，你**必须**在启动 Puppeteer/Playwright 时使用以下参数绕过沙箱错误：

```javascript
// Puppeteer 示例
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ]
});
```

## 2. 关键页面定位器 (Selectors)
由于 App 采用 Tailwind CSS 且没有硬编码 ID，请使用以下基于属性和结构的 CSS 选择器：

### A. 首页 (Dashboard)
- **新建交易按钮**: `a[href="/trade"]` (或包含文字 "新建交易" / "New Trade" 的链接)
- **概览 Tab**: `button` (包含 "概览" 或 "Overview")
- **持仓 Tab**: `button` (包含 "持仓" 或 "Positions")
- **记录 Tab**: `button` (包含 "交易记录" 或 "History")

### B. 交易录入页 (/trade)
- **资产类型 (Asset Type)**: `select` (页面中第一个 select)
- **操作类型 (Action)**: `select` (页面中第二个 select)
- **代码 (Symbol)**: `input[name="symbol"]`
- **交易日期 (Date)**: `input[name="tradeDate"]`
- **数量 (Quantity)**: `input[name="quantity"]`
- **价格 (Price)**: `input[name="price"]`
- **行权价 (Strike)**: `input[name="strike"]` (仅期权模式可见)
- **到期日 (Expiration)**: `input[name="expiration"]` (仅期权模式可见)
- **手续费 (Fees)**: `input[name="fees"]`
- **提交按钮 (Submit)**: `button[type="submit"]`

## 3. 必须遵守的等待策略 (Timing)
1. **首屏加载**: 开发模式下首次访问首页，Next.js 需要编译且需拉取 Yahoo API，**请设置超时等待为 90 秒**。
2. **表单提交**: 点击提交按钮后，页面会执行 Server Action 并跳转回首页，请等待跳转完成，直到看到 URL 变回 `/`。
3. **Hydration 等待**: 页面出现后，React 可能还没完成挂载，建议在点击交互前增加 1-2 秒的固定延迟。

## 4. 常见问题排查
- **点击无效**: 检查控制台是否有报错。如果点击 Tab 无反应，可能是 Hydration 失败或遮罩层遮挡，请尝试重新加载页面。
