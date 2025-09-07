# 🎯 Sepolia 部署准备指南

## ✅ 钱包验证通过！

**部署者地址：** `0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f`
**私钥配置：** ✅ 正确

## 🚰 第一步：获取测试ETH

### 访问以下水龙头网站：

1. **https://sepoliafaucet.com/**
   - 输入地址：`0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f`
   - 每天可以领取 0.5 ETH

2. **https://www.alchemy.com/faucets/ethereum-sepolia**
   - 需要创建免费账户
   - 每天可以领取 0.5 ETH

3. **https://sepolia-faucet.pk910.de/**
   - 挖矿式水龙头
   - 更高的获取量

### 检查余额：
访问 https://sepolia.etherscan.io/address/0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f

## 🔧 第二步：获取可靠的RPC API

### 方法A：Alchemy (推荐)
1. 访问 https://www.alchemy.com/
2. 创建免费账户
3. 创建新的App (选择Sepolia网络)
4. 复制API密钥
5. 更新 .env 文件：
   ```
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   ```

### 方法B：Infura
1. 访问 https://infura.io/
2. 创建免费账户
3. 创建新项目
4. 复制项目ID
5. 更新 .env 文件：
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   ```

## 🚀 第三步：部署命令

一旦有了测试ETH和可靠的RPC，运行：

```bash
npx hardhat run scripts/deploy-sepolia.cjs --network sepolia
```

## 📱 第四步：MetaMask配置

### 添加Sepolia网络：
- 网络名称: `Sepolia Test Network`
- RPC URL: `https://sepolia.infura.io/v3/` (或您的API)
- Chain ID: `11155111`
- 符号: `ETH`
- 区块浏览器: `https://sepolia.etherscan.io`

### 导入您的账户：
- 在MetaMask中选择"导入账户"
- 输入私钥：`cbc99ebe11c0f930d26372c29fc8362852de86bc141061362c1218e389c6b97e`
- ⚠️  注意：这是测试私钥，不要在主网使用

## 🎯 最终测试

### 部署后，您将能够：
1. 在Sepolia上看到您的ERC-20代币
2. 使用真实的approve()函数
3. 在Etherscan上验证交易
4. 满足竞赛的所有要求

## 📊 当前状态
- ✅ 私钥配置正确
- ✅ 部署脚本准备完毕
- ✅ 智能合约编译通过
- ⏳ 等待获取测试ETH
- ⏳ 等待配置RPC端点

获取到测试ETH和RPC配置后，我们就可以立即部署了！
