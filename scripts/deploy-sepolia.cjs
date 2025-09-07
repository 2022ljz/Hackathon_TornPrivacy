const { ethers, network } = require("hardhat");

async function main() {
    console.log("🌟 开始在Sepolia测试网部署ERC-20代币...");
    console.log("📡 网络:", network.name);
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("📧 部署者地址:", deployerAddress);
    
    try {
        // 检查余额
        const balance = await deployer.provider.getBalance(deployerAddress);
        const balanceInEth = ethers.formatEther(balance);
        console.log("💰 账户余额:", balanceInEth, "ETH");
        
        if (parseFloat(balanceInEth) < 0.01) {
            console.log("⚠️  余额可能不足，建议至少有0.01 ETH");
            console.log("🚰 请访问Sepolia水龙头获取测试ETH:");
            console.log("   - https://sepoliafaucet.com/");
            console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
        }
        
        // 部署PrivacyToken (按照参考文档模式)
        console.log("\n🚀 开始部署PrivacyToken...");
        const PrivacyToken = await ethers.getContractFactory("PrivacyToken");
        
        // 部署参数：name, symbol, decimals
        const tokenName = "Privacy Token";
        const tokenSymbol = "PRIV";
        const tokenDecimals = 18;
        
        console.log(`📋 代币信息:`);
        console.log(`   名称: ${tokenName}`);
        console.log(`   符号: ${tokenSymbol}`);
        console.log(`   精度: ${tokenDecimals}`);
        
        const privacyToken = await PrivacyToken.deploy(
            tokenName,
            tokenSymbol,
            tokenDecimals
        );
        
        console.log("⏳ 等待交易确认...");
        await privacyToken.waitForDeployment();
        
        const tokenAddress = await privacyToken.getAddress();
        console.log("✅ PrivacyToken 部署成功!");
        console.log("📍 合约地址:", tokenAddress);
        
        // 获取基本信息验证
        const name = await privacyToken.name();
        const symbol = await privacyToken.symbol();
        const decimals = await privacyToken.decimals();
        const totalSupply = await privacyToken.totalSupply();
        const ownerBalance = await privacyToken.balanceOf(deployerAddress);
        
        console.log("\n📊 合约验证:");
        console.log("   名称:", name);
        console.log("   符号:", symbol);
        console.log("   精度:", decimals.toString());
        console.log("   总供应量:", ethers.formatUnits(totalSupply, decimals));
        console.log("   部署者余额:", ethers.formatUnits(ownerBalance, decimals));
        
        // 保存部署信息
        const deploymentInfo = {
            network: network.name,
            chainId: network.config.chainId,
            deployer: deployerAddress,
            contracts: {
                PrivacyToken: {
                    address: tokenAddress,
                    name: name,
                    symbol: symbol,
                    decimals: decimals.toString(),
                    totalSupply: ethers.formatUnits(totalSupply, decimals),
                    deploymentBlock: await deployer.provider.getBlockNumber()
                }
            },
            timestamp: new Date().toISOString(),
            explorerUrl: `https://sepolia.etherscan.io/token/${tokenAddress}`
        };
        
        const fs = require('fs');
        fs.writeFileSync('./deployment-sepolia.json', JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n💾 部署信息已保存到 deployment-sepolia.json");
        console.log("🔍 在Etherscan上查看:");
        console.log(`   ${deploymentInfo.explorerUrl}`);
        
        // 提示下一步操作
        console.log("\n📝 下一步操作:");
        console.log("1. 在Etherscan上验证合约");
        console.log("2. 添加代币到MetaMask:");
        console.log(`   代币地址: ${tokenAddress}`);
        console.log(`   符号: ${symbol}`);
        console.log(`   精度: ${decimals}`);
        console.log("3. 测试approve功能");
        
        return {
            address: tokenAddress,
            name,
            symbol,
            decimals
        };
        
    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log("\n💡 解决方案:");
            console.log("1. 获取Sepolia测试ETH:");
            console.log("   - https://sepoliafaucet.com/");
            console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
            console.log("2. 等待几分钟后重试");
        } else if (error.message.includes('network')) {
            console.log("\n💡 解决方案:");
            console.log("1. 检查网络连接");
            console.log("2. 尝试使用不同的RPC端点");
            console.log("3. 等待网络稳定后重试");
        }
        
        throw error;
    }
}

// 如果直接运行这个脚本
if (require.main === module) {
    main()
        .then(() => {
            console.log("\n🎉 部署完成!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("💥 脚本执行失败:", error);
            process.exit(1);
        });
}

module.exports = main;
