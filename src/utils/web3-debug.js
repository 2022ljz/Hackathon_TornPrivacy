// Web3 调试工具
import { ethers } from 'ethers'

export function debugWeb3Environment() {
    const debug = {
        hasEthereum: !!window.ethereum,
        hasEthers: !!ethers,
        userAgent: navigator.userAgent,
        isMetaMask: window.ethereum?.isMetaMask,
        providers: []
    }

    // 检查可用的提供者
    if (window.ethereum) {
        debug.providers.push({
            name: 'ethereum',
            isMetaMask: window.ethereum.isMetaMask,
            chainId: window.ethereum.chainId,
            selectedAddress: window.ethereum.selectedAddress
        })
    }

    if (window.web3) {
        debug.providers.push({
            name: 'web3',
            currentProvider: !!window.web3.currentProvider
        })
    }

    return debug
}

export function logConnectionAttempt(step, data = null, error = null) {
    const timestamp = new Date().toISOString()
    console.group(`🔗 [${timestamp}] 钱包连接步骤: ${step}`)

    if (data) {
        console.log('数据:', data)
    }

    if (error) {
        console.error('错误:', error)
        console.error('错误堆栈:', error.stack)
    }

    console.groupEnd()
}

export function validateEthereumProvider(ethereum) {
    const checks = {
        exists: !!ethereum,
        isFunction: typeof ethereum.request === 'function',
        hasOn: typeof ethereum.on === 'function',
        hasRemoveListener: typeof ethereum.removeListener === 'function',
        hasChainId: 'chainId' in ethereum,
        hasSelectedAddress: 'selectedAddress' in ethereum
    }

    const issues = Object.entries(checks)
        .filter(([key, value]) => !value)
        .map(([key]) => key)

    return {
        isValid: issues.length === 0,
        issues,
        checks
    }
}
