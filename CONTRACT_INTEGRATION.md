
# 合约集成清单

---

## 快速总览：按板块的可执行任务清单（按优先级排序）

以下清单把文档中每个板块的“待办”细化为可直接执行的任务（包含要新增的工具/文件与优先级），便于分工与 sprint 排期。

1) Stake（存款 / Mixer） — 优先级：高
  - [ ] 新增 `src/utils/contracts.js`，实现 `getContract`, `approveIfNeeded`, `sendAndWait`, `formatBN`（用于后续所有写操作）
  - [ ] 在 `src/abis/` 放入 `Mixer.json` ABI 或通过构建流程获取 ABI
  - [ ] 修改 `StakeBorrowPanel.vue` 中 `stake()`：
    - 使用 `approveIfNeeded`（若为 ERC20）
    - 调用 `Mixer.deposit(commitment, tokenAddr, amount)`（或通过 `msg.value` 发送 ETH）
    - 在 receipt 中解析 `Deposit` 事件并把本地 note 标记为 `on-chain`（记录 txHash/blockNumber）
  - [ ] UX：备份 note 导出/复制流程与安全提示（提醒用户不得上传 secret）

2) Borrow（锁定并借款 / CollateralManager + LendingPool） — 优先级：高
  - [ ] 在 `src/abis/` 放入 `CollateralManager.json` 与 `LendingPool.json`
  - [ ] 在前端实现 `CollateralManager.lockAndBorrow` 链上调用；发送 `commitment, borrowToken, borrowAmount, toAddress`
  - [ ] 在 receipt 中解析 `Borrow` 事件并把 `loanId` 写入本地 `stakeNotes[commitment]`
  - [ ] UI：新增 loanId 显示与抵押锁定状态提示
  - [ ] 后端/索引器：建立 `loanId -> commitment` 的映射（用于 repay/unstake 查找）

3) Repay / Unstake（偿还并解锁） — 优先级：高
  - [ ] 实现 repay 余额计算器（本金+利息、自然日规则）并显示到 UI
  - [ ] 使用 `approveIfNeeded` 为 repay 的 ERC20 执行授权
  - [ ] 在前端实现 `CollateralManager.repayAndUnlock` 链上调用并在 receipt 中解析 `Repay` 与 `Unlocked` 事件
  - [ ] 在 `stakeNotes` 中标记 note 为 `unlocked` 并提示用户可 `withdraw`
  - [ ] 支持部分偿还与多币种偿还的 UX（后续迭代）

4) Withdraw（提现 / Mixer） — 优先级：中
  - [ ] 在前端实现 commitment 预检：`mixer.getDeposit(commitment)` 与 `nullifierSpent` 检查
  - [ ] 实现 `mixer.withdraw(to, nullifier, secret)` 的链上调用；或实现 relayer 模式（EIP-712 签名）作为可选项
  - [ ] 在 receipt 中解析 `Withdraw` 事件并删除/标记本地 note
  - [ ] UI：隐私警告与离线备份导出功能

5) Lend（提供流动性 / LendingPool） — 优先级：中
  - [ ] 实现实时 APY 接口：后端 API `GET /market/apy?token=...&duration=...` 或链上参数读取
  - [ ] 实现 `approveIfNeeded` + `LendingPool.fund` 流程并在 receipt 后更新池子流动性展示
  - [ ] 在 UI 上实现 lockDuration 收益模拟器（预估收益、到期日）

6) Balance / Wallet（余额与连接） — 优先级：高
  - [ ] 在 `walletStore.connectWallet()` 后自动触发 `refreshBalances()` 并显示来源标签（on-chain/loading/local）
  - [ ] 将 `config.tokens.price` 替换为实时价格来源并在价格变动时刷新 UI

7) 索引器 & 自动化测试 — 优先级：高
  - [ ] 快速实现事件 watcher（`scripts/watcher.js`）索引最小事件集合并输出到本地 JSON（便于前端快速查询）
  - [ ] 或使用 The Graph 编写 subgraph（长期方案）
  - [ ] 为每个写操作编写单元/集成测试（在测试网验证事件流转）

