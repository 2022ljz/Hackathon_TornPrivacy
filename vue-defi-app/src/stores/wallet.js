import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import { createSafeWeb3Provider, createProviderWithFallback, safeGetNetwork } from '@/utils/helpers'
import { debugWeb3Environment, logConnectionAttempt, validateEthereumProvider } from '@/utils/web3-debug'

export const useWalletStore = defineStore('wallet', () => {
    // State
    const provider = ref(null)
    const signer = ref(null)
    const address = ref(null)
    const chainId = ref(null)
    const isConnected = ref(false)
    const isConnecting = ref(false)

    // Config
    const config = ref({
        baseAPR: 4.0,
        borrowAPR: 8.0,  // 添加借款利率
        ltv: 0.5,
        lendingAddr: "",
        mixerAddr: "",
        tokens: [
            { sym: "ETH", addr: "eth", decimals: 18, price: 3500 },
            { sym: "DAI", addr: "", decimals: 18, price: 1 },
            { sym: "USDC", addr: "", decimals: 6, price: 1 },
            { sym: "WBTC", addr: "", decimals: 8, price: 65000 },
        ],
    })

    // Local data for demo
    const localData = ref({
        lends: {},
        stakes: {},
        borrows: {},
        notes: {},
        stakeNotes: {},  // 新增stake notes存储
        balance: {
            ETH: 1000,
            DAI: 1000,
            USDC: 1000,
            WBTC: 1000
        }
    })

    // ABIs
    const abis = {
        erc20: [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function approve(address,uint256) returns (bool)",
            "function allowance(address,address) view returns(uint256)",
            "function transfer(address,uint256) returns (bool)"
        ],
        mixer: [
            "function lend(address token,uint256 amount,uint256 lockDays) payable",
            "function withdraw(address token,uint256 amount)"
        ],
        lending: [
            "function stake(address token,uint256 amount)",
            "function unstake(address token,uint256 amount)",
            "function borrow(address token,uint256 amount,address to)"
        ]
    }

    // Getters
    const shortAddress = computed(() => {
        if (!address.value) return ""
        return address.value.slice(0, 6) + "…" + address.value.slice(-4)
    })

    const networkName = computed(() => {
        const networks = {
            1: "Ethereum",
            3: "Ropsten",
            4: "Rinkeby",
            5: "Goerli",
            42: "Kovan",
            137: "Polygon",
            80001: "Mumbai"
        }
        return networks[chainId.value] || `Chain ${chainId.value}`
    })

    // Actions
    async function connectWallet() {
        // 防止重复连接请求
        if (isConnecting.value) {
            console.warn('连接请求正在进行中，请稍候...')
            return
        }

        // Debug环境检查
        const debugInfo = debugWeb3Environment()
        logConnectionAttempt('环境检查', debugInfo)

        if (!window.ethereum) {
            logConnectionAttempt('未检测到钱包', null, new Error('No ethereum provider'))
            throw new Error("未检测到钱包。请安装 MetaMask。")
        }

        // 验证 ethereum 提供者
        const validation = validateEthereumProvider(window.ethereum)
        logConnectionAttempt('提供者验证', validation)

        if (!validation.isValid) {
            throw new Error(`钱包提供者验证失败: ${validation.issues.join(', ')}`)
        }

        isConnecting.value = true

        try {
            logConnectionAttempt('请求账户权限')
            // Request accounts first with timeout
            const accounts = await Promise.race([
                window.ethereum.request({
                    method: 'eth_requestAccounts'
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('连接请求超时，请重试')), 30000)
                )
            ])

            logConnectionAttempt('账户权限获取成功', { accountsCount: accounts.length })

            if (accounts.length === 0) {
                throw new Error("未授权钱包访问")
            }

            logConnectionAttempt('创建 Web3 提供者')
            // Try to create provider with fallback strategies
            try {
                provider.value = await createProviderWithFallback(window.ethereum)
                logConnectionAttempt('提供者创建成功 (降级策略)')
            } catch (providerError) {
                logConnectionAttempt('降级策略失败，尝试基础方法', null, providerError)
                provider.value = createSafeWeb3Provider(window.ethereum)
                logConnectionAttempt('提供者创建成功 (基础方法)')
            }

            logConnectionAttempt('获取签名者和地址')
            signer.value = provider.value.getSigner()
            address.value = await signer.value.getAddress()
            logConnectionAttempt('地址获取成功', { address: address.value })

            logConnectionAttempt('获取网络信息')
            // Get network info with safe method
            const network = await safeGetNetwork(provider.value)
            chainId.value = Number(network.chainId)
            logConnectionAttempt('网络信息获取成功', { chainId: chainId.value, networkName: network.name })

            isConnected.value = true

            // Setup event listeners
            window.ethereum.on('accountsChanged', handleAccountsChanged)
            window.ethereum.on('chainChanged', handleChainChanged)

            logConnectionAttempt('钱包连接完成', {
                address: address.value,
                chainId: chainId.value,
                isConnected: isConnected.value
            })

        } catch (error) {
            logConnectionAttempt('钱包连接失败', null, error)
            console.error('Failed to connect wallet:', error)

            // Handle specific MetaMask errors
            if (error.code === -32002) {
                throw new Error('连接请求正在处理中。请检查 MetaMask 弹窗，或稍后重试。\n\n💡 提示：如果没有看到弹窗，请点击浏览器右上角的 MetaMask 图标。')
            }

            if (error.code === 4001) {
                throw new Error('用户拒绝了连接请求。请重新尝试连接。')
            }

            // Provide more user-friendly error message
            if (error.message.includes('proxy') || error.message.includes('_network')) {
                throw new Error('钱包连接出现兼容性问题。请尝试：\n1. 刷新页面\n2. 重启浏览器\n3. 更新 MetaMask\n\n详细错误: ' + error.message)
            }

            throw error
        } finally {
            // 延迟重置连接状态，避免快速重复点击
            setTimeout(() => {
                isConnecting.value = false
            }, 1000)
        }
    }

    function disconnectWallet() {
        provider.value = null
        signer.value = null
        address.value = null
        chainId.value = null
        isConnected.value = false

        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
            window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
    }

    async function handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            disconnectWallet()
        } else {
            address.value = accounts[0]
        }
    }

    async function handleChainChanged(chainIdHex) {
        try {
            chainId.value = parseInt(chainIdHex, 16)
            // Recreate provider for new network using safe method
            if (provider.value && window.ethereum) {
                provider.value = createSafeWeb3Provider(window.ethereum)
                signer.value = provider.value.getSigner()
            }
        } catch (error) {
            console.error('Error handling chain change:', error)
        }
    }

    async function getTokenContract(symbol) {
        const token = config.value.tokens.find(t => t.sym === symbol)
        if (!token || !token.addr || token.addr.toLowerCase() === "eth") return null
        if (!signer.value) return null
        return new ethers.Contract(token.addr, abis.erc20, signer.value)
    }

    async function getBalance(symbol) {
        if (!provider.value || !address.value) return 0

        const token = config.value.tokens.find(t => t.sym === symbol)
        if (!token) return 0

        try {
            let walletBalance = 0

            if (token.addr === "eth" || !token.addr) {
                const balance = await provider.value.getBalance(address.value)
                walletBalance = Number(ethers.utils.formatUnits(balance, 18))
            } else {
                const contract = await getTokenContract(symbol)
                if (!contract) return 0
                const balance = await contract.balanceOf(address.value)
                walletBalance = Number(ethers.utils.formatUnits(balance, token.decimals))
            }

            // 添加借款余额（如果有的话）
            const borrowedAmount = localData.value.borrows[symbol] || 0

            return walletBalance + borrowedAmount
        } catch (error) {
            console.error(`Error getting balance for ${symbol}:`, error)
            return 0
        }
    }

    function loadPersistedData() {
        try {
            const savedConfig = localStorage.getItem("mixer-config")
            if (savedConfig) {
                Object.assign(config.value, JSON.parse(savedConfig))
            }

            const savedLocal = localStorage.getItem("mixer-local")
            if (savedLocal) {
                const parsed = JSON.parse(savedLocal)
                // 确保 notes 字段存在
                if (!parsed.notes) {
                    parsed.notes = {}
                }
                // 确保 balance 字段存在并初始化
                if (!parsed.balance) {
                    parsed.balance = {
                        ETH: 1000,
                        DAI: 1000,
                        USDC: 1000,
                        WBTC: 1000
                    }
                }
                Object.assign(localData.value, parsed)
                console.log('📂 Loaded persisted data:', localData.value)
            } else {
                // 如果没有保存的数据，初始化balance
                localData.value.balance = {
                    ETH: 1000,
                    DAI: 1000,
                    USDC: 1000,
                    WBTC: 1000
                }
            }
        } catch (error) {
            console.error("Failed to load persisted data:", error)
            // 出错时也要初始化balance
            localData.value.balance = {
                ETH: 1000,
                DAI: 1000,
                USDC: 1000,
                WBTC: 1000
            }
        }
    }

    // 初始化时加载数据
    loadPersistedData()

    function persistData() {
        try {
            localStorage.setItem("mixer-config", JSON.stringify(config.value))
            localStorage.setItem("mixer-local", JSON.stringify(localData.value))
        } catch (error) {
            console.error("Failed to persist data:", error)
        }
    }

    function clearAllData() {
        try {
            // 清空 localStorage 中的所有数据
            localStorage.removeItem("mixer-config")
            localStorage.removeItem("mixer-local")

            // 重置 localData 到初始状态
            localData.value = {
                lends: {},
                stakes: {},
                borrows: {},
                notes: {},
                stakeNotes: {},
                balance: {
                    ETH: 1000,
                    DAI: 1000,
                    USDC: 1000,
                    WBTC: 1000
                }
            }

            // 重置配置到默认值
            config.value = {
                baseAPR: 4.0,
                borrowAPR: 8.0,
                ltv: 0.5,
                lendingAddr: "",
                mixerAddr: "",
                tokens: [
                    { sym: "ETH", addr: "eth", decimals: 18, price: 3500 },
                    { sym: "DAI", addr: "", decimals: 18, price: 1 },
                    { sym: "USDC", addr: "", decimals: 6, price: 1 },
                    { sym: "WBTC", addr: "", decimals: 8, price: 65000 },
                ],
            }

            console.log("✅ All cache data cleared successfully")
            return true
        } catch (error) {
            console.error("❌ Failed to clear cache data:", error)
            return false
        }
    }

    // Local balance management functions
    function getLocalBalance(token) {
        if (!localData.value.balance) {
            // 初始化balance对象如果不存在
            localData.value.balance = {
                ETH: 1000,
                DAI: 1000,
                USDC: 1000,
                WBTC: 1000
            }
        }
        return localData.value.balance[token] || 0
    }

    function updateBalance(token, amount, operation = 'set') {
        if (!localData.value.balance) {
            localData.value.balance = {
                ETH: 1000,
                DAI: 1000,
                USDC: 1000,
                WBTC: 1000
            }
        }

        const currentBalance = localData.value.balance[token] || 0

        switch (operation) {
            case 'add':
                localData.value.balance[token] = currentBalance + amount
                break
            case 'subtract':
                localData.value.balance[token] = Math.max(0, currentBalance - amount)
                break
            case 'set':
            default:
                localData.value.balance[token] = amount
                break
        }

        // 持久化数据
        persistData()

        console.log(`💰 Balance updated: ${token} ${operation} ${amount}, new balance: ${localData.value.balance[token]}`)
    }

    // Balance operations for DeFi actions
    function handleLendOperation(token, amount) {
        // Lend: 减少可用余额（钱被放出借贷）
        updateBalance(token, amount, 'subtract')
    }

    function handleWithdrawOperation(token, amount) {
        // Withdraw: 增加可用余额（从借贷中取回钱）
        updateBalance(token, amount, 'add')
    }

    function handleStakeOperation(token, amount) {
        // Stake: 减少可用余额（钱被抵押）
        updateBalance(token, amount, 'subtract')
    }

    function handleBorrowOperation(borrowToken, borrowAmount) {
        // Borrow: 增加借来的代币余额
        updateBalance(borrowToken, borrowAmount, 'add')
    }

    function handleUnstakeOperation(token, amount, borrowToken, borrowAmount) {
        // Unstake: 增加抵押代币余额，减少借来的代币余额
        updateBalance(token, amount, 'add')
        if (borrowToken && borrowAmount > 0) {
            updateBalance(borrowToken, borrowAmount, 'subtract')
        }
    }

    return {
        // State
        provider,
        signer,
        address,
        chainId,
        isConnected,
        isConnecting,
        config,
        localData,
        abis,

        // Getters
        shortAddress,
        networkName,

        // Actions
        connectWallet,
        disconnectWallet,
        getTokenContract,
        getBalance,
        loadPersistedData,
        persistData,
        clearAllData,

        // Balance management
        getLocalBalance,
        updateBalance,
        handleLendOperation,
        handleWithdrawOperation,
        handleStakeOperation,
        handleBorrowOperation,
        handleUnstakeOperation
    }
})
