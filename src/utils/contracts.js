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
  constructor(provider, signer) {
    this.provider = provider
    this.signer = signer
    this.contracts = {}
    this.initContracts()
  }

  initContracts() {
    if (!this.signer || !contractsConfig.MIXER_ADDRESS) return

    try {
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

      console.log('✅ Contracts initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize contracts:', error)
    }
  }

  // 存款到混币器
  async deposit(tokenSymbol, amount, commitment) {
    try {
      const token = contractsConfig.TOKENS[tokenSymbol]
      if (!token) throw new Error(`Token ${tokenSymbol} not found`)

      const amountWei = ethers.utils.parseUnits(amount.toString(), token.decimals)
      
      // 如果是 ERC20 代币，需要先授权
      if (token.address !== 'eth') {
        const tokenContract = this.contracts[tokenSymbol]
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

      // 调用存款函数
      const tx = await this.contracts.mixer.deposit(
        commitment,
        token.address === 'eth' ? ethers.constants.AddressZero : token.address,
        amountWei,
        { value: token.address === 'eth' ? amountWei : 0 }
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

  // 从混币器提取
  async withdraw(to, nullifier, secret) {
    try {
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

  // 向借贷池添加流动性
  async fundLendingPool(tokenSymbol, amount) {
    try {
      const token = contractsConfig.TOKENS[tokenSymbol]
      if (!token) throw new Error(`Token ${tokenSymbol} not found`)

      const amountWei = ethers.utils.parseUnits(amount.toString(), token.decimals)
      
      // 授权代币
      const tokenContract = this.contracts[tokenSymbol]
      const allowance = await tokenContract.allowance(
        await this.signer.getAddress(),
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

      const borrowAmountWei = ethers.utils.parseUnits(
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

      const repayAmountWei = ethers.utils.parseUnits(
        repayAmount.toString(),
        token.decimals
      )

      // 授权还款代币
      const tokenContract = this.contracts[tokenSymbol]
      const allowance = await tokenContract.allowance(
        await this.signer.getAddress(),
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
        return ethers.utils.formatUnits(balance, 18)
      } else {
        const tokenContract = this.contracts[tokenSymbol]
        const balance = await tokenContract.balanceOf(address)
        return ethers.utils.formatUnits(balance, token.decimals)
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