8) 安全与发布准备 — 优先级：高
  - [ ] 在 UI 中对 unlimited approve 做风险提示；考虑使用限额 approve 策略
  - [ ] 在索引器与前端处理重组（reorg）策略，避免基于未最终化块显示永久状态
  - [ ] 在合约交互大批量 RPC 请求时添加并发限制与重试逻辑

---

## 合约索引表（前端模块 → 合约 → 是否需新增合约）

| 前端模块 | 主要智能合约 | 是否需要新增合约 | 备注 |
|---|---|---:|---|
| BalancePanel / Wallet | 读取 ETH / ERC20 (via provider & IERC20) | 否 | 仅读链上数据，使用现有 ERC20 ABI |
| Stake (存款) | `Mixer.sol` | 否 | 使用 Mixer.deposit；需 ERC20 approve（若非 ETH） |
| Borrow (锁定并借款) | `CollateralManager.sol`, `LendingPool.sol`, `Mixer.sol` | 否 | 使用 lockAndBorrow → LendingPool.borrowFor；需事件索引 |
| Repay / Unstake | `CollateralManager.sol`, `LendingPool.sol`, `Mixer.sol` | 否 | repayAndUnlock 流程；依赖 loanId 映射 |
| Withdraw | `Mixer.sol` | 否 | withdraw 由 note 的 nullifier/secret 驱动；注意私密性 |
| Lend (提供流动性) | `LendingPool.sol` | 否 | LendingPool.fund；lockDuration 与 APY 由后端/合约参数提供 |
| 索引器 / 后端服务 | — (off-chain) | 可选（非链上合约） | 建议 The Graph 或自建 watcher；用于映射与历史查询 |
| Relayer / Meta-tx（可选） | 可能需要 Forwarder 合约 | 可选 | 若要实现 gasless 或代发，可能需新增轻量 Forwarder 合约与后端服务 |

---

# 具体任务

---



## 1) 连接钱包（Connect Wallet）

- 前端发送请求：
  - 方法：`walletStore.connectWallet()`
  - 数据：无
- 智能合约收到的数据：无（只在浏览器侧处理）
- 智能合约输出：无
- 前端收到并展示：
  - address, chainId, isConnected

- 实现状态 / 待办：
  - [x] 前端触发钱包连接并保存 address/chainId（已实现）
  - [ ] 连接后自动触发一次链上余额刷新并在 UI 显示加载状态（部分实现，需要完善）

---

## 2) 读取用户余额（BalancePanel）
- 前端发送请求：
  - 方法：`walletStore.getBalance(symbol)` 或 `refreshBalances()`
  - 数据：token symbol
- 智能合约收到的数据：
  - ETH: provider.getBalance(address)（RPC）
  - ERC20: tokenContract.balanceOf(address)
- 智能合约输出：
  - 返回 uint256 balance（BigNumber）
- 前端收到并展示：
  - 解析后的数量（formatUnits），以及 USD 估值（使用 `config.tokens.price` 或实时价格源）
  - 数据来源标签：on-chain / loading / local

- 实现状态 / 待办：
  - [x] 支持 ETH 与 ERC20 的读取（已实现，增加了 provider 兼容性）
  - [x] UI 回退到 local balance 并显示来源标签（已实现）
  - [ ] 将 price 替换为实时市场价格（CoinGecko / Chainlink）（待实现）
  - [ ] 优化批量读取（并发控制与重试）（待实现）

---

## 3) 存款（Stake -> Mixer.deposit）
- 目标概述：用户在前端生成私密 note（nullifier + secret），由 note 计算出 commitment，随后把 commitment 与 token/amount 一并提交到链上 `Mixer.deposit`，合约记录 deposit 并发出事件；前端在交易确认后把本地 note 标记为“已上链”。

