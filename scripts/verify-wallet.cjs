const { ethers } = require("ethers");
require("dotenv").config();

async function verifyWalletInfo() {
    console.log("🔍 验证钱包配置...");
    
    try {
        // 从环境变量获取私钥
        const privateKey = process.env.PRIVATE_KEY;
        
        if (!privateKey) {
            console.log("❌ 未找到私钥配置");
            console.log("请在 .env 文件中设置 PRIVATE_KEY");
            return;
        }
        
        console.log("✅ 找到私钥配置");
        console.log("🔑 私钥前缀:", privateKey.substring(0, 10) + "...");
        
        // 从私钥生成钱包
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;
        
        console.log("📧 由私钥生成的地址:", address);
        console.log("🎯 您提到的地址:", "0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f");
        
        // 检查地址是否匹配
        const addressMatch = address.toLowerCase() === "0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f".toLowerCase();
        
        if (addressMatch) {
            console.log("🎉 地址匹配！配置正确");
            return { address, privateKey, match: true };
        } else {
            console.log("⚠️  地址不匹配！");
            console.log("配置的私钥对应地址:", address);
            console.log("您期望的地址:", "0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f");
            
            console.log("\n🔧 解决方案:");
            console.log("1. 如果您想使用配置的私钥，请使用地址:", address);
            console.log("2. 如果您想使用地址 0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f，请提供对应的私钥");
            
            return { address, privateKey, match: false, expectedAddress: "0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f" };
        }
        
    } catch (error) {
        console.error("❌ 验证失败:", error.message);
        
        if (error.message.includes("invalid private key")) {
            console.log("💡 私钥格式错误，请确保私钥是64位十六进制字符串");
        }
        
        return { error: error.message };
    }
}

async function checkSepoliaBalance(address) {
    console.log("\n🌐 检查Sepolia余额...");
    
    try {
        // 连接到Sepolia网络
        const providers = [
            "https://rpc2.sepolia.org",
            "https://eth-sepolia.g.alchemy.com/v2/demo",
            "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
        ];
        
        let balance = null;
        let workingProvider = null;
        
        for (const rpcUrl of providers) {
            try {
                console.log(`🔄 尝试连接: ${rpcUrl.split('/')[2]}`);
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                balance = await provider.getBalance(address);
                workingProvider = rpcUrl;
                console.log("✅ 连接成功");
                break;
            } catch (err) {
                console.log(`❌ 连接失败: ${err.message}`);
                continue;
            }
        }
        
        if (balance !== null) {
            const balanceInEth = ethers.formatEther(balance);
            console.log(`💰 地址 ${address} 的Sepolia余额:`, balanceInEth, "ETH");
            console.log(`🔗 使用的RPC: ${workingProvider}`);
            
            if (parseFloat(balanceInEth) === 0) {
                console.log("\n🚰 需要获取测试ETH，请访问:");
                console.log("   - https://sepoliafaucet.com/");
                console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
                console.log("   - https://sepolia-faucet.pk910.de/");
            } else if (parseFloat(balanceInEth) < 0.01) {
                console.log("⚠️  余额较低，建议获取更多测试ETH");
            } else {
                console.log("✅ 余额充足，可以进行部署");
            }
            
            return { balance: balanceInEth, rpcUrl: workingProvider };
        } else {
            console.log("❌ 无法连接到任何Sepolia RPC节点");
            return { error: "网络连接失败" };
        }
        
    } catch (error) {
        console.error("❌ 余额查询失败:", error.message);
        return { error: error.message };
    }
}

async function main() {
    console.log("🏗️  钱包配置验证工具");
    console.log("=".repeat(50));
    
    // 验证钱包配置
    const walletInfo = await verifyWalletInfo();
    
    if (walletInfo.error) {
        console.log("\n❌ 无法继续，请先修复配置问题");
        return;
    }
    
    // 检查余额
    if (walletInfo.match) {
        await checkSepoliaBalance(walletInfo.address);
    } else {
        console.log("\n📋 建议操作:");
        console.log("1. 检查配置地址余额:", walletInfo.address);
        await checkSepoliaBalance(walletInfo.address);
        
        console.log("\n2. 检查期望地址余额:", walletInfo.expectedAddress);
        await checkSepoliaBalance(walletInfo.expectedAddress);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🎯 总结:");
    
    if (walletInfo.match) {
        console.log("✅ 钱包配置正确，可以进行部署");
    } else {
        console.log("⚠️  需要解决地址不匹配问题");
        console.log("选择一个有余额的地址，并确保有对应的私钥");
    }
}

main().catch(console.error);
