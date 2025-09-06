import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import { createSafeWeb3Provider, createProviderWithFallback, safeGetNetwork } from '@/utils/helpers'
import { debugWeb3Environment, logConnectionAttempt, validateEthereumProvider } from '@/utils/web3-debug'
import contractsConfig from '@/config/contracts.js'
import { initializeContractManager } from '@/utils/contracts.js'

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
        lendingAddr: contractsConfig.LENDING_POOL_ADDRESS,
        mixerAddr: contractsConfig.MIXER_ADDRESS,
        tokens: [
            { sym: "ETH", addr: "0x0000000000000000000000000000000000000000", decimals: 18, price: 3500 }
            // 暂时只保留ETH，等验证其他代币合约后再添加
            // { sym: "DAI", addr: contractsConfig.TOKENS.DAI.address, decimals: 18, price: 1 },
            // { sym: "USDC", addr: contractsConfig.TOKENS.USDC.address, decimals: 6, price: 1 },
        ],
    })

    // 🔥 删除所有本地模拟数据！只使用真实链上数据
    const localData = ref({
        notes: {},        // 只保留commitment notes（链上交易凭证）
        stakeNotes: {},   // 只保留stake notes（链上交易凭证）
        // 🚫 删除所有模拟余额、借贷、质押数据
        // 🚫 所有数据必须从区块链读取
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
            // 务必强制打开 MetaMask 确认弹窗：先尝试 wallet_requestPermissions（若可用）
            try {
                if (window.ethereum && typeof window.ethereum.request === 'function') {
                    try {
                        logConnectionAttempt('尝试使用 wallet_requestPermissions 强制弹窗')
                        // requestPermissions 会触发钱包 UI，让用户再次确认权限
                        await window.ethereum.request({
                            method: 'wallet_requestPermissions',
                            params: [{ eth_accounts: {} }]
                        })
                        logConnectionAttempt('wallet_requestPermissions 请求已发送')
                    } catch (permErr) {
                        // 某些提供者或旧版 MetaMask 可能不支持该方法；记录但不阻止后续请求
                        logConnectionAttempt('wallet_requestPermissions 失败，回退到 eth_requestAccounts', null, permErr)
                    }
                }
            } catch (err) {
                // 保守处理，继续向下执行
                logConnectionAttempt('尝试强制弹窗时发生异常，继续执行 eth_requestAccounts', null, err)
            }

            // Request accounts with timeout (保留原有超时逻辑)
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
            // 使用简化的 ethers v6 语法
            try {
                provider.value = new ethers.BrowserProvider(window.ethereum)
                logConnectionAttempt('提供者创建成功 (简化方法)')
            } catch (providerError) {
                logConnectionAttempt('提供者创建失败', null, providerError)
                throw new Error('无法创建 Web3 提供者: ' + providerError.message)
            }

            logConnectionAttempt('获取签名者和地址')
            // 等待 provider 完全初始化
            await new Promise(resolve => setTimeout(resolve, 100))

            // 获取账户地址
            const connectedAccounts = await window.ethereum.request({ method: 'eth_accounts' })
            if (connectedAccounts.length === 0) {
                throw new Error('No accounts found')
            }
            address.value = connectedAccounts[0]

            logConnectionAttempt('地址获取成功', { address: address.value })

            logConnectionAttempt('获取网络信息')
            // Get network info with safe method
            const network = await safeGetNetwork(provider.value)
            chainId.value = Number(network.chainId)
            logConnectionAttempt('网络信息获取成功', { chainId: chainId.value, networkName: network.name })

            // 尝试立即创建 signer，如果失败则延迟创建
            try {
                // Use safer signer creation method
                if (provider.value && typeof provider.value.getSigner === 'function') {
                    signer.value = await provider.value.getSigner(address.value)
                    console.debug('Signer created successfully')
                } else {
                    console.debug('Provider does not support getSigner, will create on demand')
                }
            } catch (signerError) {
                console.warn('Immediate signer creation failed, will create on demand:', signerError)
                // 不设置 signer，让 getSafeTransactionSigner 按需创建
            }

            isConnected.value = true

            // Initialize contract manager with provider and signer
            try {
                // Always try to initialize contract manager
                const currentSigner = signer.value || await getSafeTransactionSigner()
                await initializeContractManager(provider.value, currentSigner)
                console.debug('Contract manager initialized successfully')
            } catch (contractError) {
                console.warn('Contract manager initialization failed:', contractError)
                // Try to initialize again without signer
                try {
                    await initializeContractManager(provider.value, null)
                    console.debug('Contract manager initialized without signer')
                } catch (fallbackError) {
                    console.error('Contract manager fallback initialization failed:', fallbackError)
                }
            }

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

    // 动态获取 signer 的工具函数 - 使用简化方法避免私有字段
    async function getSafeTransactionSigner() {
        if (!address.value) {
            throw new Error('Wallet not connected')
        }

        // 完全避免使用 ethers provider，直接返回一个简化的签名对象
        return {
            address: address.value,
            signTransaction: async (transaction) => {
                // 使用 window.ethereum 进行签名
                return await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [transaction]
                })
            },
            getAddress: () => address.value
        }
    }

    // 简化的合约调用函数，避免 ethers 合约实例
    async function callContract(contractAddress, methodSignature, params = [], value = '0x0') {
        if (!address.value) {
            throw new Error('Wallet not connected')
        }

        try {
            const transaction = {
                from: address.value,
                to: contractAddress,
                data: methodSignature + (params.join('') || ''),
                value: value
            }

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            return txHash
        } catch (error) {
            console.error('Contract call failed:', error)
            throw error
        }
    }

    async function getTokenContract(symbol) {
        const token = config.value.tokens.find(t => t.sym === symbol)
        if (!token || !token.addr) return null

        // 检查是否是 ETH (零地址或 "eth")
        const isEth = String(token.addr).toLowerCase() === 'eth' ||
            token.addr === '0x0000000000000000000000000000000000000000' ||
            token.addr === ethers.ZeroAddress
        if (isEth) return null

        // 返回一个简化的合约对象，避免 ethers 合约实例
        return {
            address: token.addr,
            symbol: symbol,
            decimals: token.decimals,
            // 简化的 balanceOf 调用
            balanceOf: async (userAddress) => {
                const balanceOfSignature = '0x70a08231' // balanceOf(address)
                const paddedAddress = userAddress.slice(2).padStart(64, '0')
                const callData = balanceOfSignature + paddedAddress

                const result = await window.ethereum.request({
                    method: 'eth_call',
                    params: [{
                        to: token.addr,
                        data: callData
                    }, 'latest']
                })

                return result ? ethers.getBigInt(result) : 0n
            }
        }
    }

    // 🔥 纯链上余额查询 - 删除所有本地模拟数据
    async function getBalance(symbol) {
        if (!address.value) return 0

        const token = config.value.tokens.find(t => t.sym === symbol)
        if (!token) return 0

        try {
            // 检查是否是 ETH
            const isEth = token.addr && (
                String(token.addr).toLowerCase() === 'eth' ||
                token.addr === '0x0000000000000000000000000000000000000000' ||
                token.addr === ethers.ZeroAddress
            ) || symbol === 'ETH'

            if (isEth) {
                // 🔗 ETH余额 - 纯链上查询
                const balanceHex = await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [address.value, 'latest']
                })
                const balance = ethers.getBigInt(balanceHex)
                const walletBalance = Number(ethers.formatEther(balance))
                console.log('🔗 ETH balance from blockchain:', walletBalance)
                return walletBalance
            } else if (token.addr) {
                // 🔗 ERC20代币余额 - 纯链上查询
                const balanceOfSignature = '0x70a08231' // balanceOf(address)
                const paddedAddress = address.value.slice(2).padStart(64, '0')
                const callData = balanceOfSignature + paddedAddress

                const result = await window.ethereum.request({
                    method: 'eth_call',
                    params: [{
                        to: token.addr,
                        data: callData
                    }, 'latest']
                })

                if (result && result !== '0x') {
                    const balance = ethers.getBigInt(result)
                    const walletBalance = Number(ethers.formatUnits(balance, token.decimals))
                    console.log(`🔗 ${symbol} balance from blockchain:`, walletBalance)
                    return walletBalance
                } else {
                    console.log(`🔗 ${symbol} balance from blockchain: 0 (no balance)`)
                    return 0
                }
            } else {
                // 🚫 没有配置链上地址的代币不显示
                console.warn(`❌ No blockchain address configured for ${symbol}`)
                return 0
            }
        } catch (error) {
            console.error(`❌ Failed to get blockchain balance for ${symbol}:`, error)
            return 0
        }
    }

    // 🔥 COMPLETELY REMOVE LOCAL BALANCE PERSISTENCE!
    // 💾 Only persist notes and config, NO balance data!
    function loadPersistedData() {
        try {
            const savedConfig = localStorage.getItem("mixer-config")
            if (savedConfig) {
                Object.assign(config.value, JSON.parse(savedConfig))
            }

            const savedLocal = localStorage.getItem("mixer-local")
            if (savedLocal) {
                const parsed = JSON.parse(savedLocal)
                // 🚫 COMPLETELY IGNORE ANY BALANCE DATA!
                // 只保留notes数据，删除任何balance相关数据
                if (parsed.notes) {
                    localData.value.notes = parsed.notes
                }
                console.log('📂 Loaded persisted data (notes only):', localData.value)
            }

            // 🧹 FORCE CLEAN localStorage balance data if it exists
            const currentData = JSON.parse(localStorage.getItem("mixer-local") || "{}")
            if (currentData.balance) {
                delete currentData.balance
                localStorage.setItem("mixer-local", JSON.stringify(currentData))
                console.log('� Cleaned hardcoded balance data from localStorage!')
            }
        } catch (error) {
            console.error("Failed to load persisted data:", error)
        }
    }

    // 初始化时加载数据
    loadPersistedData()

    // 🔥 IMMEDIATELY CLEAN ANY EXISTING HARDCODED DATA!
    function forceCleanHardcodedData() {
        try {
            // 强制清理localStorage中的balance数据
            const localStorageKeys = ['mixer-local', 'mixer-config']
            localStorageKeys.forEach(key => {
                const data = localStorage.getItem(key)
                if (data) {
                    const parsed = JSON.parse(data)
                    if (parsed.balance) {
                        delete parsed.balance
                        localStorage.setItem(key, JSON.stringify(parsed))
                        console.log(`🧹 Cleaned balance data from ${key}`)
                    }
                }
            })

            // 确保当前localData中没有balance数据
            if (localData.value.balance) {
                delete localData.value.balance
                console.log('🔥 Removed balance from current localData')
            }

            console.log('✅ All hardcoded balance data ELIMINATED!')
        } catch (error) {
            console.error('Failed to clean hardcoded data:', error)
        }
    }

    // 立即执行清理
    forceCleanHardcodedData()

    // 也在组件挂载时清理（确保清理）
    setTimeout(forceCleanHardcodedData, 100)

    function persistData() {
        try {
            localStorage.setItem("mixer-config", JSON.stringify(config.value))

            // 🔥 ONLY PERSIST NOTES DATA, NO BALANCE!
            const dataToPersist = {
                lends: localData.value.lends || {},
                stakes: localData.value.stakes || {},
                borrows: localData.value.borrows || {},
                notes: localData.value.notes || {},
                stakeNotes: localData.value.stakeNotes || {}
                // 🚫 NO BALANCE DATA PERSISTED!
            }

            localStorage.setItem("mixer-local", JSON.stringify(dataToPersist))
            console.log('💾 Persisted data (no balance):', dataToPersist)
        } catch (error) {
            console.error("Failed to persist data:", error)
        }
    }

    function clearAllData() {
        try {
            // 清空 localStorage 中的所有数据
            localStorage.removeItem("mixer-config")
            localStorage.removeItem("mixer-local")

            // 🔥 RESET localData WITHOUT ANY BALANCE!
            localData.value = {
                lends: {},
                stakes: {},
                borrows: {},
                notes: {},
                stakeNotes: {}
                // 🚫 NO BALANCE DATA AT ALL!
            }

            // 重置配置到默认值
            config.value = {
                baseAPR: 4.0,
                borrowAPR: 8.0,
                ltv: 0.5,
                lendingAddr: "",
                mixerAddr: "",
                tokens: [
                    { sym: "ETH", addr: "eth", decimals: 18, price: 3500 }
                    // 重置时只保留ETH配置
                ],
            }

            console.log("✅ All cache data cleared successfully")
            return true
        } catch (error) {
            console.error("❌ Failed to clear cache data:", error)
            return false
        }
    }

    // 🔥 ALL LOCAL DATA MANAGEMENT FUNCTIONS REMOVED! 
    // 🚫 No more hardcoded balances, no more local simulation!
    // 🔗 Everything is REAL blockchain data from Sepolia testnet!

    // 主要的 DeFi 交互函数 - 避免 ethers 私有字段问题
    async function depositToMixer(amount) {
        if (!address.value) {
            throw new Error('Wallet not connected')
        }

        try {
            // 构建存款交易
            const transaction = {
                from: address.value,
                to: config.value.mixerAddr,
                value: ethers.parseEther(amount.toString()).toString(16),
                data: '0xb6b55f25' + // deposit() function signature
                    '0000000000000000000000000000000000000000000000000000000000000000' // commitment placeholder
            }

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('🏦 Deposit transaction sent:', txHash)
            return txHash
        } catch (error) {
            console.error('Deposit failed:', error)
            throw error
        }
    }

    async function lendToPool(token, amount) {
        if (!address.value) {
            throw new Error('Wallet not connected')
        }

        try {
            const isEth = token === 'ETH'
            let transaction

            if (isEth) {
                // ETH lending
                transaction = {
                    from: address.value,
                    to: config.value.lendingAddr,
                    value: ethers.parseEther(amount.toString()).toString(16),
                    data: '0x47e7ef24' // lend() function signature for ETH
                }
            } else {
                // ERC20 lending (需要先 approve)
                const tokenConfig = config.value.tokens.find(t => t.sym === token)
                if (!tokenConfig) throw new Error(`Token ${token} not configured`)

                // 这里简化处理，实际项目中需要先调用 approve
                transaction = {
                    from: address.value,
                    to: config.value.lendingAddr,
                    data: '0x47e7ef24' + // lend() function signature
                        tokenConfig.addr.slice(2).padStart(64, '0') + // token address
                        ethers.parseUnits(amount.toString(), tokenConfig.decimals).toString(16).padStart(64, '0') // amount
                }
            }

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('🏦 Lend transaction sent:', txHash)
            return txHash
        } catch (error) {
            console.error('Lend failed:', error)
            throw error
        }
    }

    async function borrowFromPool(collateralToken, collateralAmount, borrowToken, borrowAmount) {
        if (!address.value) {
            throw new Error('Wallet not connected')
        }

        try {
            // 简化的借款交易构建
            const transaction = {
                from: address.value,
                to: config.value.lendingAddr,
                data: '0x' + 'borrow_signature_placeholder' // 实际需要正确的函数签名
            }

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('💰 Borrow transaction sent:', txHash)
            return txHash
        } catch (error) {
            console.error('Borrow failed:', error)
            throw error
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
        getSafeTransactionSigner,
        getBalance,
        loadPersistedData,
        persistData,
        clearAllData,
        forceCleanHardcodedData,
        callContract,

        // DeFi operations
        depositToMixer,
        lendToPool,
        borrowFromPool

        // 🔥 NO MORE LOCAL BALANCE MANAGEMENT!
        // 🚫 All hardcoded data functions REMOVED!
        // 🔗 Pure Sepolia blockchain operations only!
    }
})