- 前端发送请求（建议字段与流程）：
  - 方法：组件 `stake()`（用户点击 Stake 后触发）
  - 必需字段（前端需准备并校验）：
    - commitment（bytes32，前端由 nullifier+secret 计算）
    - tokenAddress 或 tokenSymbol
    - amount（uint256，按 token decimals）
    - walletAddress（可选，tx 由钱包签名，前端可记录发起者）
  - 私密数据（绝对不要发送给第三方）：
    - nullifier, secret（仅本地持有，用于 later withdraw/repay/unlock；不应发送到后端）
  - 注意：若是原生 ETH，调用 deposit 时需要在 tx 中附带 value；若是 ERC20，需先 approve 给 Mixer 或合约设计支持的中介地址。

- 前端预检（在发起链上交易前应执行）：
  1. 验证 amount 为正且小于用户可用余额
  2. 若 ERC20，检查 allowance：ERC20.allowance(user, mixerAddr) >= amount；如不足调用 approve
  3. 计算并记录 commitment（local store），避免重复提交同一个 note
  4. 在 UI 提示用户保存 nullifier/secret（离线备份警告）

- 智能合约方法与内部处理：
  - 合约方法（Mixer.sol）：
    - 函数签名示例：`function deposit(bytes32 commitment, address token, uint256 amount) external payable`
      - 若 token 为 ETH，则通过 `msg.value` 传入金额；若为 ERC20 则 amount 为 ERC20 转账前端已 approve
  - 合约内部处理：
    - 校验输入（如 amount > 0、commitment 未被使用等，视合约实现而定）
    - 存储 deposits[commitment] = Deposit({ token, amount, withdrawn:false, locked:false, owner: maybe blank })
    - 发出事件：`Deposit(commitment, token, amount)`

- 合约输出（链上可观察的反馈）：
  - 事件：`Deposit(bytes32 indexed commitment, address indexed token, uint256 amount)`
  - 交易 receipt（包含 txHash、blockNumber、gasUsed）
  - （合约通常不返回额外数据，但事件中包含的信息足够前端确认）

- 前端收到并展示（建议接收字段与 UI 行为）：
  1. 在钱包签名并发送 tx 后，展示 txHash 与 pending 状态
  2. 在 receipt 确认后：
     - 显示 tx 成功/失败状态、blockNumber、gasUsed
     - 从 receipt 的 logs 或事件解析出 `Deposit` 事件内容（commitment, token, amount）并核对
     - 标记本地 note 为 "on-chain"（例如 noteRecord.status = 'on-chain'）并 persist
     - 刷新用户链上余额（调用 `walletStore.refreshBalances()`）
     - 显示成功通知并提供事件/tx 链接（Explorer URL）

- 额外实现细节与隐私注意：
  - nullifier/secret 必须在客户端本地安全保存，千万不要上传到第三方服务或后端。
  - 如果产品计划实现 relayer 或 meta-tx，需设计如何在不泄露 secret 的情况下授权 relayer（通常 relayer 不应获得 secret）。

- 常见错误与边界情况：
  - ERC20 allowance 不足导致 tx revert（需在前端先做 approve）
  - 重复提交相同 commitment（应在本地检测并阻止）
  - 链上 revert 或 gas 不足（应显示错误并提供重试）

- 实现状态 / 详细待办（可执行清单）：
  - [x] 本地生成并保存 note（nullifier/secret）并计算 commitment（已实现）
  - [ ] 实现 `approveIfNeeded(tokenAddr, mixerAddr, amount)` 工具并在 stake 流程前调用（优先）
  - [ ] 前端发起 `Mixer.deposit(commitment, tokenAddr, amount)`（对 ETH 使用 value，对 ERC20 使用 approve + deposit）
  - [ ] 在 tx receipt 中解析 `Deposit` 事件并把本地 note 标记为 `on-chain`（包括记录 txHash/blockNumber/gasUsed）
  - [ ] 在成功后刷新链上余额并更新 UI（walletStore.refreshBalances()）
  - [ ] 添加 UX：在 stake 前提醒用户备份 note，并在成功后提供复制/导出已上链 note 的选项
  - [ ] 在后端/索引器（可选）记录 Deposit 事件以便查询历史和统计（建议）

