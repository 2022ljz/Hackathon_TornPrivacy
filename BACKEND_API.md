## 后端接口规范（供 vue-defi-app 前端使用）

说明：本文档列出前端各页面所需的后端 HTTP / WebSocket 接口，字段类型、示例请求与响应、错误码和注意事项。接口设计以直观、一目了然为目标，后端可据此实现并返回与前端示例字段一致的数据。

---

## 快速清单（按页面）
- Market 页面（`MarketTable.vue`）：/api/markets, /ws/markets
- 账户与余额（`BalancePanel.vue`、`Header.vue`）：/api/user/balances, /api/tokens, /ws/user/{address}
- Stake / Borrow（`StakeBorrowPanel.vue`）：/api/stake, /api/stake/{note}, /api/borrow, /api/stake/{note}/borrowable
- Lend / Withdraw（`LendWithdrawPanel.vue`）：/api/lend, /api/lend/{note}, /api/withdraw
- 全局配置：/api/config

---

## 认证与鉴权
- 大多数读取接口可以公开（GET），但写操作（POST/DELETE）应验证请求者身份。
- 推荐使用钱包地址 + 签名或标准 Bearer Token：
  - Header: `Authorization: Bearer <token>` 或
  - Body/Query: `address` + 在链上签名验证（后端要求）
- 对于 demo 模式，允许以 `address` 参数替代鉴权。

---

## 全局错误约定
- 200 — OK
- 201 — Created (写操作成功，返回新资源)
- 400 — Bad Request（参数或格式错误）
- 401 — Unauthorized（未授权或签名验证失败）
- 404 — Not Found（例如 note 未找到）
- 409 — Conflict（资源冲突，如超出可借额度）
- 500 — Internal Server Error

响应体建议结构（错误）:
{
  "error": {
    "code": 400,
    "message": "描述性的错误信息",
    "details": { ... 可选 }
  }
}

---

## 接口详情

### 1) 获取市场列表（MarketTable）
- GET /api/markets

请求参数：无

响应（200）：
{
  "markets": [
    {
      "symbol": "ETH",
      "name": "Ethereum",
      "totalSupplied": "2.47M",       // 前端展示用短字符串
      "suppliedUSD": 8645000000,       // 原始数值（USD）
      "supplyAPY": 2.00,               // 百分比数字（%），前端会格式化为 "2.00%"
      "totalBorrowed": "2.20M",
      "borrowedUSD": 7700000000,
      "borrowAPY": 2.65,
      "utilization": 89.2,             // 利用率 (%)
      "liquidity": 12345.67            // 可借/可提数额（以 token 单位或 USD，视后端定义）
    },
    ...
  ]
}

说明：前端用到字段有：symbol、name、totalSupplied（展示字符串）、suppliedUSD（用于货币格式化）、supplyAPY、totalBorrowed、borrowedUSD、borrowAPY、utilization。

实时更新（可选）：
- WebSocket ws://.../ws/markets 推送 market 更新消息：
  {
    "type": "market_update",
    "symbol": "ETH",
    "supplyAPY": 1.98,
    "borrowAPY": 2.60,
    "suppliedUSD": 8650000000,
    "borrowedUSD": 7710000000,
    "utilization": 89.1
  }

---

### 2) 代币配置与价格
- GET /api/tokens

响应（200）：
{
  "tokens": [
    { "sym": "ETH", "addr": "eth", "decimals": 18, "price": 3500 },
    { "sym": "DAI", "addr": "0x...", "decimals": 18, "price": 1 },
    ...
  ]
}

用途：用于填充 `select` 列表、价格换算与前端默认配置同步。

---

### 3) 用户余额与投资概览（BalancePanel / Header）
- GET /api/user/balances?address={address}

请求参数：
- address (query) — 钱包地址（必需或由鉴权获取）

响应（200）：
{
  "address": "0x...",
  "isConnected": true,
  "tokens": [
    { "sym": "ETH", "balance": 12.3456, "usd": 43209.6, "price": 3500 },
    { "sym": "DAI", "balance": 1000, "usd": 1000, "price": 1 }
  ],
  "totalPortfolioUSD": 44209.6
}

注意：前端需要 getLocalBalance 与 price，用于计算总市值、卡片显示和动画变化提示。

实时更新（可选）：
- WebSocket /ws/user/{address} 推送余额或本地数据更新：
  { "type": "balance_update", "token": "ETH", "balance": 12.5, "usd": 43750 }

---

### 4) 平台配置
- GET /api/config

响应（200）：
{
  "baseAPR": 4.0,
  "borrowAPR": 8.0,
  "ltv": 0.5,
  "mixerAddr": "0x...",
  "lendingAddr": "0x...",
  "supportedTokens": ["ETH","DAI","USDC","WBTC"]
}

用途：前端读取 LTV、APR、合约地址、默认 token 列表等。

---

### 5) Stake（创建押金）
- POST /api/stake

请求（application/json）：
{
  "address": "0x...",
  "token": "ETH",
  "amount": 1.2345
}

