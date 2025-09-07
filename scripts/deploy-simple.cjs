const { ethers, network } = require("hardhat");

async function main() {
    console.log("🌟 正在连接网络:", network.name);

    const [deployer] = await ethers.getSigners();
    console.log("📧 部署地址:", deployer.address);

    try {
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log("💰 账户余额:", ethers.formatEther(balance), "ETH");

        if (balance === 0n) {
            console.log("❌ 余额不足，请先获取测试ETH");
            return;
        }

        // 部署一个简单的ERC20Mock合约
        console.log("🚀 开始部署ERC20Mock合约...");
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        const usdc = await ERC20Mock.deploy("Privacy USDC", "pUSDC", 6);

        console.log("⏳ 等待部署确认...");
        await usdc.waitForDeployment();

        const address = await usdc.getAddress();
        console.log("✅ ERC20Mock部署成功:", address);

        // 保存地址
        const fs = require('fs');
        const deployment = {
            network: network.name,
            address: address,
            deployer: deployer.address,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            './deployment.json',
            JSON.stringify(deployment, null, 2)
        );

        console.log("💾 部署信息已保存到 deployment.json");

    } catch (error) {
        console.error("❌ 部署失败:", error.message);

        if (error.message.includes('insufficient funds')) {
            console.log("💡 请访问 Sepolia 水龙头获取测试 ETH:");
            console.log("   - https://sepoliafaucet.com/");
            console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 脚本执行失败:", error);
        process.exit(1);
    });