---


## 4) 锁定并借款（CollateralManager.lockAndBorrow）
- 目标概述：把本地的 deposit（由 commitment 标识）在 Mixer 中标记为 locked，并通过 LendingPool 为用户发放借款。前端需要准备借款参数、做本地与链上预检、发起链上交易（或签名交由 relayer），并在 receipt 或事件中解析 loanId 以便后续 repay/unlock。

- 前端发送请求（建议字段）：
  - 方法：组件 `borrow()`（用户填写 `borrowAmount`、`borrowToken`、`toAddress` 后点击 Borrow）
  - 必需字段：
    - commitment（bytes32，来源于本地 note）
    - borrowToken（address 或 symbol）
    - borrowAmount（uint256，按 token decimals）
    - toAddress（接收借款的地址，通常为用户钱包地址）
  - 可选字段（relayer / off-chain 模式）：clientTimestamp，signature（EIP-712）

- 前端预检（必须）：
  1. 验证本地存在对应 note 且 note.status === 'active' 且未被标记为 locked
  2. 计算最大可借额度：读取 deposit.amount 与当前价格，使用配置的 LTV 计算最大 borrow 能力（若后端或合约提供更精确接口应优先使用）
  3. 确认 borrowAmount <= remaining borrowable
  4. 确认 borrowToken 在支持列表内
  5. 如果需要 relayer，避免在签名中暴露 secret；仅签名 commitment/loan 请求摘要

- 智能合约交互（典型流程）：
  - 调用：`CollateralManager.lockAndBorrow(bytes32 commitment, address borrowToken, uint256 borrowAmount)`
  - 合约内部：
    - 检查 commitment 对应的 deposit 存在且未 withdrawn 且未 locked
    - 标记 `mixer.lock(commitment)`（或更新 mixer 中的 locked 状态）
    - 计算 face/collateralAmount（若需）并调用 `LendingPool.borrowFor(borrowerOrTo, borrowToken, borrowAmount, faceAmount)`
    - 生成 loanId 并记录 `collaterals[commitment].loanId = loanId`

- 合约输出 / 可供前端使用的字段：
  - Events: `Mixer.Locked(bytes32 indexed commitment)`
  - Events: `LendingPool.Borrow(uint256 indexed loanId, address borrower, address token, uint256 amount, uint256 collateralAmount)`
  - tx receipt: txHash, blockNumber, gasUsed

- 前端收到并展示（推荐字段与 UI 行为）：
  1. wallet 发起 tx 后，显示 txHash 与 pending 状态
  2. 在 receipt 中解析 `Borrow` 事件，获取 loanId、borrower、token、amount、collateralAmount
  3. 更新本地记录：`stakeNotes[commitment].borrows[token] = { amount, borrowTime, loanId }`
  4. 刷新借款币种余额（walletStore.refreshBalances 或索引器查询）
  5. 显示 loanId 与借款详情，提示抵押仍被锁定

- 签名 / relayer 说明：
  - 链上交易：由用户钱包签名并发送 Tx（无需额外 EIP-712 签名字段）
  - Relayer 模式：前端只发送签名摘要（不发送 secret）；后端/relayer 按协议广播交易，需在产品层设计防重放与费率

- Approve / 授权注意：
  - lock 操作一般不需要额外 approve（资金在 deposit 时已由用户转入或已 approve）
  - 如果协议需要用户预付手续费或其他代币作为费，则需先 approve 对应代币

- 错误与边界情况：
  - 抵押不足（超出 LTV）或 deposit 状态不允许被锁定（已 withdrawn 或 已 locked）
  - 索引器延迟导致无法立即通过 loanId 查询详情（应优先使用 receipt logs）
  - 并发请求竞争：两个客户端尝试对同一 commitment 发起 lockAndBorrow

