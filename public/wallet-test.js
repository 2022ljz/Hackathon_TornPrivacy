// Console test for wallet functionality
window.testWalletFunctionality = async function () {
    console.log('🧪 Testing wallet functionality...');

    try {
        // Test ethers import
        const { ethers } = await import('/node_modules/ethers/dist/ethers.js');
        console.log('✅ Ethers imported successfully');

        // Test MetaMask availability
        if (!window.ethereum) {
            throw new Error('MetaMask not available');
        }
        console.log('✅ MetaMask available');

        // Test account access
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            console.log('⚠️ No accounts connected, requesting permission...');
            await window.ethereum.request({ method: 'eth_requestAccounts' });
        }

        const account = accounts[0] || (await window.ethereum.request({ method: 'eth_accounts' }))[0];
        console.log('✅ Account:', account);

        // Test provider creation
        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log('✅ Provider created');

        // Test balance retrieval (multiple methods)
        console.log('🔍 Testing balance retrieval methods...');

        // Method 1: Direct provider call
        try {
            const balance1 = await provider.getBalance(account);
            console.log('✅ Method 1 - provider.getBalance:', ethers.formatEther(balance1), 'ETH');
        } catch (e) {
            console.log('❌ Method 1 failed:', e.message);
        }

        // Method 2: Via window.ethereum
        try {
            const balanceHex = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [account, 'latest']
            });
            const balance2 = ethers.getBigInt(balanceHex);
            console.log('✅ Method 2 - eth_getBalance:', ethers.formatEther(balance2), 'ETH');
        } catch (e) {
            console.log('❌ Method 2 failed:', e.message);
        }

        // Method 3: With signer
        try {
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait for initialization
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();
            const balance3 = await provider.getBalance(signerAddress);
            console.log('✅ Method 3 - via signer:', ethers.formatEther(balance3), 'ETH');
        } catch (e) {
            console.log('❌ Method 3 failed:', e.message);
        }

        // Test network info
        try {
            const network = await provider.getNetwork();
            console.log('✅ Network:', network.chainId, network.name);
        } catch (e) {
            console.log('❌ Network detection failed, trying fallback:', e.message);
            try {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                console.log('✅ Fallback network:', chainId);
            } catch (fallbackError) {
                console.log('❌ All network methods failed:', fallbackError.message);
            }
        }

        console.log('🎉 Wallet functionality test completed!');
        return true;

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
};

console.log('💡 Test function loaded! Run testWalletFunctionality() to test.');
