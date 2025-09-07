// 🧪 深度测试Commitment计算 - 使用真实的32字节值
import { ethers } from 'ethers'

console.log('🧪 深度测试Commitment计算')
console.log('========================================')

// 生成真实的32字节随机值 (像合约中那样)
const nullifier = ethers.keccak256(ethers.randomBytes(32))
const secret = ethers.keccak256(ethers.randomBytes(32))

console.log('真实的32字节数据:')
console.log('  Nullifier:', nullifier)
console.log('  Secret:   ', secret)
console.log('  长度检查: nullifier=' + nullifier.length + ', secret=' + secret.length)
console.log('')

// 方法1: 错误的方式 (使用abi.encode)
console.log('🔍 方法1: abi.encode() 方式')
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [nullifier, secret])
console.log('  编码结果长度:', encoded.length)
console.log('  编码结果前64字符:', encoded.slice(0, 64))
const wrongCommitment = ethers.keccak256(encoded)

// 方法2: 正确的方式 (使用abi.encodePacked等效)
console.log('')
console.log('🔍 方法2: abi.encodePacked() 方式')
const packed = ethers.concat([nullifier, secret])
console.log('  打包结果长度:', packed.length)
console.log('  打包结果前64字符:', ethers.hexlify(packed).slice(0, 64))
const correctCommitment = ethers.keccak256(packed)

console.log('')
console.log('📊 最终commitment对比:')
console.log('  方法1 (abi.encode):     ', wrongCommitment)
console.log('  方法2 (abi.encodePacked):', correctCommitment)
console.log('')

if (wrongCommitment !== correctCommitment) {
    console.log('❌ 确认：两种方法产生了不同的commitment!')
    console.log('   这是"bad args"错误的根本原因')
    console.log('')
    console.log('🔧 解决方案:')
    console.log('   前端必须使用: ethers.keccak256(ethers.concat([nullifier, secret]))')
    console.log('   而不是:      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([...]))')
} else {
    console.log('✅ 两种方法产生了相同的commitment')
}

console.log('')
console.log('🧮 编码差异分析:')
console.log('  abi.encode()     会添加类型信息和填充，总长度更长')
console.log('  abi.encodePacked() 是紧密打包，无填充，长度为64字节(两个32字节值)')
console.log('')
console.log('========================================')