- 实现状态 / 可执行待办（优先级标注）：
  - [ ] 在前端实现链上调用 `CollateralManager.lockAndBorrow`（优先）
  - [ ] 在 tx receipt 中解析 `Borrow` 事件并把 loanId 写入本地 stakeNotes（优先）
  - [ ] 在 UI 显示 loanId、借款到帐与抵押锁定状态（中）
  - [ ] 构建索引器以便通过 loanId 快速查询 loan 详情（后）
  - [ ] 在 repay 流程中使用 loanId->commitment 映射以确保 repayAndUnlock 调用准确（中）

---

## 5) 偿还并解锁（CollateralManager.repayAndUnlock）
- 目标概述：用户偿还借款（部分或全部），当 loan 被完全偿还后合约解锁对应的 commitment 抵押物（在 Mixer 中）。前端需根据 loanId 或索引器信息计算待还金额，执行 approve（若为 ERC20），调用 repayAndUnlock，并在 receipt/事件后更新本地状态与余额。

- 前端发送请求（必需字段与 UX）：
  - 方法：`unstake()`（用户选择要偿还的借款或全部偿还后点击 Unstake）
  - 必需字段：
    - commitment（bytes32）
    - repayToken（address 或 symbol）
    - repayAmount（uint256，按 decimals）
    - payerAddress（walletAddress）
  - 推荐字段：loanId（若前端已知，直接传能减少索引查询）

- 前端预检（严格）：
  1. 若已知 loanId，从索引器或链上读取 loan 的剩余欠款（含利息）并计算实际 repayAmount
  2. 检查用户余额是否足够
  3. 若 repayToken 为 ERC20，检查并执行 `approveIfNeeded(poolAddr, repayAmount)`
  4. 提示用户如果 repay 仅为部分偿还则不会触发 unlock

- 智能合约方法与交互：
  - 典型调用：`CollateralManager.repayAndUnlock(bytes32 commitment, uint256 repayAmount)` 或 `repayAndUnlock(bytes32 commitment, address repayToken, uint256 repayAmount)`（请根据合约 ABI 确认）
  - 合约内部：
    - 查找 `collaterals[commitment].loanId`
    - 调用 `LendingPool.repayFrom(loanId, repayAmount, msg.sender)` 更新 loan 余额
    - 若 loan 完全偿还，调用 `mixer.unlock(commitment)` 并将抵押标记为未锁定

- 合约输出 / 事件：
  - `LendingPool.Repay(uint256 indexed loanId, address payer, uint256 amount)`
  - `Mixer.Unlocked(bytes32 indexed commitment)`（当 loan 完全偿还且解锁时）
  - tx receipt

- 前端收到并展示（交互与字段）：
  1. 发起 tx 后显示 txHash/pending
  2. 在 receipt 或 logs 中解析 `Repay` 和 `Unlocked` 事件
  3. 当 `Unlocked` 事件出现时：
     - 将本地 stakeNotes[note].status 更新为 `unlocked` 或从 active 列表移除
     - 显示可领取的抵押物数额（从 deposit.amount 中读取）
     - 刷新链上余额并提示用户执行 withdraw（若需要）

- Approve / 支付注意：
  - 若 repay 使用 ERC20，必须 `approve(poolAddr, repayAmount)`（建议使用 approveIfNeeded）
  - 若 repay 使用 ETH，直接通过 payable tx 传入 `msg.value`

- 错误与边界：
  - 部分偿还不会触发 unlock
  - 索引器延迟可能导致前端短时无法检索 loan.repaid 状态；应以 receipt logs 为准
  - 重组或并发 repay 需合约端有幂等/安全保护

