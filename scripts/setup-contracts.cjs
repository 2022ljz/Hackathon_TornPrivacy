const hre = require("hardhat");

async function setupContracts() {
    console.log("🔧 Setting up deployed contracts...");

    // 合约地址
    const addresses = {
        USDC: "0xCB3A2E90568471eeD7b191AC45747e83bEE6642A",
        DAI: "0x3a6B9cC96D2FB5bCA277C0A222CE16Ab6bAeF5B4",
        MIXER: "0x2dC7302afA5CEB66a1e322f61Eb2E3497a9eFBb0",
        LENDING_POOL: "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad",
        COLLATERAL_MANAGER: "0x08E28B20E9679D2d2ca92d242480f29e40a66F24"
    };

    const [signer] = await hre.ethers.getSigners();
    console.log("Setting up with account:", signer.address);

    // 获取合约实例
    const usdc = await hre.ethers.getContractAt("ERC20Mock", addresses.USDC);
    const dai = await hre.ethers.getContractAt("ERC20Mock", addresses.DAI);
    const mixer = await hre.ethers.getContractAt("Mixer", addresses.MIXER);
    const lendingPool = await hre.ethers.getContractAt("LendingPool", addresses.LENDING_POOL);

    console.log("\n🔗 Setting CollateralManager in Mixer...");
    try {
        const setManagerTx = await mixer.setCollateralManager(addresses.COLLATERAL_MANAGER);
        await setManagerTx.wait();
        console.log("✅ CollateralManager set successfully");
    } catch (error) {
        console.log("⚠️ CollateralManager already set or error:", error.message);
    }

    console.log("\n💰 Minting test tokens...");

    // 铸造 USDC
    try {
        const usdcAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC
        const mintUsdcTx = await usdc.mint(signer.address, usdcAmount);
        await mintUsdcTx.wait();
        console.log("✅ Minted 10,000 USDC");
    } catch (error) {
        console.log("⚠️ USDC mint error:", error.message);
    }

    // 铸造 DAI
    try {
        const daiAmount = hre.ethers.parseUnits("10000", 18); // 10,000 DAI
        const mintDaiTx = await dai.mint(signer.address, daiAmount);
        await mintDaiTx.wait();
        console.log("✅ Minted 10,000 DAI");
    } catch (error) {
        console.log("⚠️ DAI mint error:", error.message);
    }

    console.log("\n🏦 Adding liquidity to LendingPool...");

    // 为借贷池添加流动性
    try {
        const liquidityAmount = hre.ethers.parseUnits("5000", 6); // 5,000 USDC

        // 授权
        const approveTx = await usdc.approve(addresses.LENDING_POOL, liquidityAmount);
        await approveTx.wait();
        console.log("✅ USDC approved for liquidity");

        // 添加流动性
        const fundTx = await lendingPool.fund(addresses.USDC, liquidityAmount);
        await fundTx.wait();
        console.log("✅ Added 5,000 USDC liquidity");
    } catch (error) {
        console.log("⚠️ Liquidity add error:", error.message);
    }

    // 添加 DAI 流动性
    try {
        const daiLiquidityAmount = hre.ethers.parseUnits("5000", 18); // 5,000 DAI

        // 授权
        const approveDaiTx = await dai.approve(addresses.LENDING_POOL, daiLiquidityAmount);
        await approveDaiTx.wait();
        console.log("✅ DAI approved for liquidity");

        // 添加流动性
        const fundDaiTx = await lendingPool.fund(addresses.DAI, daiLiquidityAmount);
        await fundDaiTx.wait();
        console.log("✅ Added 5,000 DAI liquidity");
    } catch (error) {
        console.log("⚠️ DAI liquidity add error:", error.message);
    }

    console.log("\n📊 Final balances:");
    const usdcBalance = await usdc.balanceOf(signer.address);
    const daiBalance = await dai.balanceOf(signer.address);
    const poolUsdcBalance = await usdc.balanceOf(addresses.LENDING_POOL);
    const poolDaiBalance = await dai.balanceOf(addresses.LENDING_POOL);

    console.log("Your USDC balance:", hre.ethers.formatUnits(usdcBalance, 6));
    console.log("Your DAI balance:", hre.ethers.formatUnits(daiBalance, 18));
    console.log("Pool USDC balance:", hre.ethers.formatUnits(poolUsdcBalance, 6));
    console.log("Pool DAI balance:", hre.ethers.formatUnits(poolDaiBalance, 18));

    console.log("\n✅ Setup completed! Your contracts are ready for testing.");
}

setupContracts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Setup failed:", error);
        process.exit(1);
    });
