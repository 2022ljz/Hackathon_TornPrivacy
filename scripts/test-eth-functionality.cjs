const hre = require("hardhat");

async function testEthFunctionality() {
    console.log("🧪 Testing ETH functionality on deployed contracts...");

    const [signer] = await hre.ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // 获取合约实例
    const mixer = await hre.ethers.getContractAt("Mixer", "0xf85Daa3dBA126757027CE967F86Eb7860271AfE0");
    const lendingPool = await hre.ethers.getContractAt("LendingPool", "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad");
    const collateralManager = await hre.ethers.getContractAt("CollateralManager", "0xC9BAe3f8F6A47Daf0847294096906d91B8eF0f1d");
    const usdc = await hre.ethers.getContractAt("ERC20Mock", "0xCB3A2E90568471eeD7b191AC45747e83bEE6642A");
    const dai = await hre.ethers.getContractAt("ERC20Mock", "0x3a6B9cC96D2FB5bCA277C0A222CE16Ab6bAeF5B4");

    // 检查初始余额
    const initialEthBalance = await hre.ethers.provider.getBalance(signer.address);
    console.log("Initial ETH balance:", hre.ethers.formatEther(initialEthBalance), "ETH");

    // 测试参数
    const depositAmount = hre.ethers.parseEther("0.01"); // 存入 0.01 ETH
    const borrowAmount = hre.ethers.parseUnits("5", 18); // 借 5 DAI

    // 生成隐私凭证
    const nullifier = hre.ethers.randomBytes(32);
    const secret = hre.ethers.randomBytes(32);
    const commitment = hre.ethers.keccak256(
        hre.ethers.concat([nullifier, secret])
    );

    console.log("\n📋 Test Parameters:");
    console.log("Deposit amount:", hre.ethers.formatEther(depositAmount), "ETH");
    console.log("Borrow amount:", hre.ethers.formatUnits(borrowAmount, 18), "DAI");
    console.log("Commitment:", commitment);

    try {
        // 测试 1: 存入 ETH 到混币器
        console.log("\n💰 Test 1: Depositing ETH to Mixer...");

        const depositTx = await mixer.deposit(
            commitment,
            hre.ethers.ZeroAddress, // ETH 使用零地址
            depositAmount,
            { value: depositAmount }
        );
        await depositTx.wait();
        console.log("✅ ETH deposit successful, tx:", depositTx.hash);

        // 验证存款
        const depositInfo = await mixer.getDeposit(commitment);
        console.log("Deposit info:", {
            token: depositInfo[0],
            amount: hre.ethers.formatEther(depositInfo[1]),
            withdrawn: depositInfo[2],
            locked: depositInfo[3]
        });

        // 测试 2: 锁定 ETH 抵押品并借 DAI
        console.log("\n🏦 Test 2: Lock ETH and borrow DAI...");

        const borrowTx = await collateralManager.lockAndBorrow(
            commitment,
            await dai.getAddress(),
            borrowAmount
        );
        await borrowTx.wait();
        console.log("✅ Lock and borrow successful, tx:", borrowTx.hash);

        // 检查借贷状态
        const loanId = await lendingPool.loanCounter();
        const loanInfo = await lendingPool.loans(loanId);
        console.log("Loan info:", {
            borrower: loanInfo[0],
            token: loanInfo[1],
            amount: hre.ethers.formatUnits(loanInfo[2], 18),
            collateralAmount: hre.ethers.formatEther(loanInfo[3]),
            repaid: loanInfo[4]
        });

        // 检查 DAI 余额
        const daiBalance = await dai.balanceOf(signer.address);
        console.log("DAI balance after borrow:", hre.ethers.formatUnits(daiBalance, 18));

        // 测试 3: 还款并解锁
        console.log("\n💳 Test 3: Repay DAI and unlock ETH...");

        // 授权还款
        const approveTx = await dai.approve(await lendingPool.getAddress(), borrowAmount);
        await approveTx.wait();
        console.log("✅ DAI approved for repayment");

        // 还款并解锁
        const repayTx = await collateralManager.repayAndUnlock(commitment, borrowAmount);
        await repayTx.wait();
        console.log("✅ Repay and unlock successful, tx:", repayTx.hash);

        // 检查解锁状态
        const finalDepositInfo = await mixer.getDeposit(commitment);
        const finalLoanInfo = await lendingPool.loans(loanId);

        console.log("Final deposit info:", {
            locked: finalDepositInfo[3]
        });
        console.log("Final loan info:", {
            repaid: finalLoanInfo[4]
        });

        // 测试 4: 隐私提取 ETH
        console.log("\n💸 Test 4: Withdrawing ETH from Mixer...");

        const balanceBeforeWithdraw = await hre.ethers.provider.getBalance(signer.address);

        const withdrawTx = await mixer.withdraw(signer.address, nullifier, secret);
        await withdrawTx.wait();
        console.log("✅ ETH withdraw successful, tx:", withdrawTx.hash);

        // 检查最终余额
        const finalEthBalance = await hre.ethers.provider.getBalance(signer.address);
        const finalDaiBalance = await dai.balanceOf(signer.address);

        console.log("\n📊 Final Status:");
        console.log("Final ETH balance:", hre.ethers.formatEther(finalEthBalance), "ETH");
        console.log("Final DAI balance:", hre.ethers.formatUnits(finalDaiBalance, 18), "DAI");
        console.log("ETH change:", hre.ethers.formatEther(finalEthBalance - initialEthBalance), "ETH");

        console.log("\n✅ All ETH tests completed successfully!");
        console.log("\n🎉 Your PIONEER DeFi Platform is working perfectly with ETH!");

    } catch (error) {
        console.error("❌ Test failed:", error);

        // 如果测试失败，尝试提供有用的错误信息
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Tip: Make sure you have enough ETH for gas fees and the deposit amount");
        } else if (error.message.includes("invalid note")) {
            console.log("💡 Tip: The commitment might already exist or be invalid");
        } else if (error.message.includes("no liquidity")) {
            console.log("💡 Tip: The lending pool might not have enough DAI liquidity");
        }
    }
}

testEthFunctionality()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test script failed:", error);
        process.exit(1);
    });
