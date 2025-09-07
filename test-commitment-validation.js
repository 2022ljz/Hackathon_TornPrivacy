// 🧪 测试commitment验证功能
import { ethers } from 'ethers'

// 模拟commitment验证函数
function isValidCommitmentFormat(commitment) {
    try {
        if (!commitment || typeof commitment !== 'string') {
            console.log('❌ commitment不是有效字符串')
            return false
        }

        // 检查是否是bytes32格式 (66字符：0x + 64位十六进制)
        if (commitment.startsWith('0x') && commitment.length === 66) {
            const hex = commitment.slice(2)
            if (/^[0-9a-fA-F]{64}$/.test(hex)) {
                console.log('✅ commitment格式正确 (bytes32)')
                return true
            }
        }

        // 检查是否是transaction note格式 (以torn开头)
        if (commitment.startsWith('torn-')) {
            console.log('⚠️  这是transaction note，需要转换为commitment')
            return false
        }

        console.log('❌ commitment格式无效')
        return false

    } catch (error) {
        console.error('验证过程出错:', error)
        return false
    }
}

// 测试数据
const testCases = [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // 有效bytes32
    'torn-eth-1.0-11155111-0x1234567890abcdef', // transaction note
    'invalid-commitment', // 无效格式
    '', // 空字符串
    null, // null值
]

console.log('🧪 测试commitment验证功能')
console.log('==================================')

testCases.forEach((testCase, index) => {
    console.log(`\n测试案例 ${index + 1}: ${testCase}`)
    const isValid = isValidCommitmentFormat(testCase)
    console.log(`结果: ${isValid ? '✅ 有效' : '❌ 无效'}`)
})

console.log('\n==================================')
console.log('✅ 测试完成')
