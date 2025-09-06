# 🚰 Sepolia ETH 水龙头指南

## 快速获取Sepolia ETH的方法

### 🔥 推荐水龙头（最快最可靠）

#### 1. Alchemy Sepolia Faucet ⭐⭐⭐⭐⭐
- **网址**: https://sepoliafaucet.com/
- **每日限额**: 0.5 ETH
- **要求**: GitHub账户
- **速度**: 即时到账
- **推荐理由**: 最稳定，额度最高

#### 2. Chainlink Sepolia Faucet ⭐⭐⭐⭐
- **网址**: https://faucets.chain.link/sepolia
- **每日限额**: 0.1 ETH
- **要求**: Twitter或GitHub账户
- **速度**: 1-2分钟
- **推荐理由**: Chainlink官方，很可靠

#### 3. QuickNode Sepolia Faucet ⭐⭐⭐⭐
- **网址**: https://faucet.quicknode.com/sepolia
- **每日限额**: 0.05 ETH
- **要求**: 社交媒体验证
- **速度**: 即时到账

#### 4. Infura Sepolia Faucet ⭐⭐⭐
- **网址**: https://www.infura.io/faucet/sepolia
- **每日限额**: 0.05 ETH
- **要求**: Infura账户
- **速度**: 1-5分钟

### 🌟 备用水龙头

#### 5. Sepolia PoW Faucet
- **网址**: https://sepolia-faucet.pk910.de/
- **获取方式**: 通过挖矿获得
- **优点**: 无需注册，可以持续获取
- **缺点**: 需要时间挖矿

#### 6. Paradigm Faucet
- **网址**: https://faucet.paradigm.xyz/
- **每日限额**: 0.1 ETH
- **要求**: Twitter账户

### 📱 Discord水龙头机器人

#### 7. Buildspace Discord
- 加入Discord: https://discord.gg/buildspace
- 使用命令: `/faucet your-wallet-address`

#### 8. LearnWeb3 Discord
- 加入Discord: https://discord.gg/learnweb3
- 在#faucet频道请求

## 🎯 使用步骤

### 步骤1: 准备钱包地址
```
你的钱包地址应该是这样的格式：
0x1234567890123456789012345678901234567890
```

### 步骤2: 社交账户验证
大多数水龙头需要：
- ✅ GitHub账户（推荐）
- ✅ Twitter账户
- ✅ Discord账户

### 步骤3: 请求ETH
1. 访问水龙头网站
2. 连接钱包或输入地址
3. 完成社交验证
4. 点击"Request"或"Get ETH"
5. 等待到账（通常1-5分钟）

## ⚡ 快速脚本

我来为你创建一个自动化脚本来检查你的Sepolia余额：

```javascript
// 检查Sepolia余额的脚本
async function checkSepoliaBalance(address) {
    const response = await fetch('https://sepolia.infura.io/v3/YOUR_PROJECT_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1
        })
    });
    
    const data = await response.json();
    const balanceWei = parseInt(data.result, 16);
    const balanceEth = balanceWei / 1e18;
    
    console.log(`Sepolia ETH Balance: ${balanceEth.toFixed(6)} ETH`);
    return balanceEth;
}
```

## 💡 获取更多ETH的技巧

### 技巧1: 多个水龙头组合使用
- 同时使用3-4个不同的水龙头
- 总共可以获得1-2 ETH/天

### 技巧2: 创建多个钱包
- 为不同项目创建专用钱包
- 每个钱包都可以从水龙头获取ETH

### 技巧3: 加入开发者社区
- 许多Discord/Telegram群有水龙头机器人
- 开发者社区通常更慷慨

### 技巧4: 参与测试网活动
- 关注测试网空投活动
- 参与协议测试可能获得更多ETH

## 🚨 注意事项

### ⚠️ 常见问题
- **Too many requests**: 等待24小时后重试
- **Invalid address**: 确保使用正确的以太坊地址格式
- **Network congestion**: Sepolia网络拥堵时会延迟

### 🔒 安全提醒
- 只使用官方或知名的水龙头
- 不要在可疑网站输入私钥
- 测试网ETH没有实际价值，不要被骗

### 💰 节省Gas费用
- 批量执行交易
- 在网络不繁忙时操作
- 使用我们已经优化的gas设置

## 🎯 推荐获取流程

1. **立即行动**: 先去Alchemy Sepolia Faucet (0.5 ETH)
2. **补充**: 使用Chainlink Faucet (0.1 ETH)
3. **备用**: QuickNode Faucet (0.05 ETH)
4. **持续**: 使用PoW Faucet挖矿获取更多

总共可以获得: **0.65+ ETH**，足够进行大量测试！

---

🔗 **快速链接**:
- [Alchemy Faucet](https://sepoliafaucet.com/) - 0.5 ETH
- [Chainlink Faucet](https://faucets.chain.link/sepolia) - 0.1 ETH  
- [QuickNode Faucet](https://faucet.quicknode.com/sepolia) - 0.05 ETH

获取ETH后，回来继续测试我们的Torn Privacy协议！🚀
