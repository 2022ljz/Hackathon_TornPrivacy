import { ethers } from 'ethers'

// Formatting utilities
export function formatNumber(num, decimals = 4) {
    if (num === null || num === undefined || isNaN(num)) return "–"
    return Number(num).toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0
    })
}

export function formatCurrency(num, currency = 'USD', decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return "–"
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: decimals
    }).format(num)
}

export function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return "–"
    return Number(num).toFixed(decimals) + '%'
}

export function formatAddress(address, startLength = 6, endLength = 4) {
    if (!address) return ""
    if (address.length <= startLength + endLength) return address
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

// Time utilities
export function now() {
    return Math.floor(Date.now() / 1000)
}

export function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}

// Animation utilities
export function animateValue(start, end, duration, callback) {
    const startTime = performance.now()
    const change = end - start

    function updateValue(currentTime) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3)
        const currentValue = start + (change * eased)

        callback(currentValue)

        if (progress < 1) {
            requestAnimationFrame(updateValue)
        }
    }

    requestAnimationFrame(updateValue)
}

// Validation utilities
export function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function isValidAmount(amount, min = 0) {
    const num = Number(amount)
    return !isNaN(num) && num > min && isFinite(num)
}

// Color utilities
export function getStatusColor(status) {
    const colors = {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
        pending: 'text-orange-400'
    }
    return colors[status] || colors.info
}

export function getStatusBgColor(status) {
    const colors = {
        success: 'bg-green-500/10 border-green-500/20',
        error: 'bg-red-500/10 border-red-500/20',
        warning: 'bg-yellow-500/10 border-yellow-500/20',
        info: 'bg-blue-500/10 border-blue-500/20',
        pending: 'bg-orange-500/10 border-orange-500/20'
    }
    return colors[status] || colors.info
}

// Local storage utilities
export function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue
    } catch (error) {
        console.error(`Error reading from localStorage: ${key}`, error)
        return defaultValue
    }
}

export function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
    } catch (error) {
        console.error(`Error writing to localStorage: ${key}`, error)
        return false
    }
}

// Debounce utility
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Throttle utility
export function throttle(func, limit) {
    let inThrottle
    return function () {
        const args = arguments
        const context = this
        if (!inThrottle) {
            func.apply(context, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

// Web3 utilities
export function createSafeWeb3Provider(ethereum) {
    try {
        // ethers v6 syntax: use BrowserProvider instead of Web3Provider
        const provider = new ethers.BrowserProvider(ethereum)

        // Add a custom ready check
        provider._safeReady = async function () {
            try {
                await this.getNetwork()
                return true
            } catch (error) {
                console.warn('Provider ready check failed:', error)
                return false
            }
        }

        return provider
    } catch (error) {
        console.error('Failed to create BrowserProvider:', error)
        throw new Error('无法创建 Web3 提供者，请检查钱包连接')
    }
}

export async function createProviderWithFallback(ethereum) {
    const strategies = [
        // Strategy 1: Standard initialization
        () => new ethers.BrowserProvider(ethereum),

        // Strategy 2: With specific network
        () => new ethers.BrowserProvider(ethereum, "sepolia"),

        // Strategy 3: Basic provider
        () => {
            const provider = new ethers.BrowserProvider(ethereum)
            return provider
        }
    ]

    for (let i = 0; i < strategies.length; i++) {
        try {
            console.log(`Trying provider strategy ${i + 1}...`)
            const provider = strategies[i]()

            // Test the provider
            const signer = await provider.getSigner()
            const address = signer.address
            console.log(`Provider strategy ${i + 1} successful`)
            return provider

        } catch (error) {
            console.warn(`Provider strategy ${i + 1} failed:`, error)
            if (i === strategies.length - 1) {
                throw new Error('所有钱包连接策略都失败了，请尝试刷新页面')
            }
        }
    }
}

export async function safeGetNetwork(provider) {
    try {
        // 先尝试从 window.ethereum 直接获取链ID，避免私有字段访问
        if (window.ethereum) {
            const chainIdHex = await window.ethereum.request({
                method: 'eth_chainId'
            })
            const chainId = parseInt(chainIdHex, 16)

            // 返回简化的网络对象
            return {
                chainId,
                name: `Chain ${chainId}`
            }
        }

        // 如果 window.ethereum 不可用，尝试 provider.getNetwork()
        return await provider.getNetwork()
    } catch (error) {
        console.warn('Network detection failed, trying fallback:', error)

        // 最后的备用方案
        try {
            // 尝试通过 provider 的简化方法获取
            const network = await provider.detectNetwork()
            return network
        } catch (fallbackError) {
            console.error('All network detection methods failed:', fallbackError)
            // 返回默认网络 ID
            return {
                chainId: 11155111, // Sepolia default
                name: 'Chain 11155111'
            }
        }
    }
}
