const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment to Sepolia testnet...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // 部署合约的地址记录
    const deployedContracts = {};

    // 1. 部署 Mock ERC20 代币 (USDC, USDT)
    console.log("\n📄 Deploying Mock ERC20 tokens...");

    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");

    const usdc = await ERC20Mock.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    console.log("USDC Mock deployed to:", await usdc.getAddress());
    deployedContracts.USDC_MOCK = await usdc.getAddress();

    const usdt = await ERC20Mock.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();
    console.log("USDT Mock deployed to:", await usdt.getAddress());
    deployedContracts.USDT_MOCK = await usdt.getAddress();

    // 2. 部署 Mixer 合约
    console.log("\n🌪️ Deploying Mixer contract...");
    const Mixer = await hre.ethers.getContractFactory("Mixer");
    const mixer = await Mixer.deploy();
    await mixer.waitForDeployment();
    console.log("Mixer deployed to:", await mixer.getAddress());
    deployedContracts.MIXER = await mixer.getAddress();

    // 3. 部署 LendingPool 合约
    console.log("\n🏦 Deploying LendingPool contract...");
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy();
    await lendingPool.waitForDeployment();
    console.log("LendingPool deployed to:", await lendingPool.getAddress());
    deployedContracts.LENDING_POOL = await lendingPool.getAddress();

    // 4. 部署 CollateralManager 合约
    console.log("\n🏛️ Deploying CollateralManager contract...");
    const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
    const collateralManager = await CollateralManager.deploy(await mixer.getAddress(), await lendingPool.getAddress());
    await collateralManager.waitForDeployment();
    console.log("CollateralManager deployed to:", await collateralManager.getAddress());
    deployedContracts.COLLATERAL_MANAGER = await collateralManager.getAddress();

    // 5. 设置 CollateralManager 到 Mixer
    console.log("\n⚙️ Setting up contracts...");
    const setManagerTx = await mixer.setCollateralManager(await collateralManager.getAddress());
    await setManagerTx.wait();
    console.log("CollateralManager set in Mixer");

    // 6. 为测试添加流动性到 LendingPool
    console.log("\n💰 Adding initial liquidity to LendingPool...");

    // 给部署者铸造一些代币
    const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1M tokens
    await usdc.mint(deployer.address, mintAmount);
    await usdt.mint(deployer.address, mintAmount);
    console.log("Minted tokens to deployer");

    // 批准并存入流动性
    const liquidityAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens

    await usdc.approve(await lendingPool.getAddress(), liquidityAmount);
    await lendingPool.fund(await usdc.getAddress(), liquidityAmount);
    console.log("Added USDC liquidity to LendingPool");

    await usdt.approve(await lendingPool.getAddress(), liquidityAmount);
    await lendingPool.fund(await usdt.getAddress(), liquidityAmount);
    console.log("Added USDT liquidity to LendingPool");

    // 7. 保存部署信息
    const deploymentInfo = {
        network: "sepolia",
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployedContracts,
        transactions: {
            usdc: usdc.deploymentTransaction().hash,
            usdt: usdt.deploymentTransaction().hash,
            mixer: mixer.deploymentTransaction().hash,
            lendingPool: lendingPool.deploymentTransaction().hash,
            collateralManager: collateralManager.deploymentTransaction().hash
        }
    };

    // 保存到 JSON 文件
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    fs.writeFileSync(
        path.join(deploymentsDir, "sepolia.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );

    // 更新前端配置文件
    const frontendConfig = {
        CHAIN_ID: 11155111,
        MIXER_ADDRESS: await mixer.getAddress(),
        LENDING_POOL_ADDRESS: await lendingPool.getAddress(),
        COLLATERAL_MANAGER_ADDRESS: await collateralManager.getAddress(),
        TOKENS: {
            USDC: {
                address: await usdc.getAddress(),
                symbol: "USDC",
                name: "USD Coin",
                decimals: 6
            },
            USDT: {
                address: await usdt.getAddress(),
                symbol: "USDT",
                name: "Tether USD",
                decimals: 6
            }
        }
    };

    fs.writeFileSync(
        path.join(__dirname, "..", "src", "config", "contracts.js"),
        `export default ${JSON.stringify(frontendConfig, null, 2)};`
    );

    console.log("\n✅ Deployment completed successfully!");
    console.log("\n📋 Deployed Contract Addresses:");
    console.log("================================");
    Object.entries(deployedContracts).forEach(([name, address]) => {
        console.log(`${name}: ${address}`);
    });

    console.log("\n🔍 Verify contracts on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${await usdc.getAddress()} "USD Coin" "USDC" 6`);
    console.log(`npx hardhat verify --network sepolia ${await usdt.getAddress()} "Tether USD" "USDT" 6`);
    console.log(`npx hardhat verify --network sepolia ${await mixer.getAddress()}`);
    console.log(`npx hardhat verify --network sepolia ${await lendingPool.getAddress()}`);
    console.log(`npx hardhat verify --network sepolia ${await collateralManager.getAddress()} ${await mixer.getAddress()} ${await lendingPool.getAddress()}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
