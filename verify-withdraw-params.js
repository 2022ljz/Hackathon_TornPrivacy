// Withdraw Parameter Verification Script
// Copy and paste this into the browser console to test your withdrawal parameters

function verifyWithdrawParams(nullifier, secret, toAddress) {
    console.log('🔍 Verifying withdrawal parameters...')

    // Check nullifier
    if (!nullifier || typeof nullifier !== 'string') {
        console.error('❌ Nullifier is not a valid string:', nullifier)
        return false
    }

    if (!nullifier.startsWith('0x')) {
        console.error('❌ Nullifier does not start with 0x:', nullifier)
        return false
    }

    if (nullifier.length !== 66) {
        console.error(`❌ Nullifier has wrong length: ${nullifier.length}/66`, nullifier)
        return false
    }

    // Check if nullifier is valid hex
    const nullifierHex = nullifier.slice(2)
    if (!/^[0-9a-fA-F]+$/.test(nullifierHex)) {
        console.error('❌ Nullifier contains invalid hex characters:', nullifier)
        return false
    }

    // Check secret
    if (!secret || typeof secret !== 'string') {
        console.error('❌ Secret is not a valid string:', secret)
        return false
    }

    if (!secret.startsWith('0x')) {
        console.error('❌ Secret does not start with 0x:', secret)
        return false
    }

    if (secret.length !== 66) {
        console.error(`❌ Secret has wrong length: ${secret.length}/66`, secret)
        return false
    }

    // Check if secret is valid hex
    const secretHex = secret.slice(2)
    if (!/^[0-9a-fA-F]+$/.test(secretHex)) {
        console.error('❌ Secret contains invalid hex characters:', secret)
        return false
    }

    // Check address
    if (!toAddress || typeof toAddress !== 'string') {
        console.error('❌ Address is not a valid string:', toAddress)
        return false
    }

    if (!toAddress.startsWith('0x')) {
        console.error('❌ Address does not start with 0x:', toAddress)
        return false
    }

    if (toAddress.length !== 42) {
        console.error(`❌ Address has wrong length: ${toAddress.length}/42`, toAddress)
        return false
    }

    // Check if address is valid hex
    const addressHex = toAddress.slice(2)
    if (!/^[0-9a-fA-F]+$/.test(addressHex)) {
        console.error('❌ Address contains invalid hex characters:', toAddress)
        return false
    }

    console.log('✅ All parameters are valid!')
    console.log('   Nullifier:', nullifier)
    console.log('   Secret:', secret)
    console.log('   To Address:', toAddress)

    // Calculate commitment
    try {
        // Note: This requires ethers to be available
        if (typeof ethers !== 'undefined') {
            const commitment = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [nullifier, secret])
            )
            console.log('🔍 Calculated commitment:', commitment)
        } else {
            console.log('ℹ️ Ethers not available, cannot calculate commitment')
        }
    } catch (err) {
        console.warn('⚠️ Could not calculate commitment:', err)
    }

    return true
}

console.log('📋 Withdraw Parameter Verification Script Loaded')
console.log('💡 Usage: verifyWithdrawParams(nullifier, secret, toAddress)')
console.log('📝 Example:')
console.log('   verifyWithdrawParams(')
console.log('     "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",')
console.log('     "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",')
console.log('     "0x742d35cc8c78c78e6b7a7e52f2e8f9a8b8e8c6c5"')
console.log('   )')
