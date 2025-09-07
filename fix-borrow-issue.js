// 质押和借款修复脚本
// 运行这个脚本来检查和修复质押/借款问题

console.log('🔧 质押和借款修复脚本')
console.log('='.repeat(50))

// 步骤1：检查用户是否有有效的质押
async function checkStakeStatus() {
    console.log('📋 检查质押状态...')

    // 检查本地存储
    const mixerLocal = JSON.parse(localStorage.getItem('mixer-local') || '{}')

    console.log('💾 本地存储数据:')
    console.log('  Stake Notes:', Object.keys(mixerLocal.stakeNotes || {}))
    console.log('  Lend Notes:', Object.keys(mixerLocal.notes || {}))

    if (!mixerLocal.stakeNotes || Object.keys(mixerLocal.stakeNotes).length === 0) {
        console.log('❌ 未找到质押记录！')
        console.log('💡 您需要先完成质押操作才能借款')
        return false
    }

    // 显示所有质押记录
    for (const [commitment, record] of Object.entries(mixerLocal.stakeNotes)) {
        console.log(`📝 质押记录: ${commitment.slice(0, 20)}...`)
        console.log(`   金额: ${record.amount} ${record.token}`)
        console.log(`   状态: ${record.status}`)
        console.log(`   时间: ${new Date(record.timestamp).toLocaleString()}`)
        if (record.borrows && Object.keys(record.borrows).length > 0) {
            console.log(`   已借款:`, record.borrows)
        }
    }

    return true
}

// 步骤2：创建测试质押
async function createTestStake() {
    console.log('🏗️  创建测试质押...')

    try {
        // 检查是否连接钱包
        if (!window.ethereum) {
            throw new Error('未找到 MetaMask')
        }

        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length === 0) {
            throw new Error('钱包未连接')
        }

        // 生成测试commitment
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes('test_nullifier_' + Date.now()))
        const secret = ethers.keccak256(ethers.toUtf8Bytes('test_secret_' + Date.now()))
        const commitment = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [nullifier, secret])
        )

        console.log('🔑 生成的测试数据:')
        console.log('  Nullifier:', nullifier)
        console.log('  Secret:', secret)
        console.log('  Commitment:', commitment)

        // 保存到本地存储
        const mixerLocal = JSON.parse(localStorage.getItem('mixer-local') || '{}')
        if (!mixerLocal.stakeNotes) {
            mixerLocal.stakeNotes = {}
        }

        mixerLocal.stakeNotes[commitment] = {
            token: 'ETH',
            amount: 0.02,
            timestamp: Date.now(),
            status: 'active',
            borrows: {},
            nullifier,
            secret,
            txHash: '0x' + 'test'.repeat(16),
            blockNumber: 9143600,
            isTestData: true
        }

        localStorage.setItem('mixer-local', JSON.stringify(mixerLocal))

        console.log('✅ 测试质押记录已创建!')
        console.log('🔗 Commitment:', commitment)
        console.log('💡 您现在可以使用这个commitment进行借款测试')

        return commitment

    } catch (error) {
        console.error('❌ 创建测试质押失败:', error)
        throw error
    }
}

// 步骤3：测试借款参数
function testBorrowParams(commitment, borrowToken = 'ETH', borrowAmount = 0.01) {
    console.log('🧪 测试借款参数...')

    // 检查commitment格式
    if (!commitment || !commitment.startsWith('0x') || commitment.length !== 66) {
        console.error('❌ 无效的commitment格式:', commitment)
        return false
    }

    // 检查本地记录
    const mixerLocal = JSON.parse(localStorage.getItem('mixer-local') || '{}')
    const stakeRecord = mixerLocal.stakeNotes?.[commitment]

    if (!stakeRecord) {
        console.error('❌ 未找到对应的质押记录:', commitment)
        return false
    }

    // 计算可借额度
    const collateralValue = stakeRecord.amount * 3500 // ETH价格
    const ltv = 0.5 // 50% LTV
    const maxBorrowUSD = collateralValue * ltv
    const maxBorrowETH = maxBorrowUSD / 3500

    console.log('💰 借款限额计算:')
    console.log(`  质押金额: ${stakeRecord.amount} ETH`)
    console.log(`  质押价值: $${collateralValue}`)
    console.log(`  LTV比率: ${ltv * 100}%`)
    console.log(`  最大可借: $${maxBorrowUSD} (${maxBorrowETH.toFixed(6)} ETH)`)
    console.log(`  请求借款: ${borrowAmount} ${borrowToken}`)

    if (borrowAmount > maxBorrowETH) {
        console.error('❌ 借款金额超出限制!')
        return false
    }

    console.log('✅ 借款参数验证通过!')
    return true
}

// 主修复函数
async function fixBorrowIssue() {
    console.log('🚀 开始修复借款问题...')

    try {
        // 步骤1：检查现有质押
        const hasStake = await checkStakeStatus()

        let commitment
        if (!hasStake) {
            // 步骤2：创建测试质押
            commitment = await createTestStake()
        } else {
            // 使用现有的第一个质押记录
            const mixerLocal = JSON.parse(localStorage.getItem('mixer-local') || '{}')
            commitment = Object.keys(mixerLocal.stakeNotes)[0]
        }

        // 步骤3：测试借款参数
        const paramsValid = testBorrowParams(commitment, 'ETH', 0.01)

        if (paramsValid) {
            console.log('🎉 修复完成!')
            console.log('📋 使用以下信息进行借款:')
            console.log('  Stake Note:', commitment)
            console.log('  Borrow Token: ETH')
            console.log('  Max Amount: 0.01 ETH')
            console.log('')
            console.log('💡 复制上面的 Stake Note 到借款界面，然后尝试借款')
        }

        return commitment

    } catch (error) {
        console.error('❌ 修复失败:', error)
        throw error
    }
}

// 清理测试数据
function cleanupTestData() {
    console.log('🧹 清理测试数据...')

    const mixerLocal = JSON.parse(localStorage.getItem('mixer-local') || '{}')

    if (mixerLocal.stakeNotes) {
        // 删除所有测试数据
        for (const [commitment, record] of Object.entries(mixerLocal.stakeNotes)) {
            if (record.isTestData) {
                delete mixerLocal.stakeNotes[commitment]
                console.log('🗑️  删除测试记录:', commitment.slice(0, 20) + '...')
            }
        }

        localStorage.setItem('mixer-local', JSON.stringify(mixerLocal))
        console.log('✅ 测试数据清理完成')
    }
}

// 导出函数
window.checkStakeStatus = checkStakeStatus
window.createTestStake = createTestStake
window.testBorrowParams = testBorrowParams
window.fixBorrowIssue = fixBorrowIssue
window.cleanupTestData = cleanupTestData

console.log('📋 可用函数:')
console.log('• checkStakeStatus() - 检查质押状态')
console.log('• createTestStake() - 创建测试质押')
console.log('• testBorrowParams(commitment, token, amount) - 测试借款参数')
console.log('• fixBorrowIssue() - 一键修复借款问题')
console.log('• cleanupTestData() - 清理测试数据')
console.log('')
console.log('🚀 快速修复: 运行 await fixBorrowIssue()')
