const { ethers } = require("hardhat");

async function checkAccount() {
    try {
        console.log("🔍 检查部署者账户...");
        
        const [deployer] = await ethers.getSigners();
        const address = await deployer.getAddress();
        console.log("📧 部署者地址:", address);
        
        const balance = await deployer.provider.getBalance(address);
        const balanceInEth = ethers.formatEther(balance);
        console.log("💰 账户余额:", balanceInEth, "ETH");
        
        if (parseFloat(balanceInEth) === 0) {
            console.log("\n❌ 账户余额为0！需要获取测试ETH");
            console.log("🚰 请访问以下水龙头获取Sepolia测试ETH:");
            console.log("   1. https://sepoliafaucet.com/");
            console.log("   2. https://www.alchemy.com/faucets/ethereum-sepolia");
            console.log("   3. https://sepolia-faucet.pk910.de/");
            console.log("   4. https://faucet.quicknode.com/ethereum/sepolia");
            console.log("\n📝 步骤:");
            console.log("   1. 复制地址:", address);
            console.log("   2. 粘贴到水龙头网站");
            console.log("   3. 请求测试ETH");
            console.log("   4. 等待几分钟");
            console.log("   5. 重新运行此脚本检查");
        } else if (parseFloat(balanceInEth) < 0.01) {
            console.log("\n⚠️  余额较低，建议至少有0.01 ETH用于gas费");
            console.log("🚰 建议获取更多测试ETH");
        } else {
            console.log("\n✅ 余额足够，可以进行部署！");
        }
        
        // 检查网络
        const network = await deployer.provider.getNetwork();
        console.log("🌐 当前网络:", network.name, "Chain ID:", network.chainId.toString());
        
        if (network.chainId.toString() !== "11155111") {
            console.log("❌ 网络不正确！应该是Sepolia (Chain ID: 11155111)");
        } else {
            console.log("✅ 网络配置正确");
        }
        
    } catch (error) {
        console.error("❌ 检查失败:", error.message);
        
        if (error.message.includes('network')) {
            console.log("\n💡 网络连接问题，请尝试:");
            console.log("   1. 检查网络连接");
            console.log("   2. 更换RPC端点");
            console.log("   3. 稍后重试");
        }
    }
}

checkAccount();