响应（201）：
{
  "note": "0x...",          // 66 字符交易证明/凭证（前端需保存）
  "token": "ETH",
  "amount": 1.2345,
  "stakeTime": 169xxx,       // unix seconds
  "status": "active"
}

说明：前端会弹窗显示 `note` 并提示用户复制保存；后端需要把 stake 记录与初始 borrows 结构初始化。

查询单个 stake：
- GET /api/stake/{note}
响应包含同上资源，还应包含 `borrows` 对象：
{
  "note": "0x...",
  "token": "ETH",
  "amount": 1.2345,
  "stakeTime": 169xxx,
  "status": "active",
  "borrows": { "DAI": { "amount": 100, "borrowTime": 169xxx }, ... }
}

辅助计算：
- GET /api/stake/{note}/borrowable?borrowToken={sym}
返回当前的 `maxBorrowable` 与 `remainingBorrowable`（以借入 token 单位）：
{
  "maxBorrowable": 500.0,
  "remainingBorrowable": 400.0,
  "collateralValueUSD": 1000.0,
  "noteStatus": "Valid"
}

---

### 6) Borrow（借款）
- POST /api/borrow

请求（application/json）：
{
  "address": "0x...",
  "note": "0x...",         // stake note
  "token": "DAI",         // 要借的代币
  "amount": 100,           // 借入数量（token 单位）
  "toAddress": "0x..."   // 接收地址
}

响应（200）：
{
  "success": true,
  "borrowed": { "token": "DAI", "amount": 100, "borrowTime": 169xxx },
  "remainingBorrowable": 300.0,
  "currentDebtUSD": 1100.0
}

错误示例（超额）：409 Conflict
{
  "error": { "code":409, "message":"Requested amount exceeds remaining borrowable" }
}

后端须更新 stake.note 的 borrows 字段，并维护用户的借贷总额用于计算利息。

---

### 7) Unstake（赎回押金）
- POST /api/unstake

请求：
{
  "address":"0x...",
  "note":"0x..."
}

响应（200）：
{
  "success": true,
  "settlement": {
    "returnedCollateral": { "token":"ETH", "amount": 1.2345 },
    "repayments": { "DAI": 101.23, "USDC": 0 },
    "totalDebtUSD": 101.23
  }
}

说明：后端在处理 unstake 前需计算并返回包含利息的应付总额（分币种列出），前端会据此提示用户并在本地/远端更新记录。

---

### 8) Lend（存款）
- POST /api/lend

请求：
{
  "address":"0x...",
  "token":"ETH",
  "amount": 10,
  "lockDays": 30
}

响应（201）：
{
  "note":"0x...",
  "token":"ETH",
  "amount":10,
  "lendTime":169xxx,
  "interestTime":2592000,    // lockDays 转为秒
  "promisedAPR": 7.0,
  "status":"active"
}

查询 lend 记录： GET /api/lend/{note}

---

### 9) Withdraw（取出 lend）
- POST /api/withdraw

请求：
{
  "address":"0x...",
  "note":"0x...",
  "amount": 5,
  "toAddress":"0x..."
}

响应（200）：
{
  "success": true,
  "transferred": { "token":"ETH", "principal":5, "interest":0.012345 },
  "rateUsed": "Package Rate | Base Rate (if early)",
  "message": "Withdraw successful"
}

后端需计算利息（按日计），并依据 lock 到期与否决定使用 promisedAPR 或 baseAPR。

---

### 10) 用户笔记/记录列表
- GET /api/user/notes?address={address}

响应：
{
  "lends": [ { "note": "0x...", "token":"ETH", "amount": 10, "status":"active" } ],
  "stakes": [ { "note":"0x...", "token":"ETH", "amount":1.2, "status":"active" } ]
}

用途：前端用于在界面上搜索/自动补全交易 note、显示历史等。

---

## WebSocket 建议（可选，但可提升 UX）
- /ws/markets — 推送 market_update
- /ws/user/{address} — 推送 balance_update、notes_update、borrow_update

消息结构统一建议：{ "type": "<event>", "payload": {...} }

---

## 字段类型速查（常用）
- sym / symbol: string
- addr: string (合约地址) 或 "eth"
- amount / balance / price / usd / suppliedUSD / borrowedUSD: number
- APY: number（例如 2.65 表示 2.65%）
- note: string（0x + 64 hex chars，长度 66）
- stakeTime / lendTime / borrowTime: integer (unix seconds)

---

## 开发注意事项与建议
- 所有金额字段保留足够小数（token decimals），并在接口上明确单位；前端会负责格式化与展示短字符串（如 2.47M）。
- 对于涉及利息的计算，后端应明确利率基准（APR）与计息周期（日利/复利规则），并返回用于前端展示的 `currentDebtUSD` 或 `totalDebtValue`。
- 如需链上交互（approve、transfer、lend/withdraw 合约调用），后端应只做状态记录与计算，链上交易仍建议由前端/用户钱包发起；但可提供监控/回调接口以通知交易完成。

---

如果你希望我把这份文档再细化为 OpenAPI (Swagger) 或把示例请求输出为 curl / Postman 集合，我可以继续生成并放在仓库里。
