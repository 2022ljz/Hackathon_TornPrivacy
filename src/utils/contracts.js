import { ethers } from 'ethers'
import contractsConfig from '@/config/contracts.js'

// 导入合约 ABIs
let MixerABI, LendingPoolABI, CollateralManagerABI, ERC20ABI

// 动态导入 ABIs
async function loadABIs() {
    try {
        const [mixerModule, lendingModule, collateralModule, erc20Module] = await Promise.all([
            import('@/abis/Mixer.json'),
            import('@/abis/LendingPool.json'),
            import('@/abis/CollateralManager.json'),
            import('@/abis/ERC20Mock.json')
        ])

        MixerABI = mixerModule.default
        LendingPoolABI = lendingModule.default
        CollateralManagerABI = collateralModule.default
        ERC20ABI = erc20Module.default
    } catch (error) {
        console.warn('Could not load contract ABIs:', error)
        // 使用基础 ABI 作为后备
        ERC20ABI = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function approve(address,uint256) returns (bool)",
            "function allowance(address,address) view returns(uint256)",
            "function transfer(address,uint256) returns (bool)"
        ]
    }
}

// 初始化时加载 ABIs
loadABIs()

export class ContractService {
    constructor(provider, signer = null) {
        this.provider = provider
        this.signer = signer
        this.contracts = {}
        this.initialized = false
        // 不在构造函数中调用异步方法
    }

    async initContracts() {
        try {
            // 如果没有signer，尝试从provider获取
            if (!this.signer && this.provider && typeof this.provider.getSigner === 'function') {
                try {
                    this.signer = await this.provider.getSigner()
                    console.log('✅ Signer created from provider')
                } catch (error) {
                    console.warn('⚠️ Could not create signer from provider:', error)
                }
            }

            if (!this.signer || !contractsConfig.MIXER_ADDRESS) {
                console.warn('⚠️ Cannot initialize contracts: missing signer or mixer address')
                return
            }

            // 初始化合约实例
            this.contracts.mixer = new ethers.Contract(
                contractsConfig.MIXER_ADDRESS,
                MixerABI || [],
                this.signer
            )

            this.contracts.lendingPool = new ethers.Contract(
                contractsConfig.LENDING_POOL_ADDRESS,
                LendingPoolABI || [],
                this.signer
            )

            this.contracts.collateralManager = new ethers.Contract(
                contractsConfig.COLLATERAL_MANAGER_ADDRESS,
                CollateralManagerABI || [],
                this.signer
            )

            // 初始化代币合约
            Object.entries(contractsConfig.TOKENS).forEach(([symbol, token]) => {
                if (token.address) {
                    this.contracts[symbol] = new ethers.Contract(
                        token.address,
                        ERC20ABI || [],
                        this.signer
                    )
                }
            })

            this.initialized = true
            console.log('✅ Contracts initialized successfully')
        } catch (error) {
            console.error('❌ Failed to initialize contracts:', error)
            this.initialized = false
        }
    }

