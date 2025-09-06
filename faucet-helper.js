#!/usr/bin/env node

// 🚰 Sepolia ETH 获取助手
console.log('🚰 Sepolia ETH Faucet Helper');
console.log('==============================\n');

const https = require('https');

// 检查Sepolia余额
async function checkBalance(address) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1
        });

        const options = {
            hostname: 'sepolia.infura.io',
            port: 443,
            path: '/v3/9aa3d95b3bc440fa88ea12eaa4456161', // 公共endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => response += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(response);
                    if (result.error) {
                        reject(result.error);
                    } else {
                        const balanceWei = parseInt(result.result, 16);
                        const balanceEth = balanceWei / 1e18;
                        resolve(balanceEth);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 获取钱包地址（从命令行参数或环境变量）
const walletAddress = process.argv[2] || process.env.WALLET_ADDRESS;

if (!walletAddress) {
    console.log('❌ Please provide a wallet address:');
    console.log('   node faucet-helper.js 0xYourWalletAddress');
    console.log('   or set WALLET_ADDRESS environment variable\n');
    process.exit(1);
}

// 验证地址格式
if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    console.log('❌ Invalid Ethereum address format');
    console.log('   Address should be 42 characters starting with 0x\n');
    process.exit(1);
}

console.log(`🔍 Checking balance for: ${walletAddress}\n`);

// 检查当前余额
checkBalance(walletAddress)
    .then(balance => {
        console.log(`💰 Current Sepolia ETH Balance: ${balance.toFixed(6)} ETH\n`);

        if (balance < 0.01) {
            console.log('🚨 Low balance detected! You need more Sepolia ETH.\n');
            console.log('🚰 Recommended Faucets (click to open):');
            console.log('   1. Alchemy Faucet (0.5 ETH): https://sepoliafaucet.com/');
            console.log('   2. Chainlink Faucet (0.1 ETH): https://faucets.chain.link/sepolia');
            console.log('   3. QuickNode Faucet (0.05 ETH): https://faucet.quicknode.com/sepolia');
            console.log('   4. Infura Faucet (0.05 ETH): https://www.infura.io/faucet/sepolia');
            console.log('\n📋 Copy your address: ' + walletAddress);
            console.log('\n🎯 Steps:');
            console.log('   1. Visit any faucet above');
            console.log('   2. Connect wallet or paste address');
            console.log('   3. Complete social verification (GitHub/Twitter)');
            console.log('   4. Request ETH');
            console.log('   5. Wait 1-5 minutes for confirmation');
            console.log('\n⏰ Run this script again to check updated balance');
        } else if (balance < 0.1) {
            console.log('⚠️  You have some ETH, but might want more for testing.');
            console.log('💡 Consider getting additional ETH from faucets above.');
        } else {
            console.log('✅ Great! You have sufficient ETH for testing.');
            console.log('🚀 You can now use the Torn Privacy application!');
        }

        console.log('\n🔗 Sepolia Explorer: https://sepolia.etherscan.io/address/' + walletAddress);
    })
    .catch(error => {
        console.error('❌ Error checking balance:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Check internet connection');
        console.log('   - Verify wallet address is correct');
        console.log('   - Try again in a few moments');
    });

// 额外的实用功能
console.log('\n💡 Pro Tips:');
console.log('   - Use multiple faucets for more ETH (up to 1+ ETH/day)');
console.log('   - Join Discord communities for additional faucet bots');
console.log('   - Save this address for future faucet requests');
console.log('   - Sepolia ETH has no real value - request freely!');

// 如果没有足够的ETH，提供快速链接
setTimeout(() => {
    if (process.platform === 'darwin') { // macOS
        console.log('\n🖱️  Quick Actions (macOS):');
        console.log('   CMD+Click the faucet links above to open in browser');
    }
}, 100);
