# Gas费用分析和优化建议

## 当前Withdraw操作的Gas消耗组成

### 高成本操作：
1. **存储写入 (SSTORE)**：~20,000 gas per write
   - `nullifierSpent[nullifierHash] = true` ~20,000 gas
   - `info.withdrawn = true` ~5,000 gas (修改已存在的struct)

2. **哈希计算 (KECCAK256)**：~30 gas + 6 gas per word
   - commitment计算 ~50 gas
   - nullifierHash计算 ~50 gas

3. **ETH转账**：~21,000 gas (基础) + ~2,300 gas (call)

4. **事件日志**：~375 gas per log + 8 gas per byte

### 总估算：~50,000-70,000 gas

## 优化建议

### 1. 使用packed storage
```solidity
// 将多个bool打包到一个uint256中
struct DepositInfo {
    address token;     // 20 bytes
    uint96 amount;     // 12 bytes (足够大部分用途)
    // bool withdrawn, locked 打包到同一个slot
}
```

### 2. 预计算哈希
在前端预计算commitment和nullifierHash，减少合约中的计算

### 3. 批量操作
如果有多笔withdraw，可以考虑batch操作

### 4. Layer 2解决方案
部署到Polygon、Arbitrum等Layer 2网络可以显著降低费用