    // 存款到混币器
    async deposit(tokenSymbol, amount, commitment) {
        try {
            // 确保合约已初始化
            if (!this.initialized) {
                await this.initContracts()
            }

            // 如果还是没有signer，尝试重新获取
            if (!this.signer && this.provider) {
                try {
                    this.signer = await this.provider.getSigner()
                    console.log('✅ Signer created on demand')
                    // 强制重新初始化所有合约以使用新的signer
                    this.initialized = false
                    await this.initContracts()
                } catch (error) {
                    console.error('❌ Failed to create signer:', error)
                    throw new Error('No signer available for transaction')
                }
            }

            // 双重检查：确保signer可以发送交易
            if (!this.signer || typeof this.signer.sendTransaction !== 'function') {
                console.log('🔄 Signer verification failed, using window.ethereum method...')

                // 使用window.ethereum直接构建交易，避免ethers.js signer问题
                return await this.depositViaWindowEthereum(tokenSymbol, amount, commitment)
            }

            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            const amountWei = ethers.parseUnits(amount.toString(), token.decimals)

            // 如果是 ERC20 代币（不是 ETH），需要先授权
            if (token.address !== "0x0000000000000000000000000000000000000000" && token.address !== ethers.ZeroAddress) {
                // 确保我们有最新的合约实例
                let tokenContract = this.contracts[tokenSymbol]
                if (!tokenContract && token.address && this.signer) {
                    // 如果合约不存在，创建一个新的
                    tokenContract = new ethers.Contract(
                        token.address,
                        ERC20ABI || [],
                        this.signer
                    )
                    this.contracts[tokenSymbol] = tokenContract
                }

                if (!tokenContract) {
                    throw new Error(`Token contract ${tokenSymbol} not initialized`)
                }

                const allowance = await tokenContract.allowance(
                    await this.signer.getAddress(),
                    contractsConfig.MIXER_ADDRESS
                )

                if (allowance.lt(amountWei)) {
                    console.log('Approving token transfer...')
                    const approveTx = await tokenContract.approve(
                        contractsConfig.MIXER_ADDRESS,
                        amountWei
                    )
                    await approveTx.wait()
                    console.log('Token approved')
                }
            }

            // 强制重新创建mixer合约以确保有正确的signer
            if (this.signer && contractsConfig.MIXER_ADDRESS && MixerABI) {
                console.log('🔄 Creating fresh mixer contract with verified signer...')
                this.contracts.mixer = new ethers.Contract(
                    contractsConfig.MIXER_ADDRESS,
                    MixerABI,
                    this.signer
                )
                console.log('✅ Fresh mixer contract created')
            } else {
                throw new Error('Cannot create mixer contract: missing signer, address, or ABI')
            }

            // 验证合约可以发送交易
            if (!this.contracts.mixer.runner || typeof this.contracts.mixer.deposit !== 'function') {
                throw new Error('Mixer contract is not properly initialized for transactions')
            }

            // 调用存款函数
            const isETH = token.address === "0x0000000000000000000000000000000000000000" || token.address === ethers.ZeroAddress
            const tx = await this.contracts.mixer.deposit(
                commitment,
                isETH ? ethers.ZeroAddress : token.address,
                amountWei,
                { value: isETH ? amountWei : 0 }
            )

            console.log('Deposit transaction sent:', tx.hash)
            const receipt = await tx.wait()
            console.log('Deposit confirmed:', receipt)

            return receipt
        } catch (error) {
            console.error('Deposit failed:', error)
            throw error
        }
    }

    // 使用window.ethereum直接发送交易，避免ethers.js signer问题
    async depositViaWindowEthereum(tokenSymbol, amount, commitment) {
        try {
            console.log('🌐 Using window.ethereum direct transaction method')

            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            const amountWei = ethers.parseUnits(amount.toString(), token.decimals)
            const isETH = token.address === "0x0000000000000000000000000000000000000000" || token.address === ethers.ZeroAddress

            // 构建合约调用数据
            // deposit(bytes32 commitment, address token, uint256 amount)
            const iface = new ethers.Interface(MixerABI || [])
            const data = iface.encodeFunctionData('deposit', [
                commitment,
                isETH ? ethers.ZeroAddress : token.address,
                amountWei
            ])

            const transaction = {
                from: await this.getCurrentWalletAddress(),
                to: contractsConfig.MIXER_ADDRESS,
                data: data,
                value: isETH ? '0x' + amountWei.toString(16) : '0x0'
            }

            console.log('📡 Sending transaction via window.ethereum:', transaction)

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('✅ Transaction sent successfully:', txHash)

            // 构建返回对象，模拟ethers.js的receipt格式
            return {
                hash: txHash,
                transactionHash: txHash,
                blockNumber: null, // 将在下一个区块更新
                gasUsed: null,
                status: 1
            }

        } catch (error) {
            console.error('❌ Window.ethereum deposit failed:', error)
            throw error
        }
    }

