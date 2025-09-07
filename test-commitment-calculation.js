// 🧪 测试Commitment计算正确性
import { ethers } from 'ethers'

console.log('🧪 测试Commitment计算方法')
console.log('========================================')

// 模拟测试数据
const nullifier = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const secret = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'

console.log('测试数据:')
console.log('  Nullifier:', nullifier)
console.log('  Secret:   ', secret)
console.log('')

// 方法1: 错误的方式 (使用abi.encode)
const wrongCommitment = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [nullifier, secret])
)

// 方法2: 正确的方式 (使用abi.encodePacked等效)
const correctCommitment = ethers.keccak256(
    ethers.concat([nullifier, secret])
)

console.log('🔍 计算结果对比:')
console.log('  错误方式 (abi.encode):')
console.log('    ', wrongCommitment)
console.log('  正确方式 (abi.encodePacked):')
console.log('    ', correctCommitment)
console.log('')

console.log('✅ 结果是否相同?', wrongCommitment === correctCommitment ? '是' : '否')

if (wrongCommitment !== correctCommitment) {
    console.log('❌ 两种方法产生了不同的commitment!')
    console.log('   这解释了为什么会出现"bad args"错误')
    console.log('   合约期望的是abi.encodePacked方式计算的commitment')
} else {
    console.log('✅ 两种方法产生了相同的commitment')
}

console.log('')
console.log('🏗️  智能合约中的实现:')
console.log('   bytes32 commitment = keccak256(abi.encodePacked(nullifier, secret));')
console.log('')
console.log('💻 前端对应实现:')
console.log('   const commitment = ethers.keccak256(ethers.concat([nullifier, secret]))')
console.log('')
console.log('========================================')
console.log('✅ Commitment计算方法测试完成')
