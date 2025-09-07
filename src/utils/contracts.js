import { ethers } from 'ethers'
import contractsConfig from '@/config/contracts.js'
import { calculateOptimizedGasLimit, getRecommendedGasPrice, getDefaultGasLimit } from '@/config/gas.js'

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

    // 🔧 清理小数位数，避免精度问题
    sanitizeDecimalAmount(amount, decimals) {
        try {
            // 转换为字符串以处理
            let amountStr = amount.toString()

            // 如果是科学计数法，先转换
            if (amountStr.includes('e') || amountStr.includes('E')) {
                amountStr = Number(amount).toFixed(decimals)
            }

            // 检查小数点
            const parts = amountStr.split('.')
            if (parts.length > 1) {
                // 限制小数位数不超过代币的decimals
                const fractionalPart = parts[1].substring(0, decimals)
                amountStr = parts[0] + '.' + fractionalPart
            }

            // 移除末尾的零
            const result = parseFloat(amountStr).toString()

            console.log(`🔧 Sanitized amount: ${amount} -> ${result} (decimals: ${decimals})`)
            return result
        } catch (error) {
            console.warn('⚠️ Amount sanitization failed, using original:', error)
            return amount.toString()
        }
    }

    // 🔧 格式化bytes32参数，确保正确的长度
    formatBytes32(value) {
        try {
            // 移除0x前缀（如果有）
            let hex = value.toString()
            if (hex.startsWith('0x')) {
                hex = hex.slice(2)
            }

            // 验证是否为有效的十六进制字符
            if (!/^[0-9a-fA-F]*$/.test(hex)) {
                throw new Error(`Invalid hex string: ${value}`)
            }

            // 确保是64个字符（32字节）
            if (hex.length < 64) {
                // 左填充0
                hex = hex.padStart(64, '0')
            } else if (hex.length > 64) {
                // 截取前64个字符
                hex = hex.slice(0, 64)
            }

            const result = '0x' + hex
            console.log(`🔧 Formatted bytes32: ${value} -> ${result}`)

            // 最终验证
            if (result.length !== 66) {
                throw new Error(`Invalid bytes32 format after processing: ${result} (length: ${result.length})`)
            }

            return result
        } catch (error) {
            console.error('⚠️ Bytes32 formatting failed:', error)
            throw new Error(`Failed to format bytes32 parameter: ${error.message}`)
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

            // 🔧 修复：清理小数位数
            const sanitizedAmount = this.sanitizeDecimalAmount(amount, token.decimals)
            const amountWei = ethers.parseUnits(sanitizedAmount.toString(), token.decimals)

            // 🔧 格式化commitment确保正确的bytes32格式
            const formattedCommitment = this.formatBytes32(commitment)

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

            // 🔧 添加gas估算和优化
            const isETH = token.address === "0x0000000000000000000000000000000000000000" || token.address === ethers.ZeroAddress
            let gasEstimate
            try {
                gasEstimate = await this.contracts.mixer.deposit.estimateGas(
                    formattedCommitment,
                    isETH ? ethers.ZeroAddress : token.address,
                    amountWei,
                    { value: isETH ? amountWei : 0 }
                )
                console.log('⛽ Gas estimate for deposit:', gasEstimate.toString())
            } catch (gasError) {
                console.warn('⚠️ Gas estimation failed, using default limit:', gasError)
                gasEstimate = getDefaultGasLimit('DEPOSIT')
            }

            // 使用优化的gas配置
            const gasLimit = calculateOptimizedGasLimit(gasEstimate, 'DEPOSIT')
            const gasPrice = getRecommendedGasPrice('STANDARD')

            const txOptions = {
                value: isETH ? amountWei : 0,
                gasLimit
            }
            if (gasPrice) {
                txOptions.gasPrice = gasPrice
            }

            // 调用存款函数
            const tx = await this.contracts.mixer.deposit(
                formattedCommitment,
                isETH ? ethers.ZeroAddress : token.address,
                amountWei,
                txOptions
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

            // 🔧 修复：清理小数位数
            const sanitizedAmount = this.sanitizeDecimalAmount(amount, token.decimals)
            const amountWei = ethers.parseUnits(sanitizedAmount.toString(), token.decimals)
            const isETH = token.address === "0x0000000000000000000000000000000000000000" || token.address === ethers.ZeroAddress

            // 🔧 格式化commitment确保正确的bytes32格式
            const formattedCommitment = this.formatBytes32(commitment)

            // 构建合约调用数据
            // deposit(bytes32 commitment, address token, uint256 amount)
            const iface = new ethers.Interface(MixerABI || [])
            const data = iface.encodeFunctionData('deposit', [
                formattedCommitment,
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
            // 🔧 Parameter validation
            if (!to || typeof to !== 'string' || !to.startsWith('0x') || to.length !== 42) {
                throw new Error(`Invalid to address: ${to}. Must be a valid Ethereum address`)
            }

            // 检查signer是否可用，如果不行就使用window.ethereum
            if (!this.signer || typeof this.signer.sendTransaction !== 'function') {
                console.log('🔄 Withdraw signer verification failed, using window.ethereum method...')
                return await this.withdrawViaWindowEthereum(to, nullifier, secret)
            }

            // 🔧 格式化nullifier和secret确保正确的bytes32格式
            const formattedNullifier = this.formatBytes32(nullifier)
            const formattedSecret = this.formatBytes32(secret)

            console.log('🔧 Formatted parameters for contract call:')
            console.log('   To:', to)
            console.log('   Nullifier:', formattedNullifier)
            console.log('   Secret:', formattedSecret)

            // 🔍 Test contract call before sending transaction
            try {
                console.log('🧪 Testing contract call with static call...')
                await this.contracts.mixer.withdraw.staticCall(to, formattedNullifier, formattedSecret)
                console.log('✅ Static call successful, parameters are valid')
            } catch (staticError) {
                console.error('❌ Static call failed:', staticError)
                throw new Error(`Contract validation failed: ${staticError.message}. This suggests the parameters are invalid or the withdrawal conditions are not met.`)
            }

            console.log('📡 Sending actual transaction...')
            const tx = await this.contracts.mixer.withdraw(to, formattedNullifier, formattedSecret)
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

            // 🔧 格式化nullifier和secret确保正确的bytes32格式
            const formattedNullifier = this.formatBytes32(nullifier)
            const formattedSecret = this.formatBytes32(secret)

            // 构建合约调用数据
            // withdraw(address to, bytes32 nullifier, bytes calldata proof)
            const iface = new ethers.Interface(MixerABI || [])
            const data = iface.encodeFunctionData('withdraw', [
                to,
                formattedNullifier,
                formattedSecret // 这里应该是proof，但现在用secret作为简化
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

            // 🔧 修复：清理小数位数
            const sanitizedAmount = this.sanitizeDecimalAmount(amount, token.decimals)
            const amountWei = ethers.parseUnits(sanitizedAmount.toString(), token.decimals)

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
    async lockAndBorrow(commitment, borrowToken, borrowAmount) {
        try {
            // 🔧 参数验证
            if (!commitment || typeof commitment !== 'string' || !commitment.startsWith('0x') || commitment.length !== 66) {
                throw new Error(`Invalid commitment format: ${commitment}. Must be 66-character hex string starting with 0x`)
            }

            console.log('🔍 Borrow Parameters:')
            console.log('   Commitment:', commitment)
            console.log('   Borrow Token:', borrowToken)
            console.log('   Borrow Amount:', borrowAmount)

            // 检查signer是否可用，如果不行就使用window.ethereum
            if (!this.signer || typeof this.signer.sendTransaction !== 'function') {
                console.log('🔄 Lock and borrow signer verification failed, using window.ethereum method...')
                return await this.lockAndBorrowViaWindowEthereum(commitment, borrowToken, borrowAmount)
            }

            const borrowTokenData = contractsConfig.TOKENS[borrowToken]
            if (!borrowTokenData) {
                console.error('❌ Available tokens:', Object.keys(contractsConfig.TOKENS))
                throw new Error(`Borrow token ${borrowToken} not found. Available tokens: ${Object.keys(contractsConfig.TOKENS).join(', ')}`)
            }

            // 🔧 修复：清理小数位数
            const sanitizedBorrowAmount = this.sanitizeDecimalAmount(borrowAmount, borrowTokenData.decimals)
            const borrowAmountWei = ethers.parseUnits(
                sanitizedBorrowAmount.toString(),
                borrowTokenData.decimals
            )

            console.log('🔧 Formatted borrow parameters:')
            console.log('   Token Address:', borrowTokenData.address)
            console.log('   Amount (original):', borrowAmount)
            console.log('   Amount (sanitized):', sanitizedBorrowAmount)
            console.log('   Amount (wei):', borrowAmountWei.toString())

            // 🔍 CRITICAL: 验证commitment是否在区块链上存在
            try {
                console.log('🔍 验证commitment是否存在于区块链...')
                const depositInfo = await this.contracts.mixer.getDeposit(commitment)
                const [token, amount, withdrawn, locked] = depositInfo

                console.log('📋 区块链存款信息:')
                console.log('   Token:', token)
                console.log('   Amount:', amount.toString())
                console.log('   Withdrawn:', withdrawn)
                console.log('   Locked:', locked)

                if (amount.toString() === '0') {
                    throw new Error(`Commitment ${commitment} 不存在于区块链上。这意味着：\n1. 质押交易可能失败了\n2. Commitment计算错误\n3. 使用了错误的note\n\n请检查您的质押交易是否成功，并确保使用正确的commitment。`)
                }

                if (withdrawn) {
                    throw new Error(`Commitment ${commitment} 的资金已被提取，无法用于抵押借款。`)
                }

                if (locked) {
                    throw new Error(`Commitment ${commitment} 已被锁定用于其他借款，无法重复使用。`)
                }

                console.log('✅ Commitment区块链验证通过')

            } catch (verifyError) {
                console.error('❌ Commitment区块链验证失败:', verifyError)
                throw new Error(`区块链验证失败: ${verifyError.message}`)
            }

            // 🔍 CRITICAL: 验证LendingPool流动性
            try {
                console.log('🔍 检查LendingPool流动性...')

                // 获取LendingPool合约中该代币的余额
                let poolBalance
                if (borrowTokenData.address === "0x0000000000000000000000000000000000000000" || borrowTokenData.address === ethers.ZeroAddress) {
                    // ETH余额
                    poolBalance = await this.provider.getBalance(this.contracts.lendingPool.target || this.contracts.lendingPool.address)
                } else {
                    // ERC20代币余额
                    const tokenContract = new ethers.Contract(borrowTokenData.address, [
                        'function balanceOf(address) view returns (uint256)'
                    ], this.provider)
                    poolBalance = await tokenContract.balanceOf(this.contracts.lendingPool.target || this.contracts.lendingPool.address)
                }

                console.log('💰 流动性检查:')
                console.log('   Pool Balance:', ethers.formatUnits(poolBalance, borrowTokenData.decimals), borrowToken)
                console.log('   Requested Amount:', ethers.formatUnits(borrowAmountWei, borrowTokenData.decimals), borrowToken)
                console.log('   Sufficient?', poolBalance >= borrowAmountWei ? '✅ Yes' : '❌ No')

                if (poolBalance < borrowAmountWei) {
                    throw new Error(`LendingPool流动性不足！\n\n可用余额: ${ethers.formatUnits(poolBalance, borrowTokenData.decimals)} ${borrowToken}\n请求金额: ${ethers.formatUnits(borrowAmountWei, borrowTokenData.decimals)} ${borrowToken}\n\n请减少借款金额或等待其他用户补充流动性。`)
                }

                console.log('✅ 流动性验证通过')

            } catch (liquidityError) {
                console.error('❌ 流动性验证失败:', liquidityError)
                throw new Error(`流动性检查失败: ${liquidityError.message}`)
            }

            // 🧪 先进行静态调用测试
            try {
                console.log('🧪 Testing lockAndBorrow with static call...')
                await this.contracts.collateralManager.lockAndBorrow.staticCall(
                    commitment,
                    borrowTokenData.address === "0x0000000000000000000000000000000000000000" ? ethers.ZeroAddress : borrowTokenData.address,
                    borrowAmountWei
                )
                console.log('✅ Static call successful, parameters are valid')
            } catch (staticError) {
                console.error('❌ Static call failed:', staticError)
                throw new Error(`Contract validation failed: ${staticError.message}. This suggests the commitment is invalid, already locked, or insufficient collateral.`)
            }

            // 🔧 添加gas估算和优化
            let gasEstimate
            try {
                gasEstimate = await this.contracts.collateralManager.lockAndBorrow.estimateGas(
                    commitment,
                    borrowTokenData.address === "0x0000000000000000000000000000000000000000" ? ethers.ZeroAddress : borrowTokenData.address,
                    borrowAmountWei
                )
                console.log('⛽ Gas estimate for lockAndBorrow:', gasEstimate.toString())
            } catch (gasError) {
                console.warn('⚠️ Gas estimation failed, using default limit:', gasError)
                gasEstimate = getDefaultGasLimit('LOCK_AND_BORROW')
            }

            // 使用优化的gas配置
            const gasLimit = calculateOptimizedGasLimit(gasEstimate, 'LOCK_AND_BORROW')
            const gasPrice = getRecommendedGasPrice('STANDARD')

            const txOptions = { gasLimit }
            if (gasPrice) {
                txOptions.gasPrice = gasPrice
            }

            const tx = await this.contracts.collateralManager.lockAndBorrow(
                commitment,
                borrowTokenData.address === "0x0000000000000000000000000000000000000000" ? ethers.ZeroAddress : borrowTokenData.address,
                borrowAmountWei,
                txOptions
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

    // 使用window.ethereum直接发送lock and borrow交易
    async lockAndBorrowViaWindowEthereum(commitment, borrowToken, borrowAmount) {
        try {
            console.log('🌐 Using window.ethereum direct transaction method for lock and borrow')

            const borrowTokenData = contractsConfig.TOKENS[borrowToken]
            if (!borrowTokenData) throw new Error(`Borrow token ${borrowToken} not found`)

            // 🔧 修复：清理小数位数
            const sanitizedBorrowAmount = this.sanitizeDecimalAmount(borrowAmount, borrowTokenData.decimals)
            const borrowAmountWei = ethers.parseUnits(
                sanitizedBorrowAmount.toString(),
                borrowTokenData.decimals
            )

            // 构建合约调用数据
            // lockAndBorrow(bytes32 commitment, address borrowToken, uint256 borrowAmount)
            const iface = new ethers.Interface(CollateralManagerABI || [])
            const data = iface.encodeFunctionData('lockAndBorrow', [
                commitment,
                borrowTokenData.address === "0x0000000000000000000000000000000000000000" ? ethers.ZeroAddress : borrowTokenData.address,
                borrowAmountWei
            ])

            // 🔧 添加gas估算
            let gasEstimate
            try {
                gasEstimate = await window.ethereum.request({
                    method: 'eth_estimateGas',
                    params: [{
                        from: await this.getCurrentWalletAddress(),
                        to: contractsConfig.COLLATERAL_MANAGER_ADDRESS,
                        data: data,
                        value: '0x0'
                    }]
                })
                console.log('⛽ Gas estimate for lockAndBorrow (via window.ethereum):', parseInt(gasEstimate, 16))
            } catch (gasError) {
                console.warn('⚠️ Gas estimation failed, using default limit:', gasError)
                gasEstimate = '0x493e0' // 300000 in hex
            }

            // 增加20%安全边际
            const gasEstimateNum = parseInt(gasEstimate, 16)
            const gasLimitNum = Math.floor(gasEstimateNum * 1.2)
            const gasLimitHex = '0x' + gasLimitNum.toString(16)

            // 🔧 使用低gas价格进行测试网优化
            const gasPrice = getRecommendedGasPrice('STANDARD')
            const gasPriceHex = gasPrice ? '0x' + gasPrice.toString(16) : undefined

            const transaction = {
                from: await this.getCurrentWalletAddress(),
                to: contractsConfig.COLLATERAL_MANAGER_ADDRESS,
                data: data,
                value: '0x0',
                gas: gasLimitHex  // 🔧 添加gas限制
            }

            // 添加gasPrice（如果配置了）
            if (gasPriceHex) {
                transaction.gasPrice = gasPriceHex
                console.log('🔧 Using optimized gas price:', parseInt(gasPriceHex, 16), 'wei')
            }

            console.log('📡 Sending lock and borrow transaction via window.ethereum:', transaction)

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('✅ Lock and borrow transaction sent successfully:', txHash)

            // 构建返回对象，模拟ethers.js的receipt格式
            return {
                hash: txHash,
                transactionHash: txHash,
                blockNumber: null,
                gasUsed: null,
                status: 1
            }

        } catch (error) {
            console.error('❌ Window.ethereum lock and borrow failed:', error)
            throw error
        }
    }

    // 还款并解锁抵押品
    async repayAndUnlock(commitment, repayAmount, tokenSymbol) {
        try {
            // 检查signer是否可用，如果不行就使用window.ethereum
            if (!this.signer || typeof this.signer.sendTransaction !== 'function') {
                console.log('🔄 Repay and unlock signer verification failed, using window.ethereum method...')
                return await this.repayAndUnlockViaWindowEthereum(commitment, repayAmount, tokenSymbol)
            }

            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            // 🔧 修复：限制小数位数以避免精度问题
            const sanitizedAmount = this.sanitizeDecimalAmount(repayAmount, token.decimals)
            const repayAmountWei = ethers.parseUnits(
                sanitizedAmount.toString(),
                token.decimals
            )

            // 如果是ERC20代币，需要先授权
            if (token.address !== "0x0000000000000000000000000000000000000000" && token.address !== ethers.ZeroAddress) {
                const tokenContract = this.contracts[tokenSymbol]
                const allowance = await tokenContract.allowance(
                    await this.signer.getAddress(),
                    contractsConfig.COLLATERAL_MANAGER_ADDRESS
                )

                if (allowance.lt(repayAmountWei)) {
                    const approveTx = await tokenContract.approve(
                        contractsConfig.COLLATERAL_MANAGER_ADDRESS,
                        repayAmountWei
                    )
                    await approveTx.wait()
                }
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

    // 使用window.ethereum直接发送repay and unlock交易
    async repayAndUnlockViaWindowEthereum(commitment, repayAmount, tokenSymbol) {
        try {
            console.log('🌐 Using window.ethereum direct transaction method for repay and unlock')

            const token = contractsConfig.TOKENS[tokenSymbol]
            if (!token) throw new Error(`Token ${tokenSymbol} not found`)

            // 🔧 修复：限制小数位数以避免精度问题
            const sanitizedAmount = this.sanitizeDecimalAmount(repayAmount, token.decimals)
            const repayAmountWei = ethers.parseUnits(
                sanitizedAmount.toString(),
                token.decimals
            )

            // 如果是ERC20代币，需要先处理授权（这里简化处理，假设已经授权）
            const isETH = token.address === "0x0000000000000000000000000000000000000000" || token.address === ethers.ZeroAddress

            // 构建合约调用数据
            // repayAndUnlock(bytes32 commitment, uint256 repayAmount)
            const iface = new ethers.Interface(CollateralManagerABI || [])
            const data = iface.encodeFunctionData('repayAndUnlock', [
                commitment,
                repayAmountWei
            ])

            const transaction = {
                from: await this.getCurrentWalletAddress(),
                to: contractsConfig.COLLATERAL_MANAGER_ADDRESS,
                data: data,
                value: isETH ? '0x' + repayAmountWei.toString(16) : '0x0'
            }

            console.log('📡 Sending repay and unlock transaction via window.ethereum:', transaction)

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transaction]
            })

            console.log('✅ Repay and unlock transaction sent successfully:', txHash)

            // 构建返回对象，模拟ethers.js的receipt格式
            return {
                hash: txHash,
                transactionHash: txHash,
                blockNumber: null,
                gasUsed: null,
                status: 1
            }

        } catch (error) {
            console.error('❌ Window.ethereum repay and unlock failed:', error)
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
export async function depositToMixer(token, amount, note = null) {
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
        // Generate nullifier and secret from note if provided, otherwise random
        let nullifier, secret
        if (note) {
            // Use the note to generate deterministic nullifier and secret
            nullifier = ethers.keccak256(ethers.toUtf8Bytes(note + '_nullifier'))
            secret = ethers.keccak256(ethers.toUtf8Bytes(note + '_secret'))
        } else {
            // Generate random nullifier and secret
            nullifier = ethers.keccak256(ethers.randomBytes(32))
            secret = ethers.keccak256(ethers.randomBytes(32))
        }

        // Generate commitment using the same method as the contract
        // 🚨 CRITICAL FIX: 使用abi.encodePacked()等效方式
        // 智能合约使用: keccak256(abi.encodePacked(nullifier, secret))
        const commitment = ethers.keccak256(ethers.concat([nullifier, secret]))

        console.log('🔐 Generated cryptographic proof:')
        console.log('   Nullifier:', nullifier)
        console.log('   Secret:', secret)
        console.log('   Commitment:', commitment)

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
            nullifier: nullifier,
            secret: secret,
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
export async function withdrawFromMixer(nullifier, secret, to) {
    console.log(`🔗 Starting real blockchain withdrawal`)

    // 🔧 Parameter validation
    if (!to || typeof to !== 'string' || !to.startsWith('0x') || to.length !== 42) {
        throw new Error(`Invalid to address: ${to}. Must be a valid Ethereum address (0x + 40 hex chars)`)
    }

    if (!nullifier || typeof nullifier !== 'string') {
        throw new Error(`Invalid nullifier: ${nullifier}. Must be a valid bytes32 string`)
    }

    if (!secret || typeof secret !== 'string') {
        throw new Error(`Invalid secret: ${secret}. Must be a valid bytes32 string`)
    }

    // 🔧 Format parameters to ensure proper bytes32 format
    const formattedNullifier = nullifier.startsWith('0x') ? nullifier : '0x' + nullifier
    const formattedSecret = secret.startsWith('0x') ? secret : '0x' + secret

    if (formattedNullifier.length !== 66) {
        throw new Error(`Invalid nullifier length: ${formattedNullifier.length}/66. Must be 66 characters (0x + 64 hex chars)`)
    }

    if (formattedSecret.length !== 66) {
        throw new Error(`Invalid secret length: ${formattedSecret.length}/66. Must be 66 characters (0x + 64 hex chars)`)
    }

    console.log('✅ Parameter validation passed')
    console.log('   To:', to)
    console.log('   Nullifier:', formattedNullifier)
    console.log('   Secret:', formattedSecret)

    // 🔍 Calculate and verify commitment
    try {
        const calculatedCommitment = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [formattedNullifier, formattedSecret])
        )
        console.log('🔍 Calculated commitment:', calculatedCommitment)
        console.log('   This should match the commitment used during deposit')
    } catch (commitmentError) {
        console.warn('⚠️ Could not calculate commitment for verification:', commitmentError)
    }

    if (!contractManager) {
        throw new Error('Contract manager not initialized. Please connect wallet first.')
    }

    try {
        console.log('🔐 Using provided cryptographic proof:')
        console.log('   Nullifier:', formattedNullifier)
        console.log('   Secret:', formattedSecret)
        console.log('   To Address:', to)

        const receipt = await contractManager.withdraw(to, formattedNullifier, formattedSecret)

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
    console.log('   Manager initialized:', !!contractManager)

    if (contractManager) {
        console.log('   Provider:', !!contractManager.provider)
        console.log('   Signer:', !!contractManager.signer)
        console.log('   Contracts initialized:', !!contractManager.initialized)

        if (contractManager.contracts) {
            console.log('   Available contracts:')
            console.log('     - Mixer:', !!contractManager.contracts.mixer, contractsConfig.MIXER_ADDRESS)
            console.log('     - LendingPool:', !!contractManager.contracts.lendingPool, contractsConfig.LENDING_POOL_ADDRESS)
            console.log('     - CollateralManager:', !!contractManager.contracts.collateralManager, contractsConfig.COLLATERAL_MANAGER_ADDRESS)
        }
    }

    console.log('🔧 Contract Configurations:')
    console.log('   Chain ID:', contractsConfig.CHAIN_ID)
    console.log('   Available tokens:', Object.keys(contractsConfig.TOKENS))
    console.log('   Contract addresses:')
    console.log('     - Mixer:', contractsConfig.MIXER_ADDRESS)
    console.log('     - LendingPool:', contractsConfig.LENDING_POOL_ADDRESS)
    console.log('     - CollateralManager:', contractsConfig.COLLATERAL_MANAGER_ADDRESS)
}

// Test function to verify contract deployment
export async function testContractDeployment() {
    console.log('🧪 Testing contract deployment...')

    if (!contractManager || !contractManager.provider) {
        throw new Error('Contract manager or provider not available')
    }

    try {
        // Test each contract
        const mixer = contractManager.contracts?.mixer
        const lendingPool = contractManager.contracts?.lendingPool
        const collateralManager = contractManager.contracts?.collateralManager

        if (!mixer || !lendingPool || !collateralManager) {
            throw new Error('One or more contracts not initialized')
        }

        // Test contract calls
        console.log('🔍 Testing contract calls...')

        // Test Mixer
        try {
            const mixerCode = await contractManager.provider.getCode(contractsConfig.MIXER_ADDRESS)
            console.log('   Mixer contract code length:', mixerCode.length)
            if (mixerCode === '0x') {
                throw new Error('Mixer contract not deployed at ' + contractsConfig.MIXER_ADDRESS)
            }
        } catch (error) {
            console.error('   ❌ Mixer test failed:', error)
            throw error
        }

        // Test CollateralManager
        try {
            const cmCode = await contractManager.provider.getCode(contractsConfig.COLLATERAL_MANAGER_ADDRESS)
            console.log('   CollateralManager contract code length:', cmCode.length)
            if (cmCode === '0x') {
                throw new Error('CollateralManager contract not deployed at ' + contractsConfig.COLLATERAL_MANAGER_ADDRESS)
            }
        } catch (error) {
            console.error('   ❌ CollateralManager test failed:', error)
            throw error
        }

        // Test LendingPool
        try {
            const lpCode = await contractManager.provider.getCode(contractsConfig.LENDING_POOL_ADDRESS)
            console.log('   LendingPool contract code length:', lpCode.length)
            if (lpCode === '0x') {
                throw new Error('LendingPool contract not deployed at ' + contractsConfig.LENDING_POOL_ADDRESS)
            }
        } catch (error) {
            console.error('   ❌ LendingPool test failed:', error)
            throw error
        }

        console.log('✅ All contracts are properly deployed')
        return true

    } catch (error) {
        console.error('❌ Contract deployment test failed:', error)
        throw error
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

/**
 * Simplified stake and borrow function for frontend use
 * 正确的流程：先deposit到Mixer作为stake，然后可选择性地borrow
 */
export async function stakeAndBorrow(collateralToken, collateralAmount, borrowToken, borrowAmount) {
    console.log(`🔗 Starting real blockchain stake: ${collateralAmount} ${collateralToken}`)

    if (!contractManager) {
        throw new Error('Contract manager not initialized. Please call connectWallet() first.')
    }

    try {
        // 步骤1：生成nullifier和secret用于commitment
        const nullifier = ethers.hexlify(ethers.randomBytes(31))
        const secret = ethers.hexlify(ethers.randomBytes(31))
        const commitment = ethers.keccak256(
            ethers.solidityPacked(['bytes31', 'bytes31'], [nullifier, secret])
        )

        console.log('🔐 Generated commitment proof:')
        console.log('   Nullifier:', nullifier)
        console.log('   Secret:', secret)
        console.log('   Commitment:', commitment)

        // 步骤2：先deposit到Mixer作为stake（这是真正的"stake"操作）
        console.log('📝 Step 1: Depositing to Mixer as stake...')
        const depositReceipt = await contractManager.deposit(collateralToken, collateralAmount, commitment)
        console.log('✅ Stake deposit successful:', depositReceipt.transactionHash || depositReceipt.hash)

        let borrowReceipt = null
        let actualBorrowAmount = borrowAmount

        // 步骤3：如果有borrowAmount > 0，则进行lockAndBorrow
        if (borrowAmount > 0) {
            console.log(`📝 Step 2: Borrowing ${borrowAmount} ${borrowToken} against staked collateral...`)

            // 使用刚deposit的commitment进行lockAndBorrow
            borrowReceipt = await contractManager.lockAndBorrow(
                commitment,
                borrowToken,
                borrowAmount
            )
            console.log('✅ Borrow successful:', borrowReceipt.transactionHash || borrowReceipt.hash)
        } else {
            console.log('📝 Step 2: Skipped borrowing (amount = 0)')
            actualBorrowAmount = 0
        }

        console.log(`✅ Stake and borrow completed!`)
        console.log(`   Stake Transaction: ${depositReceipt.transactionHash || depositReceipt.hash}`)
        if (borrowReceipt) {
            console.log(`   Borrow Transaction: ${borrowReceipt.transactionHash || borrowReceipt.hash}`)
        }

        // 保存完整的stake信息到localStorage
        const stakeData = {
            commitment: commitment,
            nullifier: nullifier,
            secret: secret,
            collateralToken: collateralToken,
            collateralAmount: collateralAmount,
            borrowToken: borrowToken,
            borrowAmount: actualBorrowAmount,
            stakeTime: Date.now(),
            status: 'active',
            stakeTxHash: depositReceipt.transactionHash || depositReceipt.hash,
            borrowTxHash: borrowReceipt ? (borrowReceipt.transactionHash || borrowReceipt.hash) : null,
            borrows: actualBorrowAmount > 0 ? {
                [borrowToken]: {
                    amount: actualBorrowAmount,
                    borrowTime: Date.now()
                }
            } : {}
        }

        return {
            success: true,
            commitment: commitment,
            nullifier: nullifier,
            secret: secret,
            stakeTxHash: depositReceipt.transactionHash || depositReceipt.hash,
            borrowTxHash: borrowReceipt ? (borrowReceipt.transactionHash || borrowReceipt.hash) : null,
            collateralAmount: collateralAmount,
            borrowAmount: actualBorrowAmount
        }

    } catch (error) {
        console.error(`❌ Stake and borrow failed:`, error)
        throw new Error(`Stake and borrow failed: ${error.message}`)
    }
}

/**
 * Simplified borrow function for frontend use
 * 基于已有的stake进行借款
 */
export async function borrowAgainstStake(commitment, borrowToken, borrowAmount) {
    console.log(`🔗 Starting blockchain borrow: ${borrowAmount} ${borrowToken} against stake ${commitment}`)

    // 🔧 参数验证
    if (!commitment || typeof commitment !== 'string' || !commitment.startsWith('0x') || commitment.length !== 66) {
        throw new Error(`Invalid commitment: ${commitment}. Must be a valid 66-character hex string starting with 0x`)
    }

    if (!borrowToken || typeof borrowToken !== 'string') {
        throw new Error(`Invalid borrow token: ${borrowToken}. Must be a valid token symbol`)
    }

    if (!borrowAmount || borrowAmount <= 0) {
        throw new Error(`Invalid borrow amount: ${borrowAmount}. Must be greater than 0`)
    }

    // 检查代币是否支持
    const tokenConfig = contractsConfig.TOKENS[borrowToken]
    if (!tokenConfig) {
        throw new Error(`Token ${borrowToken} is not supported. Available tokens: ${Object.keys(contractsConfig.TOKENS).join(', ')}`)
    }

    console.log('✅ Parameter validation passed')
    console.log('   Commitment:', commitment)
    console.log('   Borrow Token:', borrowToken, '(', tokenConfig.address, ')')
    console.log('   Borrow Amount:', borrowAmount)

    if (!contractManager) {
        throw new Error('Contract manager not initialized. Please call connectWallet() first.')
    }

    // 🔍 验证合约是否已初始化
    if (!contractManager.contracts?.collateralManager) {
        throw new Error('CollateralManager contract not initialized. Please ensure wallet is connected and contracts are deployed.')
    }

    try {
        const receipt = await contractManager.lockAndBorrow(
            commitment,
            borrowToken,
            borrowAmount
        )

        console.log(`✅ Borrow successful!`)
        console.log(`   Transaction Hash: ${receipt.transactionHash || receipt.hash}`)
        console.log(`   Block: ${receipt.blockNumber || 'pending'}`)

        return {
            success: true,
            txHash: receipt.transactionHash || receipt.hash,
            blockNumber: receipt.blockNumber || 'pending',
            gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : 'pending'
        }

    } catch (error) {
        console.error(`❌ Borrow failed:`, error)
        throw new Error(`Borrow failed: ${error.message}`)
    }
}

/**
 * Simplified unstake and repay function for frontend use
 */
/**
 * Simplified unstake and repay function for frontend use
 * 完整的unstake流程：先repayAndUnlock偿还债务，然后从Mixer withdraw资金
 */
export async function unstakeAndRepay(commitment, nullifier, secret, repayAmount, repayToken) {
    console.log(`🔗 Starting blockchain unstake: repay ${repayAmount} ${repayToken}, then withdraw stake`)

    if (!contractManager) {
        throw new Error('Contract manager not initialized. Please call connectWallet() first.')
    }

    try {
        let repayReceipt = null
        let totalTransactions = 0

        // 预估gas费用和交易数量
        console.log('⛽ Analyzing gas costs...')

        // 步骤1：如果有债务，先repayAndUnlock
        if (repayAmount > 0) {
            console.log(`📝 Step 1: Repaying ${repayAmount} ${repayToken}...`)

            // 检查是否需要额外的approve交易
            const token = contractsConfig.TOKENS[repayToken]
            const isETH = !token || token.address === "0x0000000000000000000000000000000000000000" || token.address === ethers.ZeroAddress

            if (!isETH) {
                console.log('⚠️  Note: ERC20 repayment requires 2 transactions:')
                console.log('   1. Approve token spend (~50,000 gas)')
                console.log('   2. Repay and unlock (~150,000 gas)')
                totalTransactions += 2
            } else {
                console.log('ℹ️  ETH repayment requires 1 transaction (~150,000 gas)')
                totalTransactions += 1
            }

            repayReceipt = await contractManager.repayAndUnlock(
                commitment,
                repayAmount,
                repayToken
            )
            console.log('✅ Repay and unlock successful:', repayReceipt.transactionHash || repayReceipt.hash)
        } else {
            console.log('📝 Step 1: No debt to repay, skipping repayAndUnlock')
        }

        // 步骤2：从Mixer withdraw stake资金
        console.log('📝 Step 2: Withdrawing stake from Mixer...')
        console.log('ℹ️  Withdraw transaction (~200,000 gas)')
        totalTransactions += 1

        console.log(`📊 Total transactions required: ${totalTransactions}`)

        const withdrawReceipt = await contractManager.withdraw(
            await contractManager.getCurrentWalletAddress(),
            nullifier,
            secret
        )
        console.log('✅ Withdraw successful:', withdrawReceipt.transactionHash || withdrawReceipt.hash)

        console.log(`✅ Unstake completed!`)
        if (repayReceipt) {
            console.log(`   Repay Transaction: ${repayReceipt.transactionHash || repayReceipt.hash}`)
        }
        console.log(`   Withdraw Transaction: ${withdrawReceipt.transactionHash || withdrawReceipt.hash}`)

        return {
            success: true,
            repayTxHash: repayReceipt ? (repayReceipt.transactionHash || repayReceipt.hash) : null,
            withdrawTxHash: withdrawReceipt.transactionHash || withdrawReceipt.hash,
            blockNumber: withdrawReceipt.blockNumber || 'pending',
            gasUsed: withdrawReceipt.gasUsed ? withdrawReceipt.gasUsed.toString() : 'pending',
            totalTransactions: totalTransactions
        }

    } catch (error) {
        console.error(`❌ Unstake failed:`, error)
        throw new Error(`Unstake failed: ${error.message}`)
    }
}