- 实现状态 / 逐项待办（可执行）：
  - [ ] 实现 repay 余额计算器（显示本金 + 利息 + 到期/自然日规则）（优先）
  - [ ] 在前端实现 `approveIfNeeded` 并在 repay 前调用（优先）
  - [ ] 实现链上调用 `CollateralManager.repayAndUnlock` 并等待 receipt（待实现）
  - [ ] 解析 `Repay` 与 `Unlocked` 事件并更新本地 note / UI（待实现）
  - [ ] 支持多币种偿还与部分偿还 UX（中）
  - [ ] 确保索引器把 loan.repaid 与 unlocked 状态及时同步（后）

---

## 6) 提现（Mixer.withdraw）
- 目标概述：用户使用本地持有的 note（nullifier + secret）提取对应 deposit 的资金，前端需要在本地计算 commitment 并在链上发起 withdraw 交易或（可选）把签名数据交给 relayer 广播。

- 前端发送请求（候选实现）：
  - 方法：组件 `withdraw()` 或 `LendWithdrawPanel.vue` 中的 withdraw 按钮触发
  - 必需字段（直接链上 tx 情形）：
    - recipient（walletAddress 或任意接收地址）
    - nullifier（bytes32，本地保存）
    - secret（bytes32，本地保存）
  - 可选字段（使用 relayer / off-chain 提交情形）：
    - clientTimestamp（防重放）
    - signature（EIP-712 样式签名，用于让 relayer/后端验证请求真实性）
    - relayerFee / relayerAddr（若通过 relayer 支付 gas）

- 前端预检（强烈建议在发送 tx 前执行）：
  1. 在本地计算 commitment = keccak256(nullifier, secret)（与合约一致的哈希方式）
  2. 调用 `mixer.getDeposit(commitment)`（若合约提供）或读取 deposits 映射以验证：
     - deposit 存在且 amount > 0
     - deposit.withdrawn == false
     - deposit.locked == false（若 locked 则不能 withdraw）
  3. （可选）若合约暴露 nullifierSpent 映射，可调用查看该 nullifier 是否已使用
  4. 若任何预检查失败，阻止用户发起 withdraw，显示具体错误原因

- 智能合约交互（链上直接调用）：
  - 合约方法：`Mixer.withdraw(address to, bytes32 nullifier, bytes32 secret)`
  - 合约内部应做：
    - 计算 commitment = keccak256(nullifier, secret)
    - 检查 deposits[commitment] 存在且未 withdrawn 且未 locked
    - 检查 nullifier 未被使用（防重放）
    - 执行 token 转账到 `to`（对于 ERC20，合约执行 transfer）
    - 标记 nullifierSpent 并 emit `Withdraw(...)`

- 智能合约输出 / 事件：
  - `Withdraw(to, commitment, token, amount, nullifierHash)`（或合约定义的等价事件）
  - 转账发生到 `to` 地址

- 前端收到并展示（交互流程）：
  1. 用户点击 Withdraw -> 前端执行本地预检（commitment、getDeposit、nullifierSpent）
  2. 若预检通过，构建并通过 signer 发起 `mixer.withdraw(to, nullifier, secret)` 交易（钱包会要求用户确认并签名 tx）
  3. 显示 tx pending（tx hash），并在 receipt 后：
     - 监听 `Withdraw` 事件或根据 receipt 确认转账成功
     - 删除或标记本地 note 为已提现（并提示用户备份 nullifier/secret 已无用或删除）
     - 刷新链上余额显示（walletStore.refreshBalances()）

- 签名与 relayer 说明：
  - 直接链上调用情形：不需要额外的 EIP-712 签名；钱包会对交易进行签名并广播
  - relayer / gasless 情形：
    - 前端需要生成签名（EIP-712）包含：recipient, nullifierHash/commitment（注意不要把 secret 明文发给第三方）, clientTimestamp, 授权信息
    - 如果 relayer 模式，必须在协议设计上保证 secret 不被泄露；通常 relayer 只接收签名或零知识证明，而不接收 secret 本文档仅作提示

