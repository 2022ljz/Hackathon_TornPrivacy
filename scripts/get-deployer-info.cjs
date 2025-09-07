const { ethers } = require("ethers");

// 从.env文件读取私钥
require('dotenv').config();

async function getDeployerInfo() {
    try {
        console.log("🔍 获取部署者信息...");
        
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            console.log("❌ 未找到私钥，请检查.env文件");
            return;
        }
        
        // 创建钱包
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;
        
        console.log("📧 部署者地址:", address);
        console.log("🔑 私钥 (前8位):", privateKey.substring(0, 8) + "...");
        
        console.log("\n🚰 获取Sepolia测试ETH:");
        console.log("   请复制以下地址到水龙头网站:");
        console.log("   📋", address);
        console.log("\n   推荐水龙头:");
        console.log("   1. https://sepoliafaucet.com/");
        console.log("   2. https://www.alchemy.com/faucets/ethereum-sepolia");
        console.log("   3. https://sepolia-faucet.pk910.de/");
        console.log("   4. https://faucet.quicknode.com/ethereum/sepolia");
        
        console.log("\n📝 获取测试ETH后的步骤:");
        console.log("   1. 等待5-10分钟");
        console.log("   2. 运行: npx hardhat run scripts/check-account.cjs --network sepolia");
        console.log("   3. 确认余额 > 0.01 ETH");
        console.log("   4. 运行: npx hardhat run scripts/deploy-sepolia.cjs --network sepolia");
        
        // 尝试多个RPC端点
        const rpcEndpoints = [
            "https://rpc2.sepolia.org",
            "https://eth-sepolia.g.alchemy.com/v2/demo",
            "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            "https://rpc.sepolia.dev"
        ];
        
        console.log("\n🌐 测试RPC连接...");
        for (const rpc of rpcEndpoints) {
            try {
                const provider = new ethers.JsonRpcProvider(rpc);
                const balance = await provider.getBalance(address);
                const balanceInEth = ethers.formatEther(balance);
                
                console.log(`✅ ${rpc}:`);
                console.log(`   余额: ${balanceInEth} ETH`);
                
                if (parseFloat(balanceInEth) > 0) {
                    console.log(`   🎉 发现余额！可以使用此RPC进行部署`);
                }
                break;
                
            } catch (error) {
                console.log(`❌ ${rpc}: 连接失败`);
            }
        }
        
    } catch (error) {
        console.error("❌ 错误:", error.message);
    }
}

getDeployerInfo();
