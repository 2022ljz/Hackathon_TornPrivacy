# Borrow 功能故障排除指南

## 🚨 问题描述
用户在尝试进行借款（borrow）操作时，链上交易持续失败。

## 🔍 可能原因分析

### 1. **合约部署问题**
- CollateralManager 合约可能未正确部署
- 合约地址配置错误
- 合约之间的连接问题（Mixer、LendingPool、CollateralManager）

### 2. **参数验证问题**
- commitment 格式不正确（必须是66位十六进制字符串）
- borrowToken 不支持（目前只支持 ETH）
- borrowAmount 超出可借额度

### 3. **抵押品状态问题**
- commitment 不存在或无效
- 抵押品已被锁定（已用于其他借款）
- 抵押品价值不足（LTV 比率不够）

### 4. **网络和钱包问题**
- 未连接到 Sepolia 测试网
- 钱包未正确连接
- Gas 费用不足

## 🛠️ 解决方案

### 步骤 1: 基础检查
1. **网络检查**
   ```javascript
   // 在浏览器控制台运行
   console.log('Chain ID:', await window.ethereum.request({ method: 'eth_chainId' }))
   // 应该返回 0x11155111 (Sepolia)
   ```

2. **钱包连接检查**
   ```javascript
   // 检查钱包连接状态
   const accounts = await window.ethereum.request({ method: 'eth_accounts' })
   console.log('Connected accounts:', accounts)
   ```

### 步骤 2: 合约状态检查
1. **运行合约状态检查**
   ```javascript
   // 在浏览器控制台运行
   window.debugContractStatus()
   ```

2. **测试合约部署**
   ```javascript
   // 测试所有合约是否正确部署
   await window.testContractDeployment()
   ```

### 步骤 3: 参数验证
1. **检查 commitment 格式**
   ```javascript
   // commitment 必须是66位十六进制字符串
   const commitment = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
   console.log('Commitment valid:', commitment.length === 66 && commitment.startsWith('0x'))
   ```

2. **检查支持的代币**
   ```javascript
   // 目前只支持 ETH
   const supportedTokens = ['ETH']
   console.log('Supported tokens:', supportedTokens)
   ```

### 步骤 4: 借款前置条件检查
1. **检查抵押品是否存在**
   - 确保已完成质押（stake）操作
   - 确保 commitment 记录在本地存储中

2. **计算可借额度**
   ```javascript
   // LTV (Loan-to-Value) 通常为 50%
   const collateralValue = 0.02 // ETH
   const ethPrice = 3500 // USD
   const ltv = 0.5
   const maxBorrowUSD = collateralValue * ethPrice * ltv
   console.log('Max borrow (USD):', maxBorrowUSD)
   ```

### 步骤 5: 使用故障排除脚本
1. **加载故障排除脚本**
   - 复制 `debug-borrow.js` 的内容到浏览器控制台

2. **运行快速测试**
   ```javascript
   await quickBorrowTest()
   ```

3. **详细故障排除**
   ```javascript
   await troubleshootBorrow(
     "0x你的commitment",
     "ETH", 
     0.01  // 借款金额
   )
   ```

## 🔧 常见错误及解决方法

### 错误 1: "Contract validation failed"
**原因**: commitment 无效或已被使用
**解决**: 
- 检查 commitment 是否来自有效的质押交易
- 确认该 commitment 未被用于其他借款

### 错误 2: "Borrow token ETH not found"
**原因**: 代币配置问题
**解决**:
- 检查 `src/config/contracts.js` 中的 TOKENS 配置
- 确保 ETH 已正确配置

### 错误 3: "Gas estimation failed"
**原因**: 交易可能会失败，或 gas 估算问题
**解决**:
- 检查钱包中是否有足够的 ETH 用于 gas 费用
- 尝试增加 gas limit

### 错误 4: "CollateralManager contract not initialized"
**原因**: 合约未正确初始化
**解决**:
- 重新连接钱包
- 刷新页面重新加载合约

## 📋 检查清单

- [ ] 连接到 Sepolia 测试网 (Chain ID: 11155111)
- [ ] 钱包已连接且有 ETH 余额
- [ ] 所有合约地址正确配置
- [ ] commitment 格式正确 (66位十六进制)
- [ ] 借款代币为 ETH
- [ ] 借款金额在可借额度内
- [ ] 抵押品未被锁定使用
- [ ] 有足够的 ETH 支付 gas 费用

## 🆘 紧急恢复

如果所有方法都失败，尝试：

1. **清除浏览器缓存**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

2. **重新连接钱包**
   - 断开 MetaMask 连接
   - 刷新页面
   - 重新连接钱包

3. **检查合约状态**
   - 在 Etherscan 上查看合约地址
   - 确认合约已部署且有代码

## 📞 获取帮助

如果问题仍然存在：
1. 保存浏览器控制台的完整错误日志
2. 记录失败的交易哈希（如果有）
3. 提供使用的 commitment 和借款参数
4. 联系技术支持并提供上述信息
