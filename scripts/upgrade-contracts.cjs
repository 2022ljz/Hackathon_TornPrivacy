const hre = require("hardhat");

async function upgradeContracts() {
    console.log("🔄 Upgrading contracts to support ETH...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // 部署新的 Mixer 合约
    console.log("\n🌪️ Deploying new Mixer contract with ETH support...");
    const Mixer = await hre.ethers.getContractFactory("Mixer");
    const newMixer = await Mixer.deploy();
    await newMixer.waitForDeployment();
    console.log("New Mixer deployed to:", await newMixer.getAddress());

    // 获取现有的合约实例
    const lendingPool = await hre.ethers.getContractAt("LendingPool", "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad");

    // 部署新的 CollateralManager
    console.log("\n🏛️ Deploying new CollateralManager...");
    const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
    const newCollateralManager = await CollateralManager.deploy(
        await newMixer.getAddress(),
        await lendingPool.getAddress()
    );
    await newCollateralManager.waitForDeployment();
    console.log("New CollateralManager deployed to:", await newCollateralManager.getAddress());

    // 设置 CollateralManager 到新的 Mixer
    console.log("\n⚙️ Setting up new contracts...");
    const setManagerTx = await newMixer.setCollateralManager(await newCollateralManager.getAddress());
    await setManagerTx.wait();
    console.log("CollateralManager set in new Mixer");

    // 更新前端配置
    const newConfig = {
        CHAIN_ID: 11155111,
        MIXER_ADDRESS: await newMixer.getAddress(),
        LENDING_POOL_ADDRESS: "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad",
        COLLATERAL_MANAGER_ADDRESS: await newCollateralManager.getAddress(),
        TOKENS: {
            ETH: {
                address: "0x0000000000000000000000000000000000000000",
                symbol: "ETH",
                name: "Ethereum",
                decimals: 18
            },
            USDC: {
                address: "0xCB3A2E90568471eeD7b191AC45747e83bEE6642A",
                symbol: "USDC",
                name: "USD Coin",
                decimals: 6
            },
            DAI: {
                address: "0x3a6B9cC96D2FB5bCA277C0A222CE16Ab6bAeF5B4",
                symbol: "DAI",
                name: "Dai Stablecoin",
                decimals: 18
            }
        }
    };

    // 保存到配置文件
    const fs = require("fs");
    const path = require("path");

    fs.writeFileSync(
        path.join(__dirname, "..", "src", "config", "contracts.js"),
        `export default ${JSON.stringify(newConfig, null, 2)};`
    );

    console.log("\n✅ Upgrade completed!");
    console.log("\n📋 New Contract Addresses:");
    console.log("Mixer (with ETH support):", await newMixer.getAddress());
    console.log("CollateralManager:", await newCollateralManager.getAddress());
    console.log("LendingPool (unchanged):", "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad");

    console.log("\n🔍 Verify new contracts:");
    console.log(`npx hardhat verify --network sepolia ${await newMixer.getAddress()}`);
    console.log(`npx hardhat verify --network sepolia ${await newCollateralManager.getAddress()} ${await newMixer.getAddress()} 0x79D681b26F8012b59Ed1726241168aF367cDb7Ad`);
}

upgradeContracts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Upgrade failed:", error);
        process.exit(1);
    });
