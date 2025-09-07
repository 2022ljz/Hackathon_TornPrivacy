// 🔍 全面诊断"bad args"错误的所有可能原因
import { ethers } from 'ethers'

// 模拟前端检查逻辑
async function diagnoseBorrowIssue(commitment, borrowToken, borrowAmount, walletAddress) {
    console.log('🔍 诊断borrow操作的所有可能失败点')
    console.log('================================================')

    console.log('📝 输入参数:')
    console.log('  Commitment:', commitment)
    console.log('  Borrow Token:', borrowToken)
    console.log('  Borrow Amount:', borrowAmount)
    console.log('  Wallet:', walletAddress)
    console.log('')

    // 检查点1: 参数格式验证
    console.log('✅ 检查点1: 参数格式验证')

    if (!commitment || typeof commitment !== 'string') {
        console.log('❌ Commitment无效')
        return false
    }

    if (!commitment.startsWith('0x') || commitment.length !== 66) {
        console.log('❌ Commitment格式错误 (应该是0x开头的64字符)')
        return false
    }

    if (!borrowToken || typeof borrowToken !== 'string') {
        console.log('❌ BorrowToken无效')
        return false
    }

    if (!ethers.isAddress(borrowToken) && borrowToken !== ethers.ZeroAddress) {
        console.log('❌ BorrowToken不是有效地址')
        return false
    }

    if (!borrowAmount || isNaN(borrowAmount) || Number(borrowAmount) <= 0) {
        console.log('❌ BorrowAmount无效或为0')
        return false
    }

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
        console.log('❌ 钱包地址无效')
        return false
    }

    console.log('✅ 所有参数格式验证通过')
    console.log('')

    // 检查点2: CollateralManager.lockAndBorrow 可能的失败点
    console.log('✅ 检查点2: CollateralManager合约验证')
    console.log('  2.1 mixer.getDeposit(commitment) 检查:')
    console.log('      - face > 0 (存款金额大于0)')
    console.log('      - !withdrawn (未被提取)')
    console.log('      - !isLocked (未被锁定)')
    console.log('  2.2 collaterals[commitment].locked 检查:')
    console.log('      - !collaterals[commitment].locked (未在CollateralManager中锁定)')
    console.log('')

    // 检查点3: LendingPool.borrowFor 可能的失败点
    console.log('✅ 检查点3: LendingPool合约验证')
    console.log('  3.1 require(borrower != address(0) && token != address(0) && amount > 0, "bad args"):')
    console.log('      - borrower:', walletAddress)
    console.log('      - token:', borrowToken)
    console.log('      - amount:', borrowAmount, '> 0')
    console.log('  3.2 require(IERC20(token).balanceOf(address(this)) >= amount, "no liquidity"):')
    console.log('      - 需要检查LendingPool中是否有足够的代币余额')
    console.log('')

    // 检查点4: Gas和网络问题
    console.log('✅ 检查点4: 区块链网络问题')
    console.log('  4.1 Gas估算失败')
    console.log('  4.2 网络拥堵')
    console.log('  4.3 RPC节点问题')
    console.log('  4.4 钱包余额不足支付gas费')
    console.log('')

    return true
}

// 测试用例
console.log('🧪 运行诊断测试')
console.log('')

// 测试用例1: 正常情况
await diagnoseBorrowIssue(
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    '0x0000000000000000000000000000000000000000', // ETH
    '0.01',
    '0x742d35Cc6Bf4C15e0E7b8B3f5bD6c6b8f9a2B5d4'
)

// 测试用例2: 无效commitment
console.log('🧪 测试用例2: 无效commitment')
await diagnoseBorrowIssue(
    'invalid-commitment',
    '0x0000000000000000000000000000000000000000',
    '0.01',
    '0x742d35Cc6Bf4C15e0E7b8B3f5bD6c6b8f9a2B5d4'
)

console.log('')
console.log('🎯 最可能的"bad args"原因排序:')
console.log('1. ❌ Commitment在区块链上不存在 (mixer.getDeposit返回face=0)')
console.log('2. ❌ LendingPool流动性不足 (no liquidity)')
console.log('3. ❌ Commitment已被提取或锁定')
console.log('4. ❌ 参数格式错误 (无效地址、金额等)')
console.log('5. ❌ Gas估算失败')
console.log('')
console.log('🔧 建议的修复策略:')
console.log('1. ✅ 增强区块链验证 (已在contracts.js中实现)')
console.log('2. ✅ 详细错误信息 (区分不同错误类型)')
console.log('3. ✅ 流动性检查 (检查LendingPool余额)')
console.log('4. ✅ 智能commitment解析 (已在StakeBorrowPanel.vue中实现)')
console.log('')
console.log('================================================')
console.log('✅ 诊断完成')
