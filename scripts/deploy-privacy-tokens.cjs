// 🚀 部署ERC-20隐私代币合约
const hre = require("hardhat");

async function deployPrivacyTokens() {
    console.log("🌟 开始部署ERC-20隐私代币合约...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📋 部署账户:", deployer.address);
    console.log("💰 账户余额:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    // 部署代币数组
    const tokens = [
        { name: "Privacy Token", symbol: "PVT", decimals: 18 },
        { name: "Tether USD", symbol: "USDT", decimals: 6 },
        { name: "USD Coin", symbol: "USDC", decimals: 6 },
        { name: "Dai Stablecoin", symbol: "DAI", decimals: 18 }
    ];

    const deployedTokens = {};

    for (const tokenInfo of tokens) {
        try {
            console.log(`\n🚀 部署 ${tokenInfo.name} (${tokenInfo.symbol})...`);

            // 获取合约工厂
            const PrivacyToken = await hre.ethers.getContractFactory("PrivacyToken");

            // 部署合约
            const token = await PrivacyToken.deploy(
                tokenInfo.name,
                tokenInfo.symbol,
                tokenInfo.decimals
            );

            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();

            console.log(`✅ ${tokenInfo.symbol} 部署成功:`);
            console.log(`   地址: ${tokenAddress}`);
            console.log(`   名称: ${tokenInfo.name}`);
            console.log(`   符号: ${tokenInfo.symbol}`);
            console.log(`   小数位: ${tokenInfo.decimals}`);

            // 检查部署者余额
            const balance = await token.balanceOf(deployer.address);
            console.log(`   部署者余额: ${hre.ethers.formatUnits(balance, tokenInfo.decimals)} ${tokenInfo.symbol}`);

            deployedTokens[tokenInfo.symbol] = {
                address: tokenAddress,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals
            };

            // 等待1秒避免网络拥堵
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`❌ ${tokenInfo.symbol} 部署失败:`, error.message);
        }
    }

    console.log("\n🎉 所有代币部署完成!");
    console.log("\n📋 部署摘要:");
    console.log("=====================================");

    let configUpdate = 'export default {\n    "CHAIN_ID": 11155111,\n    "MIXER_ADDRESS": "0xf85Daa3dBA126757027CE967F86Eb7860271AfE0",\n    "LENDING_POOL_ADDRESS": "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad",\n    "COLLATERAL_MANAGER_ADDRESS": "0xC9BAe3f8F6A47Daf0847294096906d91B8eF0f1d",\n    "TOKENS": {\n        "ETH": {\n            "address": "0x0000000000000000000000000000000000000000",\n            "symbol": "ETH",\n            "name": "Ethereum",\n            "decimals": 18\n        },';

    for (const [symbol, info] of Object.entries(deployedTokens)) {
        console.log(`${symbol}: ${info.address}`);
        configUpdate += `\n        "${symbol}": {\n            "address": "${info.address}",\n            "symbol": "${info.symbol}",\n            "name": "${info.name}",\n            "decimals": ${info.decimals}\n        },`;
    }

    configUpdate = configUpdate.slice(0, -1); // 移除最后一个逗号
    configUpdate += '\n    }\n};';

    console.log("\n🔧 更新配置文件 (src/config/contracts.js):");
    console.log("=====================================");
    console.log(configUpdate);

    console.log("\n💡 下一步:");
    console.log("1. 复制上面的配置更新到 src/config/contracts.js");
    console.log("2. 重启开发服务器");
    console.log("3. 在前端测试ERC-20代币的approve功能");
    console.log("4. 所有代币都支持隐私交易和approve机制");

    return deployedTokens;
}

// 执行部署
deployPrivacyTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });
