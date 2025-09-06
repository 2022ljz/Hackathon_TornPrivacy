// Gas 配置文件 - 优化Sepolia测试网上的交易费用

export const GAS_CONFIG = {
    // 默认gas限制（各种操作的估算值）
    DEFAULT_LIMITS: {
        DEPOSIT: 200000n,           // 混合器存款
        WITHDRAW: 250000n,          // 混合器取款  
        LOCK_AND_BORROW: 300000n,   // 锁定并借贷
        REPAY_AND_UNLOCK: 280000n,  // 还款并解锁
        ERC20_APPROVE: 60000n,      // ERC20代币授权
        ERC20_TRANSFER: 80000n,     // ERC20代币转账
        SIMPLE_TRANSFER: 21000n     // 简单ETH转账
    },

    // Gas价格设置（gwei）
    GAS_PRICE: {
        SLOW: 1n,      // 1 gwei - 慢速（省钱）
        STANDARD: 2n,  // 2 gwei - 标准速度
        FAST: 5n       // 5 gwei - 快速
    },

    // 安全边际系数
    SAFETY_MARGIN: 1.2, // 在估算基础上增加20%

    // 最大gas限制（防止意外的高费用）
    MAX_GAS_LIMIT: 500000n,

    // 是否启用gas优化
    ENABLE_GAS_OPTIMIZATION: true,

    // 是否使用低gas价格（适合测试网）
    USE_LOW_GAS_PRICE: true
}

/**
 * 计算优化后的gas限制
 * @param {bigint} estimate - 估算的gas用量
 * @param {string} operation - 操作类型
 * @returns {bigint} 优化后的gas限制
 */
export function calculateOptimizedGasLimit(estimate, operation = 'UNKNOWN') {
    if (!GAS_CONFIG.ENABLE_GAS_OPTIMIZATION) {
        return estimate
    }

    // 应用安全边际
    const withMargin = estimate + (estimate * BigInt(Math.floor(GAS_CONFIG.SAFETY_MARGIN * 100 - 100)) / 100n)

    // 确保不超过最大限制
    const finalLimit = withMargin > GAS_CONFIG.MAX_GAS_LIMIT ? GAS_CONFIG.MAX_GAS_LIMIT : withMargin

    console.log(`⛽ Gas optimization for ${operation}:`)
    console.log(`   Estimate: ${estimate.toString()}`)
    console.log(`   With margin: ${withMargin.toString()}`)
    console.log(`   Final limit: ${finalLimit.toString()}`)

    return finalLimit
}

/**
 * 获取推荐的gas价格
 * @param {string} speed - 速度偏好: 'SLOW', 'STANDARD', 'FAST'
 * @returns {bigint} gas价格（wei）
 */
export function getRecommendedGasPrice(speed = 'STANDARD') {
    if (!GAS_CONFIG.USE_LOW_GAS_PRICE) {
        return null // 让钱包自动选择
    }

    const gweiPrice = GAS_CONFIG.GAS_PRICE[speed] || GAS_CONFIG.GAS_PRICE.STANDARD
    return gweiPrice * 1000000000n // 转换为wei
}

/**
 * 获取操作的默认gas限制
 * @param {string} operation - 操作类型
 * @returns {bigint} 默认gas限制
 */
export function getDefaultGasLimit(operation) {
    return GAS_CONFIG.DEFAULT_LIMITS[operation] || GAS_CONFIG.DEFAULT_LIMITS.SIMPLE_TRANSFER
}

export default GAS_CONFIG