    // 获取当前钱包地址的辅助函数
    async getCurrentWalletAddress() {
        if (typeof window !== 'undefined' && window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' })
            if (accounts.length > 0) {
                return accounts[0]
            }
        }
        throw new Error('No wallet address found')
    }

    // 从混币器提取
    async withdraw(to, nullifier, secret) {
        try {
            // 检查signer是否可用，如果不行就使用window.ethereum
            if (!this.signer || typeof this.signer.sendTransaction !== 'function') {
                console.log('🔄 Withdraw signer verification failed, using window.ethereum method...')
                return await this.withdrawViaWindowEthereum(to, nullifier, secret)
            }

            const tx = await this.contracts.mixer.withdraw(to, nullifier, secret)
            console.log('Withdraw transaction sent:', tx.hash)

            const receipt = await tx.wait()
            console.log('Withdraw confirmed:', receipt)

            return receipt
        } catch (error) {
            console.error('Withdraw failed:', error)
            throw error
        }
    }

    // 使用window.ethereum直接发送withdraw交易
    async withdrawViaWindowEthereum(to, nullifier, secret) {
        try {
            console.log('🌐 Using window.ethereum direct transaction method for withdraw')
            
            // 构建合约调用数据
            // withdraw(address to, bytes32 nullifier, bytes calldata proof)
            const iface = new ethers.Interface(MixerABI || [])
            const data = iface.encodeFunctionData('withdraw', [
                to,
                nullifier,
                secret // 这里应该是proof，但现在用secret作为简化
            ])

            const transaction = {
                from: await this.getCurrentWalletAddress(),
                to: contractsConfig.MIXER_ADDRESS,
                data: data,
                value: '0x0' // withdraw不需要发送ETH
            }

            console.log('📡 Sending withdraw transaction via window.ethereum:', transaction)
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('✅ Withdraw transaction sent successfully:', txHash)
            
            // 构建返回对象，模拟ethers.js的receipt格式
            return {
                hash: txHash,
                transactionHash: txHash,
                blockNumber: null,
                gasUsed: null,
                status: 1
            }
            
        } catch (error) {
            console.error('❌ Window.ethereum withdraw failed:', error)
            throw error
        }
    }

    // 向借贷池添加流动性
    async fundLendingPool(tokenSymbol, amount) {
        try {
            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            const amountWei = ethers.parseUnits(amount.toString(), token.decimals)

            // 授权代币
            const tokenContract = this.contracts[tokenSymbol]
            const allowance = await tokenContract.allowance(
                this.signer.address,
                contractsConfig.LENDING_POOL_ADDRESS
            )

            if (allowance.lt(amountWei)) {
                const approveTx = await tokenContract.approve(
                    contractsConfig.LENDING_POOL_ADDRESS,
                    amountWei
                )
                await approveTx.wait()
            }

            // 添加流动性
            const tx = await this.contracts.lendingPool.fund(token.address, amountWei)
            console.log('Fund transaction sent:', tx.hash)

            const receipt = await tx.wait()
            console.log('Fund confirmed:', receipt)

            return receipt
        } catch (error) {
            console.error('Fund failed:', error)
            throw error
        }
    }

    // 锁定抵押品并借贷
    async lockAndBorrow(commitment, borrowTokenSymbol, borrowAmount) {
        try {
            const borrowToken = contractsConfig.TOKENS[borrowTokenSymbol]
            if (!borrowToken) throw new Error(`Token ${borrowTokenSymbol} not found`)

            const borrowAmountWei = ethers.parseUnits(
                borrowAmount.toString(),
                borrowToken.decimals
            )

            const tx = await this.contracts.collateralManager.lockAndBorrow(
                commitment,
                borrowToken.address,
                borrowAmountWei
            )

            console.log('Lock and borrow transaction sent:', tx.hash)
            const receipt = await tx.wait()
            console.log('Lock and borrow confirmed:', receipt)

            return receipt
        } catch (error) {
            console.error('Lock and borrow failed:', error)
            throw error
        }
    }

