// Borrow Troubleshooting Script for Tornado Privacy
// Copy and paste this into the browser console to debug borrow issues

console.log('🔧 Tornado Privacy - Borrow Troubleshooting Script')
console.log('='.repeat(50))

async function troubleshootBorrow(commitment, borrowToken, borrowAmount) {
    console.log('🔍 Starting borrow troubleshooting...')
    console.log('Parameters:')
    console.log('  Commitment:', commitment)
    console.log('  Borrow Token:', borrowToken)
    console.log('  Borrow Amount:', borrowAmount)

    // Step 1: Validate parameters
    console.log('\n📋 Step 1: Parameter Validation')

    if (!commitment || typeof commitment !== 'string' || !commitment.startsWith('0x') || commitment.length !== 66) {
        console.error('❌ Invalid commitment format:', commitment)
        return false
    }
    console.log('✅ Commitment format valid')

    if (!borrowToken || typeof borrowToken !== 'string') {
        console.error('❌ Invalid borrow token:', borrowToken)
        return false
    }
    console.log('✅ Borrow token valid')

    if (!borrowAmount || borrowAmount <= 0) {
        console.error('❌ Invalid borrow amount:', borrowAmount)
        return false
    }
    console.log('✅ Borrow amount valid')

    // Step 2: Check contract manager
    console.log('\n🔗 Step 2: Contract Manager Status')

    try {
        // Import the debug function (if available)
        if (typeof window !== 'undefined' && window.debugContractStatus) {
            window.debugContractStatus()
        } else {
            console.warn('⚠️ Debug function not available. Checking manually...')
        }
    } catch (e) {
        console.warn('⚠️ Could not run debug function:', e)
    }

    // Step 3: Check wallet connection
    console.log('\n👛 Step 3: Wallet Connection')

    if (typeof window !== 'undefined' && window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' })
            if (accounts.length > 0) {
                console.log('✅ Wallet connected:', accounts[0])
            } else {
                console.error('❌ No wallet accounts found')
                return false
            }
        } catch (e) {
            console.error('❌ Failed to check wallet:', e)
            return false
        }
    } else {
        console.error('❌ Ethereum provider not found')
        return false
    }

    // Step 4: Check network
    console.log('\n🌐 Step 4: Network Check')

    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        const chainIdNum = parseInt(chainId, 16)
        console.log('Current chain ID:', chainIdNum)

        if (chainIdNum !== 11155111) {
            console.error('❌ Wrong network. Expected Sepolia (11155111), got', chainIdNum)
            console.log('💡 Please switch to Sepolia testnet')
            return false
        }
        console.log('✅ Connected to Sepolia testnet')
    } catch (e) {
        console.error('❌ Failed to check network:', e)
        return false
    }

    // Step 5: Check token configuration
    console.log('\n🪙 Step 5: Token Configuration')

    // This would need access to the contract configuration
    if (borrowToken === 'ETH') {
        console.log('✅ ETH is supported')
    } else {
        console.warn('⚠️ Only ETH is currently supported for borrowing')
        console.log('💡 Try borrowing ETH instead')
        return false
    }

    console.log('\n🎯 Step 6: Common Issues and Solutions')
    console.log('If borrow still fails, check:')
    console.log('1. 📝 Commitment exists and has sufficient collateral value')
    console.log('2. 🔒 Commitment is not already locked/used for borrowing')
    console.log('3. 💰 Sufficient collateral ratio (usually 150% minimum)')
    console.log('4. ⛽ Sufficient ETH for gas fees')
    console.log('5. 🔗 All contracts are properly deployed on Sepolia')

    console.log('\n✅ Basic validation passed. Try borrowing again.')
    return true
}

// Quick test function
async function quickBorrowTest() {
    console.log('🚀 Quick Borrow Test')

    // Test with sample values
    const sampleCommitment = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const sampleToken = 'ETH'
    const sampleAmount = 0.1

    console.log('Testing with sample values...')
    await troubleshootBorrow(sampleCommitment, sampleToken, sampleAmount)
}

// Make functions available globally
window.troubleshootBorrow = troubleshootBorrow
window.quickBorrowTest = quickBorrowTest

console.log('\n📋 Available Functions:')
console.log('• troubleshootBorrow(commitment, borrowToken, borrowAmount)')
console.log('• quickBorrowTest()')
console.log('\n💡 Example usage:')
console.log('troubleshootBorrow("0x123...", "ETH", 0.1)')
console.log('quickBorrowTest()')
