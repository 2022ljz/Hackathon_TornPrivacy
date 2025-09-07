console.log("🔧 检查部署环境...");

const { ethers } = require("hardhat");

async function testConnection() {
    try {
        console.log("📡 连接到网络...");
        const [signer] = await ethers.getSigners();
        console.log("📧 获取到签名者:", signer.address);

        const balance = await signer.provider.getBalance(signer.address);
        console.log("💰 余额:", ethers.formatEther(balance), "ETH");

        console.log("🔨 尝试编译合约...");
        const PrivacyToken = await ethers.getContractFactory("PrivacyToken");
        console.log("✅ 合约编译成功");

        console.log("🚀 开始部署...");
        const token = await PrivacyToken.deploy(
            "Test Privacy Token",
            "TPT",
            18
        );

        console.log("⏳ 等待部署确认...");
        await token.waitForDeployment();

        const address = await token.getAddress();
        console.log("🎉 部署成功！合约地址:", address);

        // 测试基本功能
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        const totalSupply = await token.totalSupply();

        console.log("📋 合约信息:");
        console.log("  - 符号:", symbol);
        console.log("  - 小数位:", decimals.toString());
        console.log("  - 总供应量:", ethers.formatEther(totalSupply));

        return { success: true, address };

    } catch (error) {
        console.error("❌ 测试失败:", error.message);
        return { success: false, error: error.message };
    }
}

testConnection().then(result => {
    if (result.success) {
        console.log("✅ 所有测试通过!");
    } else {
        console.log("❌ 测试失败:", result.error);
    }
    process.exit(result.success ? 0 : 1);
});
