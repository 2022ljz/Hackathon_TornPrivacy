const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 开始部署隐私代币合约到本地网络...");

    const [deployer] = await ethers.getSigners();
    console.log("📧 部署地址:", deployer.address);

    // 部署PrivacyToken合约
    console.log("🌟 部署 PrivacyToken (Privacy USDC)...");
    const PrivacyToken = await ethers.getContractFactory("PrivacyToken");
    const pUSDC = await PrivacyToken.deploy("Privacy USDC", "pUSDC", 6, ethers.parseUnits("1000000", 6));
    await pUSDC.waitForDeployment();

    const pUSDCAddress = await pUSDC.getAddress();
    console.log("✅ Privacy USDC 部署完成:", pUSDCAddress);

    // 测试ERC20功能
    console.log("\n🧪 测试 ERC20 功能...");

    // 检查初始供应量
    const totalSupply = await pUSDC.totalSupply();
    console.log("💰 总供应量:", ethers.formatUnits(totalSupply, 6), "pUSDC");

    // 检查余额
    const balance = await pUSDC.balanceOf(deployer.address);
    console.log("📊 部署者余额:", ethers.formatUnits(balance, 6), "pUSDC");

    // 测试转账
    const [deployer2] = await ethers.getSigners();
    const transferAmount = ethers.parseUnits("100", 6);

    console.log("\n💸 测试转账功能...");
    const tx = await pUSDC.transfer(deployer2.address, transferAmount);
    await tx.wait();

    const newBalance = await pUSDC.balanceOf(deployer2.address);
    console.log("✅ 转账成功，接收者余额:", ethers.formatUnits(newBalance, 6), "pUSDC");

    // 测试approve功能
    console.log("\n🔐 测试 approve 功能...");
    const approveAmount = ethers.parseUnits("50", 6);
    const approveTx = await pUSDC.approve(deployer2.address, approveAmount);
    await approveTx.wait();

    const allowance = await pUSDC.allowance(deployer.address, deployer2.address);
    console.log("✅ Approve成功，授权额度:", ethers.formatUnits(allowance, 6), "pUSDC");

    // 保存部署信息
    const deploymentInfo = {
        network: "localhost",
        contracts: {
            PrivacyUSDC: {
                address: pUSDCAddress,
                name: "Privacy USDC",
                symbol: "pUSDC",
                decimals: 6,
                totalSupply: ethers.formatUnits(totalSupply, 6)
            }
        },
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync('./deployment-local.json', JSON.stringify(deploymentInfo, null, 2));

    console.log("\n💾 部署信息已保存到 deployment-local.json");
    console.log("🎉 本地测试部署完成！");

    return { pUSDC, address: pUSDCAddress };
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ 部署失败:", error);
            process.exit(1);
        });
}

module.exports = main;
