const hre = require("hardhat");

async function quickTest() {
    console.log("🧪 Quick test of deployed contracts on Sepolia...");

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
    console.log("Account balance:", hre.ethers.formatEther(await signer.provider.getBalance(signer.address)), "ETH");

    // 获取合约实例
    console.log("\n📋 Getting contract instances...");
    const usdc = await hre.ethers.getContractAt("ERC20Mock", addresses.USDC);
    const dai = await hre.ethers.getContractAt("ERC20Mock", addresses.DAI);
    const mixer = await hre.ethers.getContractAt("Mixer", addresses.MIXER);
    const lendingPool = await hre.ethers.getContractAt("LendingPool", addresses.LENDING_POOL);
    const collateralManager = await hre.ethers.getContractAt("CollateralManager", addresses.COLLATERAL_MANAGER);

    // 检查基本状态
    console.log("\n🔍 Checking basic contract states...");

    const usdcBalance = await usdc.balanceOf(signer.address);
    const daiBalance = await dai.balanceOf(signer.address);
    const loanCounter = await lendingPool.loanCounter();
    const mixerCM = await mixer.collateralManager();

    console.log("USDC balance:", hre.ethers.formatUnits(usdcBalance, 6));
    console.log("DAI balance:", hre.ethers.formatUnits(daiBalance, 18));
    console.log("Loan counter:", loanCounter.toString());
    console.log("Mixer collateral manager:", mixerCM);
    console.log("Expected collateral manager:", addresses.COLLATERAL_MANAGER);

    // 验证合约连接
    console.log("\n🔗 Verifying contract connections...");

    if (mixerCM.toLowerCase() === addresses.COLLATERAL_MANAGER.toLowerCase()) {
        console.log("✅ Mixer -> CollateralManager connection verified");
    } else {
        console.log("❌ Mixer -> CollateralManager connection failed");
    }

    // 检查代币元数据
    console.log("\n📊 Checking token metadata...");

    const usdcSymbol = await usdc.symbol();
    const usdcDecimals = await usdc.decimals();
    const daiSymbol = await dai.symbol();
    const daiDecimals = await dai.decimals();

    console.log(`USDC: ${usdcSymbol}, decimals: ${usdcDecimals}`);
    console.log(`DAI: ${daiSymbol}, decimals: ${daiDecimals}`);

    // 简单的存款测试（如果有代币的话）
    if (usdcBalance > 0) {
        console.log("\n💰 Testing deposit functionality...");

        const depositAmount = hre.ethers.parseUnits("1", 6); // 1 USDC
        const nullifier = hre.ethers.randomBytes(32);
        const secret = hre.ethers.randomBytes(32);
        const commitment = hre.ethers.keccak256(
            hre.ethers.concat([nullifier, secret])
        );

        console.log("Generated commitment:", commitment);

        try {
            // 授权
            const approveTx = await usdc.approve(addresses.MIXER, depositAmount);
            await approveTx.wait();
            console.log("✅ USDC approved");

            // 存款
            const depositTx = await mixer.deposit(commitment, addresses.USDC, depositAmount);
            await depositTx.wait();
            console.log("✅ Deposit successful");

            // 检查存款
            const depositInfo = await mixer.getDeposit(commitment);
            console.log("Deposit info:", {
                token: depositInfo[0],
                amount: hre.ethers.formatUnits(depositInfo[1], 6),
                withdrawn: depositInfo[2],
                locked: depositInfo[3]
            });

        } catch (error) {
            console.log("⚠️ Deposit test skipped:", error.message);
        }
    } else {
        console.log("\n⚠️ No USDC balance found, skipping deposit test");
        console.log("💡 Tip: You may need to mint some test tokens first");
    }

    console.log("\n✅ Quick test completed!");
    console.log("\n📋 Contract Addresses Summary:");
    console.log("================================");
    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`${name.padEnd(20)}: ${address}`);
    });

    console.log("\n🌐 Sepolia Etherscan Links:");
    console.log("==========================");
    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`${name}: https://sepolia.etherscan.io/address/${address}`);
    });
}

quickTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
