// 简化的 MetaMask 连接测试
async function testMetaMaskConnection() {
    console.log('🧪 Testing MetaMask connection...');

    if (!window.ethereum) {
        console.error('❌ MetaMask not found');
        return false;
    }

    try {
        // 请求账户权限
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        console.log('✅ Accounts:', accounts);

        // 获取链 ID
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });
        console.log('✅ Chain ID:', chainId);

        // 使用 ethers v6 创建 provider
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log('✅ Provider created');

        // 等待一下再获取 signer，避免私有字段问题
        await new Promise(resolve => setTimeout(resolve, 500));

        // 获取 signer
        const signer = await provider.getSigner();
        console.log('✅ Signer created');

        // 获取地址
        const address = await signer.getAddress();
        console.log('✅ Address:', address);

        // 获取余额
        const balance = await provider.getBalance(address);
        console.log('✅ Balance:', ethers.formatEther(balance), 'ETH');

        return {
            address,
            chainId: parseInt(chainId, 16),
            balance: ethers.formatEther(balance)
        };

    } catch (error) {
        console.error('❌ Connection failed:', error);
        return false;
    }
}// 导出到全局作用域供控制台使用
window.testMetaMaskConnection = testMetaMaskConnection;

console.log('💡 Run `testMetaMaskConnection()` in console to test MetaMask connection');
