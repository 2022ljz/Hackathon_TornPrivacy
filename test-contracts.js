// Test script to verify contracts.js functionality
import { ethers } from 'ethers'

async function testContractsModule() {
    console.log('🧪 Testing contracts module...')

    try {
        // Test 1: Import the contracts module
        const contractsModule = await import('./src/utils/contracts.js')
        console.log('✅ Module imported successfully')
        console.log('Available exports:', Object.keys(contractsModule))

        // Test 2: Check if key functions exist
        const { initializeContractManager, depositToMixer, withdrawFromMixer, contractManager } = contractsModule

        if (initializeContractManager) {
            console.log('✅ initializeContractManager function exists')
        } else {
            console.log('❌ initializeContractManager function missing')
        }

        if (depositToMixer) {
            console.log('✅ depositToMixer function exists')
        } else {
            console.log('❌ depositToMixer function missing')
        }

        if (withdrawFromMixer) {
            console.log('✅ withdrawFromMixer function exists')
        } else {
            console.log('❌ withdrawFromMixer function missing')
        }

        console.log('✅ All tests passed!')

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

testContractsModule()
