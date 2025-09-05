#!/bin/bash

echo "🚀 PIONEER DeFi Platform - Sepolia Deployment Script"
echo "=================================================="

# 检查是否安装了 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# 检查是否安装了 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your private key and RPC URL:"
    echo "   - PRIVATE_KEY: Your wallet private key (without 0x)"
    echo "   - SEPOLIA_RPC_URL: Infura or Alchemy Sepolia RPC URL"
    echo "   - ETHERSCAN_API_KEY: For contract verification"
    exit 1
fi

# 安装依赖
echo "📦 Installing dependencies..."
npm install

# 编译合约
echo "🔨 Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed!"
    exit 1
fi

# 生成 ABIs
echo "📄 Generating contract ABIs..."
node scripts/generateABIs.js

# 部署到 Sepolia
echo "🌐 Deploying to Sepolia testnet..."
npx hardhat run scripts/deploy.js --network sepolia

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check deployments/sepolia.json for contract addresses"
echo "2. Verify contracts on Etherscan using the provided commands"
echo "3. Start the frontend: npm run dev"
echo "4. Test the application with Sepolia testnet"
echo ""
echo "🎉 Your PIONEER DeFi Platform is ready on Sepolia!"