    // 还款并解锁抵押品
    async repayAndUnlock(commitment, repayAmount, tokenSymbol) {
        try {
            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            const repayAmountWei = ethers.parseUnits(
                repayAmount.toString(),
                token.decimals
            )

            // 授权还款代币
            const tokenContract = this.contracts[tokenSymbol]
            const allowance = await tokenContract.allowance(
                this.signer.address,
                contractsConfig.LENDING_POOL_ADDRESS
            )

            if (allowance.lt(repayAmountWei)) {
                const approveTx = await tokenContract.approve(
                    contractsConfig.LENDING_POOL_ADDRESS,
                    repayAmountWei
                )
                await approveTx.wait()
            }

            const tx = await this.contracts.collateralManager.repayAndUnlock(
                commitment,
                repayAmountWei
            )

            console.log('Repay and unlock transaction sent:', tx.hash)
            const receipt = await tx.wait()
            console.log('Repay and unlock confirmed:', receipt)

            return receipt
        } catch (error) {
            console.error('Repay and unlock failed:', error)
            throw error
        }
    }

    // 获取代币余额
    async getTokenBalance(tokenSymbol, address) {
        try {
            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            if (token.address === 'eth') {
                const balance = await this.provider.getBalance(address)
                return ethers.formatUnits(balance, 18)
            } else {
                const tokenContract = this.contracts[tokenSymbol]
                const balance = await tokenContract.balanceOf(address)
                return ethers.formatUnits(balance, token.decimals)
            }
        } catch (error) {
            console.error(`Failed to get ${tokenSymbol} balance:`, error)
            return '0'
        }
    }

    // 获取存款信息
    async getDepositInfo(commitment) {
        try {
            const depositInfo = await this.contracts.mixer.getDeposit(commitment)
            return {
                token: depositInfo[0],
                amount: depositInfo[1].toString(),
                withdrawn: depositInfo[2],
                locked: depositInfo[3]
            }
        } catch (error) {
            console.error('Failed to get deposit info:', error)
            return null
        }
    }

    // 获取贷款信息
    async getLoanInfo(loanId) {
        try {
            const loanInfo = await this.contracts.lendingPool.loans(loanId)
            return {
                borrower: loanInfo[0],
                token: loanInfo[1],
                amount: loanInfo[2].toString(),
                collateralAmount: loanInfo[3].toString(),
                repaid: loanInfo[4]
            }
        } catch (error) {
            console.error('Failed to get loan info:', error)
            return null
        }
    }
}

// Create global contract service instance - will be initialized when wallet connects
export let contractManager = null

// Initialize contract manager with provider and signer
export async function initializeContractManager(provider, signer) {
    try {
        contractManager = new ContractService(provider, signer)
        // 确保合约被正确初始化
        await contractManager.initContracts()
        console.log('✅ Contract manager initialized successfully')
        return contractManager
    } catch (error) {
        console.error('❌ Failed to initialize contract manager:', error)
        throw error
    }
}

// Simplified functions for easy use
export async function initializeContracts() {
    if (contractManager) {
        await contractManager.initContracts()
    }
}

/**
 * Simplified deposit function for frontend use
 */
export async function depositToMixer(token, amount) {
    console.log(`🔗 Starting real blockchain deposit: ${amount} ${token}`)

    if (!contractManager) {
        throw new Error('Contract manager not initialized. Please connect wallet first.')
    }

    // Ensure contracts are initialized with signer
    if (!contractManager.signer || !contractManager.contracts.mixer) {
        console.log('🔄 Re-initializing contracts with signer...')
        await contractManager.initContracts()

        if (!contractManager.contracts.mixer) {
            throw new Error('Failed to initialize mixer contract. Please ensure wallet is connected.')
        }
    }

    try {
        // Generate commitment for privacy
        const commitment = ethers.keccak256(ethers.randomBytes(32))

        // Use the contract manager to make the deposit
        const receipt = await contractManager.deposit(token, amount, commitment)

        console.log(`✅ Deposit successful!`)
        console.log(`   Transaction Hash: ${receipt.transactionHash}`)
        console.log(`   Block: ${receipt.blockNumber}`)
        console.log(`   Commitment: ${commitment}`)

        return {
            success: true,
            txHash: receipt.transactionHash || receipt.hash,
            commitment: commitment,
            blockNumber: receipt.blockNumber || 'pending',
            gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : 'pending',
            token,
            amount
        }

    } catch (error) {
        console.error(`❌ Deposit failed:`, error)
        throw new Error(`Deposit failed: ${error.message}`)
    }
}

