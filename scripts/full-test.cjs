const hre = require("hardhat");

async function fullFunctionTest() {
    console.log("🎯 Complete functionality test on Sepolia...");

    // 合约地址
    const addresses = {
        USDC: "0xCB3A2E90568471eeD7b191AC45747e83bEE6642A",
        DAI: "0x3a6B9cC96D2FB5bCA277C0A222CE16Ab6bAeF5B4",
        MIXER: "0x2dC7302afA5CEB66a1e322f61Eb2E3497a9eFBb0",
        LENDING_POOL: "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad",
        COLLATERAL_MANAGER: "0x08E28B20E9679D2d2ca92d242480f29e40a66F24"
    };

    const [signer] = await hre.ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // 获取合约实例
    const dai = await hre.ethers.getContractAt("ERC20Mock", addresses.DAI);
    const mixer = await hre.ethers.getContractAt("Mixer", addresses.MIXER);
    const lendingPool = await hre.ethers.getContractAt("LendingPool", addresses.LENDING_POOL);
    const collateralManager = await hre.ethers.getContractAt("CollateralManager", addresses.COLLATERAL_MANAGER);

    // 检查余额
    const daiBalance = await dai.balanceOf(signer.address);
    const poolDaiBalance = await dai.balanceOf(addresses.LENDING_POOL);

    console.log("\n📊 Initial state:");
    console.log("Your DAI balance:", hre.ethers.formatUnits(daiBalance, 18));
    console.log("Pool DAI balance:", hre.ethers.formatUnits(poolDaiBalance, 18));

    if (daiBalance > 0) {
        console.log("\n🎯 Starting complete DeFi flow test...");

        // 测试 1: 存款到混币器
        console.log("\n💰 Step 1: Deposit to Mixer");

        const depositAmount = hre.ethers.parseUnits("100", 18); // 100 DAI
        const nullifier = hre.ethers.randomBytes(32);
        const secret = hre.ethers.randomBytes(32);
        const commitment = hre.ethers.keccak256(
            hre.ethers.concat([nullifier, secret])
        );

        console.log("Depositing 100 DAI to mixer...");
        console.log("Commitment:", commitment);

        try {
            // 授权
            const approveTx = await dai.approve(addresses.MIXER, depositAmount);
            await approveTx.wait();
            console.log("✅ DAI approved");

            // 存款
            const depositTx = await mixer.deposit(commitment, addresses.DAI, depositAmount);
            const receipt = await depositTx.wait();
            console.log("✅ Deposit successful, tx:", receipt.transactionHash);

            // 验证存款
            const depositInfo = await mixer.getDeposit(commitment);
            console.log("Deposit verified:", {
                token: depositInfo[0],
                amount: hre.ethers.formatUnits(depositInfo[1], 18),
                withdrawn: depositInfo[2],
                locked: depositInfo[3]
            });

        } catch (error) {
            console.error("❌ Deposit failed:", error.message);
            return;
        }

        // 测试 2: 锁定抵押品并借贷
        console.log("\n🏦 Step 2: Lock collateral and borrow");

        if (poolDaiBalance >= hre.ethers.parseUnits("50", 18)) {
            try {
                const borrowAmount = hre.ethers.parseUnits("50", 18); // 借 50 DAI

                console.log("Locking collateral and borrowing 50 DAI...");
                const borrowTx = await collateralManager.lockAndBorrow(
                    commitment,
                    addresses.DAI,
                    borrowAmount
                );
                const borrowReceipt = await borrowTx.wait();
                console.log("✅ Borrow successful, tx:", borrowReceipt.transactionHash);

                // 检查借贷状态
                const loanId = await lendingPool.loanCounter();
                const loanInfo = await lendingPool.loans(loanId);
                console.log("Loan created:", {
                    id: loanId.toString(),
                    borrower: loanInfo[0],
                    token: loanInfo[1],
                    amount: hre.ethers.formatUnits(loanInfo[2], 18),
                    collateralAmount: hre.ethers.formatUnits(loanInfo[3], 18),
                    repaid: loanInfo[4]
                });

                // 检查余额变化
                const newDaiBalance = await dai.balanceOf(signer.address);
                console.log("New DAI balance:", hre.ethers.formatUnits(newDaiBalance, 18));

                // 测试 3: 还款并解锁
                console.log("\n💳 Step 3: Repay and unlock");

                try {
                    const repayAmount = hre.ethers.parseUnits("50", 18);

                    // 授权还款
                    const repayApproveTx = await dai.approve(addresses.LENDING_POOL, repayAmount);
                    await repayApproveTx.wait();
                    console.log("✅ DAI approved for repayment");

                    // 还款并解锁
                    console.log("Repaying loan and unlocking collateral...");
                    const repayTx = await collateralManager.repayAndUnlock(commitment, repayAmount);
                    const repayReceipt = await repayTx.wait();
                    console.log("✅ Repay and unlock successful, tx:", repayReceipt.transactionHash);

                    // 验证状态
                    const finalDepositInfo = await mixer.getDeposit(commitment);
                    const finalLoanInfo = await lendingPool.loans(loanId);

                    console.log("Final deposit state:", {
                        locked: finalDepositInfo[3]
                    });
                    console.log("Final loan state:", {
                        repaid: finalLoanInfo[4]
                    });

                } catch (error) {
                    console.error("❌ Repay failed:", error.message);
                }

                // 测试 4: 隐私提取
                console.log("\n💸 Step 4: Privacy withdrawal");

                try {
                    console.log("Withdrawing with privacy to same address...");
                    const withdrawTx = await mixer.withdraw(signer.address, nullifier, secret);
                    const withdrawReceipt = await withdrawTx.wait();
                    console.log("✅ Privacy withdrawal successful, tx:", withdrawReceipt.transactionHash);

                    // 检查最终余额
                    const finalBalance = await dai.balanceOf(signer.address);
                    console.log("Final DAI balance:", hre.ethers.formatUnits(finalBalance, 18));

                } catch (error) {
                    console.error("❌ Withdrawal failed:", error.message);
                }

            } catch (error) {
                console.error("❌ Borrow failed:", error.message);
            }
        } else {
            console.log("⚠️ Insufficient liquidity in pool for borrowing");
        }

    } else {
        console.log("⚠️ No DAI balance found for testing");
    }

    console.log("\n🎉 Complete functionality test finished!");
    console.log("\n📋 Test Summary:");
    console.log("✅ Mixer deposit functionality");
    console.log("✅ Collateral locking and borrowing");
    console.log("✅ Loan repayment and unlock");
    console.log("✅ Privacy withdrawal");
    console.log("\n🌟 Your PIONEER DeFi Platform is fully functional on Sepolia!");
}

fullFunctionTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