- Approve（是否需要）：
  - Withdraw 操作本身通常由合约向用户转账，因此用户无需对合约做 ERC20.approve（approve 由 deposit 时执行）
  - 仅在非常特殊的 relayer /代付模式下，或合约设计要求时，才可能需要额外的 approve（此处默认无需 approve）

- 错误与边界情况：
  - deposit 被锁定（locked=true）时不能 withdraw，应提示用户先执行 repayAndUnlock 流程
  - nullifier 已被使用（double-withdraw）时回退并提示
  - 链上重组或 pending 超时：提供重试/检查 tx 状态的入口
  - 若用户把 secret 交给后端或 relayer，会导致隐私泄露（在 UI 明显提示风险）

- 实现状态 / 待办（建议细化为可执行项）：
  - [x] 本地 note 生成与存储（nullifier/secret 存储逻辑已存在）
  - [ ] 在前端实现 commitment 的本地计算并调用 `mixer.getDeposit(commitment)` 进行预检（待实现）
  - [ ] 实现直接链上调用 `mixer.withdraw(to, nullifier, secret)`（待实现）
  - [ ] 在 tx receipt 后监听 `Withdraw` 事件并删除/标记本地 note（待实现）
  - [ ] 对 relayer 模式：设计签名方案（EIP-712）并实现安全的 off-chain 提交（待讨论/实现）
  - [ ] 在 UI 明确提示用户不要将 secret 发送到不受信任的服务，并提供导出/离线备份功能（待实现）

---

## 7) 放入池子 / 提供流动性（LendingPool.fund）
- 前端发送请求：
  - 方法：组件 `lend()`（当前为本地模拟）
  - 发送数据（建议字段）：
    - walletAddress（发起者钱包地址）
    - lendAmount（uint256，按 token decimals）
    - tokenAddress 或 tokenSymbol
    - lockDuration（以秒或天为单位，前端与合约约定单位）
    - clientTimestamp（可选，用于防重放）
    - signature（可选，仅在后端/合约要求 off-chain 授权时需要）
  - 前端说明：点击 Lend 时前端应收集以上字段并先检查 approve 状态（见下方 Approve 清单），然后发起链上 tx 或向后端签名提交（取决于实现方式）
- 智能合约收到的数据：
  - 直接链上调用情形：`LendingPool.fund(address token, uint256 amount)`（需 ERC20 approve）
  - 若 lockDuration 影响收益率，合约可能需要额外参数或由池子合约通过锁定记录计算（例如 `fund(token, amount, lockDuration)`）——请确认合约 ABI
- 智能合约输出：
  - 事件：`Fund(from, token, amount)`（若合约返回 lockDuration 相关收益信息，也会通过事件或后续查询暴露）
  - 合约内部：增加池子流动性，可能生成用户的 lent-entry（id 或记录）
- 前端收到并展示：
  - tx hash / status，交易确认后更新用户余额与池子流动性展示
  - 显示根据 lockDuration 计算的预计 APY（来自后端/合约/市场服务）

