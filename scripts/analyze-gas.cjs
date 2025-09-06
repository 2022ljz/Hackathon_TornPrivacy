const { ethers } = require('hardhat');

async function analyzeGasCosts() {
    console.log('\n🔍 Gas成本分析报告\n');

    // 部署合约
    const Mixer = await ethers.getContractFactory('Mixer');
    const mixer = await Mixer.deploy();
    await mixer.deployed();

    console.log('📋 基础操作Gas成本：');

    // 1. 测试deposit操作
    const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'));
    const depositTx = await mixer.deposit(commitment, ethers.constants.AddressZero, ethers.utils.parseEther('0.1'), {
        value: ethers.utils.parseEther('0.1')
    });
    const depositReceipt = await depositTx.wait();
    console.log(`💰 Deposit Gas Used: ${depositReceipt.gasUsed.toString()}`);

    // 2. 测试withdraw操作
    const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('nullifier'));
    const secret = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('secret'));
    const testCommitment = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32'], [nullifier, secret]));

    // 先存款
    await mixer.deposit(testCommitment, ethers.constants.AddressZero, ethers.utils.parseEther('0.1'), {
        value: ethers.utils.parseEther('0.1')
    });

    // 测试withdraw
    const [signer] = await ethers.getSigners();
    const withdrawTx = await mixer.withdraw(signer.address, nullifier, secret);
    const withdrawReceipt = await withdrawTx.wait();
    console.log(`💸 Withdraw Gas Used: ${withdrawReceipt.gasUsed.toString()}`);

    // 3. 分析gas使用分布
    console.log('\n📊 Withdraw Gas成本分解：');
    console.log('- 基础交易成本: ~21,000 gas');
    console.log('- nullifierSpent写入: ~20,000 gas');
    console.log('- withdrawn标记: ~5,000 gas');
    console.log('- 哈希计算: ~100 gas');
    console.log('- ETH转账: ~2,300 gas');
    console.log('- 事件日志: ~1,000 gas');
    console.log('- 其他逻辑: ~5,000 gas');

    // 4. 优化建议
    console.log('\n💡 Gas优化建议：');
    console.log('1. 使用packed storage可节省~15,000 gas');
    console.log('2. 预计算哈希可节省~100 gas');
    console.log('3. 使用Layer 2可降低95%的费用');
    console.log('4. 批量操作可分摊固定成本');

    return {
        depositGas: depositReceipt.gasUsed,
        withdrawGas: withdrawReceipt.gasUsed
    };
}

// 运行分析
if (require.main === module) {
    analyzeGasCosts()
        .then((results) => {
            console.log('\n✅ 分析完成:', results);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 分析失败:', error);
            process.exit(1);
        });
}

module.exports = { analyzeGasCosts };
