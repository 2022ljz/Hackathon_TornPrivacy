# PIONEER DeFi Platform - Sepolia 测试网部署指南

## 🚀 快速开始

### 1. 环境准备

确保你有以下工具：
- Node.js (版本 16+)
- MetaMask 钱包插件
- 一些 Sepolia ETH（用于支付 gas 费）

### 2. 获取 Sepolia 测试 ETH

访问以下水龙头获取测试 ETH：
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) - 每日 0.5 ETH
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia) - 每日 0.5 ETH
- [Chainlink Sepolia Faucet](https://faucets.chain.link/sepolia) - 每日 0.1 ETH

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入：

```env
# 你的私钥（用于部署合约）
PRIVATE_KEY=your_private_key_without_0x_prefix

# Sepolia RPC URL（推荐使用 Infura 或 Alchemy）
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Etherscan API Key（用于验证合约）
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 4. 一键部署

运行部署脚本：

```bash
./deploy-sepolia.sh
```

或者手动执行：

```bash
# 安装依赖
npm install

# 编译合约
npx hardhat compile

# 生成 ABIs
node scripts/generateABIs.js

# 部署到 Sepolia
npm run deploy:sepolia

# 测试合约功能
npx hardhat run scripts/test-contracts.js --network sepolia
```

### 5. 启动前端

```bash
npm run dev
```

访问 `http://localhost:5173` 开始使用！

## 🎯 功能测试

### MetaMask 设置

1. 确保 MetaMask 已连接到 Sepolia 测试网
2. 如果没有 Sepolia 网络，会自动提示添加

### 核心功能测试

#### 1. 隐私存款（Mixer）
- 选择代币和金额
- 生成隐私凭证（commitment）
- 存款到混币器
- 保存 nullifier 和 secret

#### 2. 抵押借贷
- 使用存款作为抵押品
- 锁定抵押品
- 借出其他代币
- 查看借贷记录

#### 3. 还款解锁
- 还款借出的代币
- 解锁抵押品
- 恢复提取权限

#### 4. 隐私提取
- 使用 nullifier 和 secret
- 提取到任意地址
- 断开存款地址关联

## 📋 合约地址

部署完成后，合约地址会保存在：
- `deployments/sepolia.json` - 完整部署信息
- `src/config/contracts.js` - 前端配置文件

主要合约：
- **Mixer**: 隐私混币器合约
- **LendingPool**: 借贷池合约
- **CollateralManager**: 抵押品管理合约
- **USDC/USDT Mock**: 测试代币合约

## 🔍 验证合约

在 Etherscan 上验证合约（可选）：

```bash
# 使用部署脚本输出的命令验证
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 🧪 测试场景

### 基础流程测试

1. **用户 A 存款**：
   - 存入 100 USDC 到混币器
   - 获得隐私凭证

2. **用户 A 借贷**：
   - 使用存款作为抵押
   - 借出 50 USDT

3. **用户 A 还款**：
   - 还回 50 USDT
   - 解锁抵押品

4. **隐私提取**：
   - 提取到新地址
   - 断开关联

### 高级场景测试

1. **多用户并发**：
   - 多个用户同时使用系统
   - 测试合约并发安全性

2. **异常处理**：
   - 测试各种边界条件
   - 验证错误处理机制

## 🛠️ 故障排除

### 常见问题

1. **部署失败**：
   - 检查网络连接
   - 确认账户有足够 ETH
   - 验证私钥格式

2. **前端连接问题**：
   - 确认 MetaMask 已连接 Sepolia
   - 检查合约地址配置
   - 刷新页面重试

3. **交易失败**：
   - 检查 gas 设置
   - 确认代币余额充足
   - 验证合约状态

### 调试技巧

1. 查看浏览器控制台日志
2. 检查 MetaMask 交易记录
3. 在 Sepolia Etherscan 查看交易状态
4. 使用 Hardhat console 调试合约

## 🌟 下一步

1. **主网部署**：
   - 审计合约代码
   - 配置主网参数
   - 部署到以太坊主网

2. **功能扩展**：
   - 添加更多代币支持
   - 实现 DeFi 组合功能
   - 集成外部价格预言机

3. **UI/UX 优化**：
   - 改进用户界面
   - 添加更多统计数据
   - 优化移动端体验

## 📚 相关链接

- [Hardhat 文档](https://hardhat.org/docs)
- [Sepolia 测试网信息](https://sepolia.dev/)
- [MetaMask 开发者文档](https://docs.metamask.io/)
- [Ethers.js 文档](https://docs.ethers.io/)

---

🎉 恭喜！你的 PIONEER DeFi Platform 已成功部署在 Sepolia 测试网！