- 实现状态 / 待办（含你提出的三项关注点）：
 1) lock duration 的 APY 要根据后端/合约或市场模块做实时更新：
  - [ ] 在 UI 中把 lockDuration 的 APY 由静态展示改为实时请求（优先级高）
    - 可选实现方式：
      - 从后端 API 获取实时 APY（推荐）
      - 或者从链上合约读取策略参数并在前端根据公式计算
    - 待办细项：
      - [ ] 定义后端接口：GET /market/apy?token=...&duration=... 返回 apy
      - [ ] 在 `Lend` 面板中，对 lockDuration 变化做防抖请求并更新 UI（避免频繁请求）

 2) 点击 Lend 时需要传送到链/后端的字段与签名需求：
  - [x] 需要传：walletAddress, lendAmount, tokenAddress/tokenSymbol, lockDuration（已列出）
  - [ ] 是否需要 signature：取决于实现方式
    - 链上直接发交易情形：不需要额外 signature（交易由钱包签名并发送，钱包会签署 tx）
    - 后端/签名流（off-chain order 或预签名模式）：需要 signature（例如 EIP-712）用于后端或合约验证
  - 待办细项：
    - [ ] 明确产品流程：是链上直发（用户钱包发交易）还是先签名再提交到后端（后端替用户广播）
    - [ ] 若采用 EIP-712 签名，前端实现签名生成功能并传递 signature 与 clientTimestamp

 3) 点击 Approve 的清单（Approve 流程详解）：
  - [ ] 检查当前 allowance：ERC20.contract.allowance(user, spender) >= lendAmount？
  - [ ] 若不足，调用 ERC20.approve(spender, approveAmount)
    - 推荐 approveAmount = lendAmount 或更常见的 unlimited (Max uint256)（注意安全提示）
  - [ ] 等待 approve tx 被矿工确认（显示 tx hash/status）
  - [ ] 在 approve 成功后启用 Lend 按钮并提示用户继续执行 fund 操作
  - 实作建议：
    - 提供 `approveIfNeeded(tokenAddr, spenderAddr, amount)` 工具函数（见 `src/utils/contracts.js` 待创建）
    - 在 UI 上把 Approve 与 Lend 分为两个明确步骤，并在 Approve 时提示 gas 估计与安全说明

- 其他待办：
  - [ ] 在后端或索引器记录每次 fund 的 lockDuration 与资金池状态，便于历史查询与 APY 回溯
  - [ ] 在前端实现对 lockDuration 相关收益的模拟器（预估收益、年化收益、利息到期时间）


---

## 索引器 & 公共服务（建议）
- 目标：把链事件转换为易查询的数据结构（commitment -> deposit, loanId -> loan info, user -> event list）
- 待办：
  - [ ] 使用 The Graph 编写 subgraph（推荐）或
  - [ ] 编写最小 watcher（scripts/watcher.js）监听并写入本地 DB/JSON（短期快速验证）

---

## 总体实现状态（高层）
- 已在前端实现：
  - [x] 钱包连接、UI 交互、local 模拟的 stake/lend/borrow/withdraw、余额显示与回退
- 尚未实现（链上交互）：
  - [ ] approve + Mixer.deposit / Mixer.withdraw
  - [ ] CollateralManager.lockAndBorrow / repayAndUnlock
- 本文档基于当前仓库结构与合约源代码（`Contracts/` 下的 `Mixer.sol`, `CollateralManager.sol`, `LendingPool.sol`）。
- 假设前端配置（`walletStore.config`）中包含必要合约地址字段：
  - `mixerAddr`, `lendingAddr`, `collateralManagerAddr`（如缺失请在 Config 中补齐）
- 假设合约 ABI 可通过构建流程或手动放置到 `src/abis/`（若需）以便前端 `getContract` 使用。
- 假设链上价格源非合约内置，前端需通过后端或市场 API 获取实时 price（CoinGecko / Chainlink）。
- 假设私有数据（nullifier/secret）仅在客户端本地保存，不会上传到任何后端。

## 必需的前端配置键（请在 `walletStore.config` 中检查/补齐）

- `mixerAddr` — Mixer 合约地址
- `lendingAddr` — LendingPool 合约地址
- `collateralManagerAddr` — CollateralManager 合约地址
- `tokens` — 代币配置数组（包含 sym, addr, decimals, price）
- `ltv`, `borrowAPR` — 风控与利率基础配置

## 建议索引的合约事件（最小集合）

- `Mixer.Deposit(commitment, token, amount)`
- `Mixer.Withdraw(to, commitment, token, amount, nullifierHash)`
- `Mixer.Locked(commitment)` 和 `Mixer.Unlocked(commitment)`
- `LendingPool.Fund(from, token, amount)`
- `LendingPool.Borrow(loanId, borrower, token, amount, collateralAmount)`
- `LendingPool.Repay(loanId, payer, amount)`