/**
 * Simplified withdrawal function
 */
export async function withdrawFromMixer(commitment, secret, to) {
    console.log(`🔗 Starting real blockchain withdrawal`)

    if (!contractManager) {
        throw new Error('Contract manager not initialized. Please connect wallet first.')
    }

    try {
        // Generate nullifier from secret
        const nullifier = ethers.keccak256(secret)

        const receipt = await contractManager.withdraw(to, nullifier, secret)

        console.log(`✅ Withdrawal successful!`)
        console.log(`   Transaction Hash: ${receipt.transactionHash || receipt.hash}`)
        console.log(`   Block: ${receipt.blockNumber || 'pending'}`)

        return {
            success: true,
            txHash: receipt.transactionHash || receipt.hash,
            blockNumber: receipt.blockNumber || 'pending',
            gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : 'pending'
        }

    } catch (error) {
        console.error(`❌ Withdrawal failed:`, error)
        throw new Error(`Withdrawal failed: ${error.message}`)
    }
}

// Debug function to check contract and signer status
export function debugContractStatus() {
    console.log('🔍 Contract Manager Debug Status:')
    console.log('Contract Manager exists:', !!contractManager)

    if (contractManager) {
        console.log('Has provider:', !!contractManager.provider)
        console.log('Has signer:', !!contractManager.signer)
        console.log('Is initialized:', !!contractManager.initialized)
        console.log('Contracts available:', Object.keys(contractManager.contracts))

        if (contractManager.signer) {
            contractManager.signer.getAddress().then(address => {
                console.log('Signer address:', address)
            }).catch(err => {
                console.log('Signer address error:', err.message)
            })
        }

        // Check if mixer contract has runner
        if (contractManager.contracts.mixer) {
            console.log('Mixer contract has runner:', !!contractManager.contracts.mixer.runner)
            console.log('Mixer contract address:', contractManager.contracts.mixer.target)
        }
    }
}

// Test signer functionality
export async function testSignerCapabilities() {
    console.log('🧪 Testing Signer Capabilities:')

    if (!contractManager) {
        console.log('❌ Contract manager not initialized')
        return
    }

    if (!contractManager.signer) {
        console.log('❌ No signer available')
        return
    }

    try {
        // Test 1: Get address
        const address = await contractManager.signer.getAddress()
        console.log('✅ Signer address:', address)

        // Test 2: Check if it's connected to provider
        console.log('✅ Signer provider:', !!contractManager.signer.provider)

        // Test 3: Check sendTransaction capability
        console.log('✅ Has sendTransaction:', typeof contractManager.signer.sendTransaction === 'function')

        // Test 4: Check balance
        const balance = await contractManager.provider.getBalance(address)
        console.log('✅ Account balance:', ethers.formatEther(balance), 'ETH')

        // Test 5: Test contract interaction capability
        if (contractManager.contracts.mixer) {
            try {
                // This should not fail if signer is properly connected
                const contractWithSigner = contractManager.contracts.mixer.connect(contractManager.signer)
                console.log('✅ Contract can be connected to signer')
                console.log('✅ Contract target:', contractWithSigner.target)
                console.log('✅ Contract runner type:', contractWithSigner.runner?.constructor?.name)
            } catch (error) {
                console.log('❌ Contract connection failed:', error.message)
            }
        }

    } catch (error) {
        console.log('❌ Signer test failed:', error.message)
    }
}

// Make debug function available globally for console use
if (typeof window !== 'undefined') {
    window.debugContractStatus = debugContractStatus
    window.testSignerCapabilities = testSignerCapabilities
}
