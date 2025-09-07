const { ethers } = require("hardhat");

async function quickDeploy() {
    console.log("🚀 快速部署到Sepolia - 应急方案");
    
    try {
        // 使用多个RPC尝试
        const rpcEndpoints = [
            "https://rpc2.sepolia.org",
            "https://sepolia.drpc.org",
            "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
            "https://sepolia.gateway.tenderly.co",
            "https://rpc-sepolia.rockx.com"
        ];
        
        let provider;
        let workingRPC;
        
        console.log("🔄 尝试连接到Sepolia...");
        
        for (const rpc of rpcEndpoints) {
            try {
                console.log(`   试用: ${rpc.split('/')[2]}`);
                const testProvider = new ethers.JsonRpcProvider(rpc);
                
                // 测试连接
                await testProvider.getBlockNumber();
                provider = testProvider;
                workingRPC = rpc;
                console.log(`✅ 连接成功: ${rpc.split('/')[2]}`);
                break;
            } catch (error) {
                console.log(`❌ 失败: ${error.message}`);
                continue;
            }
        }
        
        if (!provider) {
            throw new Error("无法连接到任何Sepolia RPC节点");
        }
        
        // 使用私钥创建钱包
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("未找到PRIVATE_KEY环境变量");
        }
        
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log("📧 部署者地址:", wallet.address);
        
        // 检查余额
        const balance = await provider.getBalance(wallet.address);
        const balanceEth = ethers.formatEther(balance);
        console.log("💰 账户余额:", balanceEth, "ETH");
        
        if (parseFloat(balanceEth) < 0.001) {
            console.log("❌ 余额不足！需要至少 0.001 ETH");
            console.log("🚰 请先获取测试ETH:");
            console.log("   https://sepoliafaucet.com/");
            console.log("   地址:", wallet.address);
            return;
        }
        
        // 编译合约
        console.log("🔨 编译合约...");
        await require('child_process').execSync('npx hardhat compile', { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        // 部署合约
        console.log("🚀 开始部署PrivacyToken...");
        
        // 手动构建合约
        const contractCode = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.17;
        
        contract PrivacyToken {
            mapping(address => uint256) private _balances;
            mapping(address => mapping(address => uint256)) private _allowances;
            
            uint256 private _totalSupply;
            string public name;
            string public symbol;
            uint8 public decimals;
            address public owner;
            
            event Transfer(address indexed from, address indexed to, uint256 value);
            event Approval(address indexed owner, address indexed spender, uint256 value);
            
            constructor(string memory _name, string memory _symbol, uint8 _decimals) {
                name = _name;
                symbol = _symbol;
                decimals = _decimals;
                owner = msg.sender;
                
                uint256 initialSupply = 10_000_000 * 10**_decimals;
                _balances[owner] = initialSupply;
                _totalSupply = initialSupply;
                emit Transfer(address(0), owner, initialSupply);
            }
            
            function totalSupply() public view returns (uint256) {
                return _totalSupply;
            }
            
            function balanceOf(address account) public view returns (uint256) {
                return _balances[account];
            }
            
            function transfer(address to, uint256 amount) public returns (bool) {
                require(to != address(0), "Transfer to zero address");
                require(_balances[msg.sender] >= amount, "Insufficient balance");
                
                _balances[msg.sender] -= amount;
                _balances[to] += amount;
                emit Transfer(msg.sender, to, amount);
                return true;
            }
            
            function approve(address spender, uint256 amount) public returns (bool) {
                _allowances[msg.sender][spender] = amount;
                emit Approval(msg.sender, spender, amount);
                return true;
            }
            
            function allowance(address tokenOwner, address spender) public view returns (uint256) {
                return _allowances[tokenOwner][spender];
            }
            
            function transferFrom(address from, address to, uint256 amount) public returns (bool) {
                require(to != address(0), "Transfer to zero address");
                require(_balances[from] >= amount, "Insufficient balance");
                require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
                
                _balances[from] -= amount;
                _balances[to] += amount;
                _allowances[from][msg.sender] -= amount;
                
                emit Transfer(from, to, amount);
                return true;
            }
        }`;
        
        // 获取合约工厂
        const PrivacyToken = await ethers.getContractFactory("PrivacyToken", wallet);
        
        // 部署参数
        const deployTx = await PrivacyToken.deploy("Privacy Token", "PRIV", 18, {
            gasLimit: 2000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        
        console.log("⏳ 等待部署确认...");
        console.log("📄 交易哈希:", deployTx.deploymentTransaction()?.hash);
        
        await deployTx.waitForDeployment();
        const contractAddress = await deployTx.getAddress();
        
        console.log("🎉 部署成功!");
        console.log("📍 合约地址:", contractAddress);
        console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
        
        // 验证部署
        const contract = PrivacyToken.attach(contractAddress);
        const tokenName = await contract.name();
        const tokenSymbol = await contract.symbol();
        const tokenDecimals = await contract.decimals();
        const totalSupply = await contract.totalSupply();
        
        console.log("\n📊 合约验证:");
        console.log("   名称:", tokenName);
        console.log("   符号:", tokenSymbol);
        console.log("   精度:", tokenDecimals.toString());
        console.log("   总供应量:", ethers.formatUnits(totalSupply, tokenDecimals));
        
        // 保存部署信息
        const deploymentInfo = {
            network: "sepolia",
            rpcUsed: workingRPC,
            contractAddress: contractAddress,
            deployer: wallet.address,
            txHash: deployTx.deploymentTransaction()?.hash,
            blockNumber: await provider.getBlockNumber(),
            tokenInfo: {
                name: tokenName,
                symbol: tokenSymbol,
                decimals: tokenDecimals.toString(),
                totalSupply: ethers.formatUnits(totalSupply, tokenDecimals)
            },
            timestamp: new Date().toISOString()
        };
        
        require('fs').writeFileSync('./deployment-sepolia.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 部署信息已保存到 deployment-sepolia.json");
        
        return deploymentInfo;
        
    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n🚰 请获取测试ETH:");
            console.log("   https://sepoliafaucet.com/");
            console.log("   地址: 0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f");
        }
        
        throw error;
    }
}

if (require.main === module) {
    quickDeploy()
        .then((info) => {
            console.log("\n🎯 部署完成！");
            console.log("现在可以在MetaMask中添加代币:");
            console.log("地址:", info.contractAddress);
            console.log("符号:", info.tokenInfo.symbol);
            console.log("精度:", info.tokenInfo.decimals);
        })
        .catch(console.error);
}

module.exports = quickDeploy;
