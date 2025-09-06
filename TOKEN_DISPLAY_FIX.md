# 🔧 显示多余代币问题修复

## ❌ 问题描述

你看到界面显示了多个代币：
```
ETH: 0.000508452025365418
DAI: 0
USDC: 1,000
WBTC: 0
```

但我们已经配置为**只使用ETH**。

## 🔍 问题根源

1. **localStorage缓存** - 旧的余额数据仍保存在浏览器中
2. **硬编码配置** - wallet.js中有多处硬编码的代币配置
3. **组件图标映射** - BalancePanel.vue中硬编码了代币图标

## ✅ 已修复的问题

### 🎯 1. 清理了所有硬编码配置

**修复前**（问题代码）：
```javascript
balance: {
    ETH: 0,
    DAI: 0,     // ❌ 硬编码
    USDC: 0,    // ❌ 硬编码  
    WBTC: 0     // ❌ 硬编码
}
```

**修复后**（清理后）：
```javascript
balance: {
    ETH: 0
    // 只保留ETH，其他代币已禁用
}
```

### 🎯 2. 修复了多个位置的硬编码

修复了以下文件中的硬编码代币：
- ✅ `src/stores/wallet.js` - localData.balance 初始化
- ✅ `src/stores/wallet.js` - loadPersistedData 函数
- ✅ `src/stores/wallet.js` - 错误处理时的余额设置
- ✅ `src/stores/wallet.js` - resetAllCacheData 函数
- ✅ `src/stores/wallet.js` - 配置重置时的tokens数组

### 🎯 3. 添加了智能清理机制

添加了localStorage数据清理逻辑：
```javascript
// 🔧 清理balance对象，只保留配置的代币
const cleanBalance = {}
config.value.tokens.forEach(token => {
    cleanBalance[token.sym] = parsed.balance[token.sym] || 0
})
parsed.balance = cleanBalance
```

## 🔧 立即修复方法

### 方法1: 运行清理脚本（推荐）

在浏览器控制台（F12）中运行：
```javascript
// 复制 cleanup-localStorage.js 中的代码并执行
```

### 方法2: 手动清理

在浏览器中：
1. 按 F12 打开开发者工具
2. 切换到 Console 标签
3. 输入：`localStorage.clear()`
4. 按回车，然后刷新页面

### 方法3: 硬刷新

- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

## 📊 修复效果

**修复前**：
```
💰 Account Balance
ETH: 0.000508... ✅ 正确
DAI: 0           ❌ 不应显示
USDC: 1,000      ❌ 不应显示
WBTC: 0          ❌ 不应显示
```

**修复后**：
```
💰 Account Balance
ETH: 0.000508... ✅ 正确
// 其他代币不再显示
```

## 🚀 验证方法

1. **清理后刷新页面**
2. **检查余额面板** - 应该只显示ETH
3. **检查控制台** - 应该看到 "🧹 Cleaned balance data to match current config"
4. **测试功能** - ETH的stake/borrow/repay应该正常工作

## 💡 预防措施

为避免未来类似问题：

1. ✅ **动态配置** - 所有代币配置基于contracts.js
2. ✅ **自动清理** - localStorage数据自动匹配当前配置  
3. ✅ **单一数据源** - config.tokens作为唯一的代币来源
4. ✅ **错误回退** - 加载失败时也不显示多余代币

现在访问 **http://localhost:3005** 应该只显示ETH代币了！🎉
