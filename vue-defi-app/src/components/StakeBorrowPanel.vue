<template>
  <div class="tornado-panel animate-slide-up">
    <!-- Tabs -->
    <div class="flex gap-2 mb-4">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tornado-tab', { active: activeTab === tab.id }]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Stake Tab -->
    <div v-if="activeTab === 'stake'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Collateral token</label>
          <select v-model="stakeForm.token" class="tornado-input">
            <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
              {{ token.sym }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Amount</label>
          <input 
            v-model="stakeForm.amount" 
            type="number" 
            placeholder="0.0" 
            class="tornado-input"
            min="0" 
            step="any"
          />
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Your balance</div>
          <div class="font-mono text-lg">{{ formatNumber(stakeBalance) }}</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Staked (local)</div>
          <div class="font-mono text-lg">{{ formatStakedInfo() }}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="approveStake"
          :disabled="!canApproveStake"
          class="tornado-button-secondary flex-1"
        >
          <div v-if="isApprovingStake" class="loading-spinner"></div>
          Approve
        </button>
        <button 
          @click="stake"
          :disabled="!canStake"
          class="tornado-button-primary flex-1"
        >
          <div v-if="isStaking" class="loading-spinner"></div>
          Stake
        </button>
      </div>
    </div>

    <!-- Borrow Tab -->
    <div v-if="activeTab === 'borrow'" class="space-y-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Stake Note (66-char hash)</label>
          <input 
            v-model="borrowForm.note" 
            type="text" 
            placeholder="Enter your stake transaction note (0x...)..." 
            class="tornado-input font-mono text-sm"
            maxlength="66"
            spellcheck="false"
          />
          <div class="text-xs mt-1" :class="borrowInfo.noteStatus === 'Valid' ? 'text-green-400' : 'text-red-400'">
            Status: {{ borrowInfo.noteStatus }}
          </div>
          <div v-if="borrowForm.note" class="text-xs text-mixer-muted mt-1">
            Length: {{ borrowForm.note.length }}/66 characters
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-mixer-muted mb-2">Borrow token</label>
            <select v-model="borrowForm.token" class="tornado-input" @change="updateMaxBorrow">
              <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
                {{ token.sym }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-mixer-muted mb-2">To address</label>
            <input 
              v-model="borrowForm.toAddress" 
              class="tornado-input font-mono text-sm" 
              placeholder="0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f"
              spellcheck="false"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-mixer-muted mb-2">Amount</label>
            <input 
              v-model="borrowForm.amount" 
              type="number" 
              placeholder="0.0" 
              :class="[
                'tornado-input',
                borrowAmountExceeded ? 'border-red-500 border-2' : ''
              ]"
              min="0" 
              step="any"
              :max="borrowInfo.maxBorrowable || 0"
            />
            <div v-if="borrowInfo.record" class="text-xs text-mixer-muted mt-1">
              Remaining available: {{ formatNumber(borrowInfo.remainingBorrowable, 6) }} {{ borrowForm.token }}
            </div>
            <!-- 超出可借款金额的警告提示 -->
            <div v-if="borrowAmountExceeded" class="text-xs text-red-400 mt-1 font-medium">
              ⚠️ Amount exceeds remaining borrowable limit ({{ formatNumber(borrowInfo.remainingBorrowable, 6) }} {{ borrowForm.token }})
            </div>
          </div>
          <div>
            <label class="block text-sm text-mixer-muted mb-2">Borrow Rate (APR)</label>
            <input v-model="borrowAPR" class="tornado-input" readonly />
          </div>
        </div>
      </div>

      <!-- Borrow Stats -->
      <div class="space-y-4">
        <!-- Currency selector for stats display -->
        <div class="flex items-center gap-2">
          <label class="text-sm text-mixer-muted">Display currency:</label>
          <select v-model="displayCurrency" class="tornado-input w-20">
            <option value="USD">USD</option>
            <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
              {{ token.sym }}
            </option>
          </select>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div class="stat-card">
            <div class="text-sm text-mixer-muted mb-1">Your {{ borrowForm.token }} Balance</div>
            <div class="font-mono text-lg">{{ formatNumber(borrowBalance) }}</div>
          </div>
          <div class="stat-card">
            <div class="text-sm text-mixer-muted mb-1">Current Debt (est.)</div>
            <div class="font-mono text-lg text-red-400">{{ formatCurrencyValue(borrowInfo.currentDebtValue, displayCurrency) }}</div>
          </div>
          <div class="stat-card">
            <div class="text-sm text-mixer-muted mb-1">Collateral Value</div>
            <div class="font-mono text-lg">{{ formatCurrencyValue(borrowInfo.collateralValueUSD, displayCurrency) }}</div>
          </div>
        </div>
      </div>

      <div class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p class="text-sm text-blue-300">
          可借上限 = 抵押价值 × LTV ({{ walletStore.config.ltv * 100 || 50 }}%) / 借出币价。示例价格可在 Config 中修改。
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="borrow"
          :disabled="!canBorrow"
          :class="[
            'flex-1',
            borrowAmountExceeded ? 'tornado-button-danger' : 'tornado-button-primary'
          ]"
        >
          <div v-if="isBorrowing" class="loading-spinner"></div>
          <span v-if="borrowAmountExceeded">⚠️ Amount Exceeds Limit</span>
          <span v-else>Borrow</span>
        </button>
      </div>

      <!-- 额外的错误提示区域 -->
      <div v-if="borrowAmountExceeded" class="bg-red-900/20 border border-red-500 rounded-lg p-3">
        <div class="text-red-400 text-sm font-medium">
          🚫 Cannot Borrow: Amount Exceeds Available Limit
        </div>
        <div class="text-red-300 text-xs mt-1">
          Requested: {{ borrowForm.amount }} {{ borrowForm.token }} | 
          Available: {{ formatNumber(borrowInfo.remainingBorrowable, 6) }} {{ borrowForm.token }}
        </div>
      </div>

      <p class="text-xs text-mixer-muted">
        * 未接入借贷合约时，此按钮只做演示记账。借款将产生利息费用。
      </p>
    </div>

    <!-- Unstake Tab -->
    <div v-if="activeTab === 'unstake'" class="space-y-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Stake Note (66-char hash)</label>
          <input 
            v-model="unstakeForm.note" 
            type="text" 
            placeholder="Enter your stake transaction note (0x...)..." 
            class="tornado-input font-mono text-sm"
            maxlength="66"
            spellcheck="false"
          />
          <div class="text-xs mt-1" :class="unstakeInfo.noteStatus === 'Valid' ? 'text-green-400' : 'text-red-400'">
            Status: {{ unstakeInfo.noteStatus }}
          </div>
          <div v-if="unstakeForm.note" class="text-xs text-mixer-muted mt-1">
            Length: {{ unstakeForm.note.length }}/66 characters
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-mixer-muted mb-2">Token</label>
            <select v-model="unstakeForm.token" class="tornado-input" disabled>
              <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
                {{ token.sym }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-mixer-muted mb-2">Required Debt Repayment</label>
            <input 
              v-model="unstakeInfo.requiredAmount" 
              class="tornado-input" 
              readonly
            />
            <div v-if="unstakeInfo.record" class="text-xs text-mixer-muted mt-1">
              Must repay all borrowed amounts (see breakdown below)
            </div>
          </div>
        </div>
      </div>

      <!-- Unstake Stats -->
      <div class="space-y-4">
        <!-- Currency selector for unstake stats display -->
        <div class="flex items-center gap-2">
          <label class="text-sm text-mixer-muted">Display currency:</label>
          <select v-model="displayCurrency" class="tornado-input w-20">
            <option value="USD">USD</option>
            <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
              {{ token.sym }}
            </option>
          </select>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="stat-card">
            <div class="text-sm text-mixer-muted mb-1">Total Debt (with interest)</div>
            <div class="font-mono text-lg text-red-400">{{ formatCurrencyValue(unstakeInfo.totalDebtValue, displayCurrency) }}</div>
          </div>
          <div class="stat-card">
            <div class="text-sm text-mixer-muted mb-1">Collateral to Release</div>
            <div class="font-mono text-lg text-green-400">{{ unstakeInfo.collateralRelease }}</div>
          </div>
        </div>
        
        <!-- 显示需要偿还的具体币种明细 -->
        <div v-if="unstakeInfo.debtBreakdown && Object.keys(unstakeInfo.debtBreakdown).length > 0" class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <div class="text-yellow-300 text-sm font-medium mb-2">Required repayments by token:</div>
          <div v-for="(amount, token) in unstakeInfo.debtBreakdown" :key="token" class="text-yellow-200 text-xs">
            {{ formatNumber(amount, 6) }} {{ token }} (borrow + interest)
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="unstake"
          :disabled="!canUnstake"
          class="tornado-button-danger flex-1"
        >
          <div v-if="isUnstaking" class="loading-spinner"></div>
          Unstake
        </button>
      </div>

      <p class="text-xs text-mixer-muted">
        * Unstake需要偿还所有借款本金和利息。系统将自动计算所需金额。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useNotificationStore } from '@/stores/notifications'
import { formatNumber, now } from '@/utils/helpers'

const walletStore = useWalletStore()
const notificationStore = useNotificationStore()

// State
const activeTab = ref('stake')
const displayCurrency = ref('USD') // 添加显示货币选择器
const stakeBalance = ref(0)
const borrowBalance = ref(0) // 添加借款币种的余额跟踪
const isApprovingStake = ref(false)
const isStaking = ref(false)
const isBorrowing = ref(false)
const isUnstaking = ref(false)

// Forms
const stakeForm = ref({
  token: 'ETH',
  amount: ''
})

const borrowForm = ref({
  token: 'DAI',
  amount: '',
  toAddress: '',
  note: ''
})

const unstakeForm = ref({
  token: 'ETH',
  note: ''
})

// Constants
const tabs = [
  { id: 'stake', label: 'Stake' },
  { id: 'borrow', label: 'Borrow' },
  { id: 'unstake', label: 'Unstake' }
]

// Computed
const borrowAPR = computed(() => {
  const base = Number(walletStore.config.borrowAPR) || 8 // 默认8%借款利率
  return base.toFixed(2) + '%'
})

const borrowInfo = computed(() => {
  const note = borrowForm.value.note
  if (!note) {
    return { 
      maxBorrowable: 0, 
      remainingBorrowable: 0,
      currentDebt: '–', 
      collateralValue: '–', 
      noteStatus: 'Please enter note' 
    }
  }
  
  if (!walletStore.localData.stakeNotes) {
    return { 
      maxBorrowable: 0, 
      remainingBorrowable: 0,
      currentDebt: '–', 
      collateralValue: '–', 
      noteStatus: 'No stake notes data' 
    }
  }
  
  const record = walletStore.localData.stakeNotes[note]
  if (!record) {
    return { 
      maxBorrowable: 0, 
      remainingBorrowable: 0,
      currentDebt: '–', 
      collateralValue: '–', 
      noteStatus: 'Invalid note' 
    }
  }
  
  // 计算抵押品价值
  const tokenData = walletStore.config.tokens.find(t => t.sym === record.token)
  const collateralValueUSD = (record.amount || 0) * (tokenData?.price || 0)
  
  // 计算原始最大可借金额（USD）
  const ltv = Number(walletStore.config.ltv) || 0.5
  const maxBorrowableUSD = collateralValueUSD * ltv
  
  // 计算当前已借金额的USD总值（仅本金，不包含利息）
  let totalBorrowedUSD = 0
  // 计算当前债务（包含利息）用于显示
  let totalDebtUSD = 0
  if (record.borrows) {
    const currentTime = now()
    const borrowAPRValue = Number(walletStore.config.borrowAPR) || 8
    
    for (const [token, borrowData] of Object.entries(record.borrows)) {
      const principal = borrowData.amount || 0
      const tokenPrice = walletStore.config.tokens.find(t => t.sym === token)?.price || 1
      
      // 只计算本金，不包含利息，因为available borrow应该基于原始借款金额
      totalBorrowedUSD += principal * tokenPrice
      
      // 计算包含利息的债务用于显示
      const borrowTime = borrowData.borrowTime || currentTime
      const elapsedTime = currentTime - borrowTime
      const days = elapsedTime / 86400
      // 自然日计算，不足一天等于一天，向上取整
      const daysForCalculation = Math.max(1, Math.ceil(days))
      
      const interest = principal * borrowAPRValue / 100 * (daysForCalculation / 365)
      const totalBorrow = principal + interest
      
      totalDebtUSD += totalBorrow * tokenPrice
    }
  }
  
  // 计算剩余可借金额（USD）
  const remainingBorrowableUSD = Math.max(0, maxBorrowableUSD - totalBorrowedUSD)
  
  // 转换为当前选择的借款币种
  const borrowToken = walletStore.config.tokens.find(t => t.sym === borrowForm.value.token)
  const borrowTokenPrice = borrowToken?.price || 1
  const remainingBorrowableAmount = remainingBorrowableUSD / borrowTokenPrice
  const maxBorrowableAmount = maxBorrowableUSD / borrowTokenPrice
  
  return {
    maxBorrowable: maxBorrowableAmount,
    remainingBorrowable: remainingBorrowableAmount,
    currentDebt: totalDebtUSD > 0 ? `$${formatNumber(totalDebtUSD, 2)}` : '$0',
    currentDebtValue: totalDebtUSD, // 原始USD数值用于货币转换
    collateralValue: `$${formatNumber(collateralValueUSD, 2)}`,
    collateralValueUSD: collateralValueUSD, // 原始USD数值用于货币转换
    noteStatus: 'Valid',
    record: record
  }
})

const unstakeInfo = computed(() => {
  const note = unstakeForm.value.note
  if (!note) {
    return { 
      requiredAmount: '–', 
      totalDebt: '–', 
      collateralRelease: '–', 
      noteStatus: 'Please enter note' 
    }
  }
  
  if (!walletStore.localData.stakeNotes) {
    return { 
      requiredAmount: '–', 
      totalDebt: '–', 
      collateralRelease: '–', 
      noteStatus: 'No stake notes data' 
    }
  }
  
  const record = walletStore.localData.stakeNotes[note]
  if (!record) {
    return { 
      requiredAmount: '–', 
      totalDebt: '–', 
      collateralRelease: '–', 
      noteStatus: 'Invalid note' 
    }
  }
  
  // 自动设置token
  unstakeForm.value.token = record.token
  
  // 计算总债务（包含利息）- 只计算借款金额，不包含stake
  let totalDebtAmount = 0
  let totalDebtDisplay = '$0'
  let totalDebtInBorrowedTokens = {} // 按币种分类的债务
  
  if (record.borrows) {
    const currentTime = now()
    const borrowAPRValue = Number(walletStore.config.borrowAPR) || 8
    
    for (const [token, borrowData] of Object.entries(record.borrows)) {
      const principal = borrowData.amount || 0
      const borrowTime = borrowData.borrowTime || currentTime
      const elapsedTime = currentTime - borrowTime
      const days = elapsedTime / 86400
      // 自然日计算，不足一天等于一天，向上取整
      const daysForCalculation = Math.max(1, Math.ceil(days))
      
      const interest = principal * borrowAPRValue / 100 * (daysForCalculation / 365)
      const totalBorrow = principal + interest
      const tokenPrice = walletStore.config.tokens.find(t => t.sym === token)?.price || 1
      
      totalDebtAmount += totalBorrow * tokenPrice
      totalDebtInBorrowedTokens[token] = totalBorrow
    }
    totalDebtDisplay = `$${formatNumber(totalDebtAmount, 2)}`
  }
  
  // unstake所需金额 = 只需要偿还借款本金和利息，不需要stake金额
  const stakeAmount = record.amount || 0
  
  return {
    requiredAmount: totalDebtDisplay, // 显示总债务的USD值
    totalDebt: totalDebtDisplay,
    totalDebtValue: totalDebtAmount, // 原始USD数值用于货币转换
    collateralRelease: `${formatNumber(stakeAmount, 6)} ${record.token}`,
    noteStatus: 'Valid',
    record: record,
    debtBreakdown: totalDebtInBorrowedTokens // 按币种分类的债务明细
  }
})

const maxBorrowable = computed(() => {
  return formatNumber(borrowInfo.value.remainingBorrowable, 6)
})

const canApproveStake = computed(() => {
  return stakeForm.value.token && stakeForm.value.amount && !isApprovingStake.value
})

const canStake = computed(() => {
  return stakeForm.value.token && stakeForm.value.amount && !isStaking.value
})

const canBorrow = computed(() => {
  const amount = Number(borrowForm.value.amount)
  const remainingBorrowable = borrowInfo.value.remainingBorrowable || 0
  // 恢复可借金额限制，不允许超出available borrow
  return borrowForm.value.token && borrowForm.value.note && borrowForm.value.toAddress && 
         amount > 0 && amount <= remainingBorrowable && 
         borrowInfo.value.noteStatus === 'Valid' && !isBorrowing.value
})

// 检查是否超出可借款金额的computed property
const borrowAmountExceeded = computed(() => {
  const amount = Number(borrowForm.value.amount)
  const remainingBorrowable = borrowInfo.value.remainingBorrowable || 0
  return amount > 0 && amount > remainingBorrowable && borrowInfo.value.noteStatus === 'Valid'
})

const canUnstake = computed(() => {
  return unstakeForm.value.note && unstakeInfo.value.noteStatus === 'Valid' && !isUnstaking.value
})

// Methods
function generateStakeNote() {
  // 生成64位随机哈希值作为交易凭证
  const chars = '0123456789abcdef'
  let result = '0x'
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    notificationStore.success(
      'Copied! 📋',
      'Stake note copied to clipboard',
      3000
    )
  } catch (err) {
    console.error('Failed to copy text: ', err)
    notificationStore.error(
      'Copy Failed',
      'Unable to copy to clipboard. Please copy manually.',
      5000
    )
  }
}
function formatStakedInfo() {
  const notes = walletStore.localData.stakeNotes || {}
  const activeNotes = Object.values(notes).filter(note => note.status === 'active')
  
  if (activeNotes.length === 0) return '0'
  
  const summary = activeNotes.reduce((acc, note) => {
    const token = note.token
    acc[token] = (acc[token] || 0) + note.amount
    return acc
  }, {})
  
  const entries = Object.entries(summary).map(([token, amount]) => 
    `${token}:${formatNumber(amount, 4)}`
  )
  
  return `${entries.join(' | ')} (${activeNotes.length} notes)`
}

// Currency conversion function
function formatCurrencyValue(usdValue, targetCurrency) {
  if (!usdValue || usdValue === 0) return `${targetCurrency === 'USD' ? '$' : ''}0`
  
  if (targetCurrency === 'USD') {
    return `$${formatNumber(usdValue, 2)}`
  }
  
  // Convert USD to target token
  const targetToken = walletStore.config.tokens.find(t => t.sym === targetCurrency)
  if (!targetToken || !targetToken.price) {
    return `$${formatNumber(usdValue, 2)}` // fallback to USD
  }
  
  const convertedValue = usdValue / targetToken.price
  return `${formatNumber(convertedValue, 6)} ${targetCurrency}`
}

// Methods
function getTotalCollateralValueUSD() {
  // 使用新的stakeNotes数据结构
  let totalUSD = 0
  const notes = walletStore.localData.stakeNotes || {}
  
  for (const note of Object.values(notes)) {
    if (note.status === 'active') {
      const tokenData = walletStore.config.tokens.find(t => t.sym === note.token)
      if (tokenData) {
        totalUSD += (note.amount || 0) * (tokenData.price || 0)
      }
    }
  }
  return totalUSD
}

function updateMaxBorrow() {
  // Computed property handles this automatically
  // 同时更新借款币种的余额显示
  updateBorrowBalance()
}

async function updateStakeBalance() {
  if (walletStore.isConnected) {
    stakeBalance.value = await walletStore.getBalance(stakeForm.value.token)
  }
}

async function updateBorrowBalance() {
  if (walletStore.isConnected) {
    borrowBalance.value = await walletStore.getBalance(borrowForm.value.token)
  }
}

async function approveStake() {
  if (!canApproveStake.value) return
  
  isApprovingStake.value = true
  try {
    const token = stakeForm.value.token
    const amount = Number(stakeForm.value.amount)
    
    const contract = await walletStore.getTokenContract(token)
    if (!contract) {
      notificationStore.warning(
        'No Approval Needed', 
        'Native ETH does not require approval; for ERC20 tokens, please set contract address in Config'
      )
      return
    }
    
    const spender = walletStore.config.lendingAddr || walletStore.config.mixerAddr
    if (!spender) {
      notificationStore.error(
        'Missing Contract Address', 
        'Please set Lending or Mixer contract address in Config for real approvals'
      )
      return
    }
    
    // Simulate approval for demo
    notificationStore.success('Approval Sent', `Approved ${amount} ${token} for staking`)
    
  } catch (error) {
    notificationStore.error('Approval Failed', error.message)
  } finally {
    isApprovingStake.value = false
  }
}

async function stake() {
  if (!canStake.value) return
  
  isStaking.value = true
  try {
    const token = stakeForm.value.token
    const amount = Number(stakeForm.value.amount)
    
    // 生成唯一stake凭证
    const note = generateStakeNote()
    const currentTime = now()
    
    // 初始化 stakeNotes 对象如果不存在
    if (!walletStore.localData.stakeNotes) {
      walletStore.localData.stakeNotes = {}
    }
    
    // 保存stake记录到 note
    walletStore.localData.stakeNotes[note] = {
      token,
      amount,
      stakeTime: currentTime,
      status: 'active',
      borrows: {} // 用于记录基于此抵押的借款
    }
    
    // Update legacy stakes for compatibility
    if (!walletStore.localData.stakes[token]) {
      walletStore.localData.stakes[token] = 0
    }
    walletStore.localData.stakes[token] += amount
    
    walletStore.persistData()
    await updateStakeBalance()
    
    // 创建带有复制按钮的持久通知
    notificationStore.persistentSuccess(
      'Stake Successful! 🎉',
      `Successfully staked ${amount} ${token}\n\n⚠️ IMPORTANT: Save your stake note securely!\nYou need it to borrow against this collateral and to unstake.\n\nStake Note:\n${note}`,
      [
        {
          label: '📋 Copy Note',
          variant: 'primary',
          handler: () => copyToClipboard(note),
          autoClose: false
        },
        {
          label: '✅ Got it',
          variant: 'secondary',
          handler: () => {}
        }
      ]
    )
    
    // Reset form
    stakeForm.value.amount = ''
    
  } catch (error) {
    notificationStore.error('Stake Failed', error.message)
  } finally {
    isStaking.value = false
  }
}

async function borrow() {
  if (!canBorrow.value) {
    // 如果不能借款，提供更详细的错误信息
    const amount = Number(borrowForm.value.amount)
    const remainingBorrowable = borrowInfo.value.remainingBorrowable || 0
    
    if (amount > remainingBorrowable) {
      notificationStore.error(
        '🚫 借款金额超出限制', 
        `请求借款金额: ${amount} ${borrowForm.value.token}\n剩余可借金额: ${formatNumber(remainingBorrowable, 6)} ${borrowForm.value.token}\n\n请减少借款金额至可用范围内。`
      )
    } else if (!borrowForm.value.token) {
      notificationStore.error('缺少信息', '请选择借款币种')
    } else if (!borrowForm.value.note) {
      notificationStore.error('缺少信息', '请输入有效的Stake Note')
    } else if (!borrowForm.value.toAddress) {
      notificationStore.error('缺少信息', '请输入接收地址')
    } else if (amount <= 0) {
      notificationStore.error('无效金额', '请输入大于0的借款金额')
    }
    return
  }
  
  const amount = Number(borrowForm.value.amount)
  const remainingBorrowable = borrowInfo.value.remainingBorrowable || 0
  
  // 双重检查是否超出剩余可借金额
  if (amount > remainingBorrowable) {
    notificationStore.error(
      '🚫 借款金额超出限制', 
      `请求借款金额: ${amount} ${borrowForm.value.token}\n剩余可借金额: ${formatNumber(remainingBorrowable, 6)} ${borrowForm.value.token}\n\n请减少借款金额至可用范围内。`
    )
    return
  }
  
  isBorrowing.value = true
  try {
    const note = borrowForm.value.note
    const token = borrowForm.value.token
    const toAddress = borrowForm.value.toAddress.trim()
    const currentTime = now()
    
    if (!walletStore.localData.stakeNotes || !walletStore.localData.stakeNotes[note]) {
      notificationStore.error('Invalid Note', 'Stake note not found or invalid')
      return
    }
    
    const stakeRecord = walletStore.localData.stakeNotes[note]
    
    // 如果这是该币种的第一次借款，初始化记录
    if (!stakeRecord.borrows[token]) {
      stakeRecord.borrows[token] = {
        amount: 0,
        borrowTime: currentTime
      }
    }
    
    // 累加借款金额（支持多次借款）
    stakeRecord.borrows[token].amount += amount
    
    // 如果之前没有借过这个币种，设置借款时间
    if (stakeRecord.borrows[token].amount === amount) {
      stakeRecord.borrows[token].borrowTime = currentTime
    }
    
    // Update legacy borrows for compatibility
    if (!walletStore.localData.borrows[token]) {
      walletStore.localData.borrows[token] = 0
    }
    walletStore.localData.borrows[token] += amount
    
    walletStore.persistData()
    
    // 更新借款币种的余额显示
    await updateBorrowBalance()
    
    // 计算当前剩余可借金额供显示用
    const newRemainingBorrowable = Math.max(0, remainingBorrowable - amount)
    
    notificationStore.success(
      'Borrow Successful', 
      `Borrowed ${amount} ${token}\nTo address: ${toAddress}\nBorrow rate: ${borrowAPR.value}\nRemaining borrowable: ${formatNumber(newRemainingBorrowable, 6)} ${token}\n\n⚠️ Interest accrues daily. Remember to repay before unstaking.`
    )
    
    // Reset form
    borrowForm.value.amount = ''
    
  } catch (error) {
    notificationStore.error('Borrow Failed', error.message)
  } finally {
    isBorrowing.value = false
  }
}

async function unstake() {
  if (!canUnstake.value) return
  
  isUnstaking.value = true
  try {
    const note = unstakeForm.value.note
    
    if (!walletStore.localData.stakeNotes || !walletStore.localData.stakeNotes[note]) {
      notificationStore.error('Invalid Note', 'Stake note not found or invalid')
      return
    }
    
    const record = walletStore.localData.stakeNotes[note]
    const token = record.token
    const stakeAmount = record.amount
    
    // 计算总债务（包含利息）
    let totalDebtAmount = 0
    let debtDetails = []
    
    if (record.borrows) {
      const currentTime = now()
      const borrowAPRValue = Number(walletStore.config.borrowAPR) || 8
      
      for (const [borrowToken, borrowData] of Object.entries(record.borrows)) {
        const principal = borrowData.amount || 0
        const borrowTime = borrowData.borrowTime || currentTime
        const elapsedTime = currentTime - borrowTime
        const days = elapsedTime / 86400
        const daysForCalculation = Math.max(0, days)
        
        const interest = principal * borrowAPRValue / 100 * (daysForCalculation / 365)
        const totalBorrow = principal + interest
        const tokenPrice = walletStore.config.tokens.find(t => t.sym === borrowToken)?.price || 1
        
        totalDebtAmount += totalBorrow * tokenPrice
        debtDetails.push(`${formatNumber(totalBorrow, 6)} ${borrowToken} (${formatNumber(days, 1)} days)`)
        
        // Update legacy borrows
        if (walletStore.localData.borrows[borrowToken]) {
          walletStore.localData.borrows[borrowToken] -= principal
          if (walletStore.localData.borrows[borrowToken] <= 0) {
            delete walletStore.localData.borrows[borrowToken]
          }
        }
      }
    }
    
    // 删除stake记录
    delete walletStore.localData.stakeNotes[note]
    
    // Update legacy stakes
    if (walletStore.localData.stakes[token]) {
      walletStore.localData.stakes[token] -= stakeAmount
      if (walletStore.localData.stakes[token] <= 0) {
        delete walletStore.localData.stakes[token]
      }
    }
    
    walletStore.persistData()
    await updateStakeBalance()
    
    const debtSummary = debtDetails.length > 0 ? `\nRepaid debts: ${debtDetails.join(', ')}` : '\nNo outstanding debts'
    
    notificationStore.success(
      'Unstake Successful', 
      `Unstaked ${formatNumber(stakeAmount, 6)} ${token}${debtSummary}\n\nTotal settlement: ${formatNumber(stakeAmount + (totalDebtAmount / (walletStore.config.tokens.find(t => t.sym === token)?.price || 1)), 6)} ${token} equivalent`
    )
    
    // Reset form
    unstakeForm.value.note = ''
    
  } catch (error) {
    notificationStore.error('Unstake Failed', error.message)
  } finally {
    isUnstaking.value = false
  }
}

// Watch for token changes to update balance
watch(() => stakeForm.value.token, updateStakeBalance)
watch(() => borrowForm.value.token, updateBorrowBalance) // 监听借款币种变化
watch(() => walletStore.isConnected, updateStakeBalance)
watch(() => walletStore.isConnected, updateBorrowBalance) // 监听钱包连接状态变化
watch(() => walletStore.isConnected, () => {
  if (walletStore.isConnected && !borrowForm.value.toAddress) {
    borrowForm.value.toAddress = walletStore.address
  }
})

// Initialize
walletStore.loadPersistedData()
updateStakeBalance()
updateBorrowBalance() // 初始化借款币种余额
if (walletStore.isConnected) {
  borrowForm.value.toAddress = walletStore.address
}

// 开发者工具：在控制台中提供清空缓存的方法
if (typeof window !== 'undefined') {
  window.clearCache = () => {
    console.log('🗑️ Clearing all cache data...')
    const success = walletStore.clearAllData()
    if (success) {
      console.log('✅ Cache cleared successfully! Reloading page...')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      console.error('❌ Failed to clear cache')
    }
  }
  
  window.showCacheData = () => {
    console.log('📊 Current cache data:')
    console.log('Config:', JSON.stringify(walletStore.config, null, 2))
    console.log('Local Data:', JSON.stringify(walletStore.localData, null, 2))
  }
  
  console.log('🛠️ Developer tools available:')
  console.log('• clearCache() - Clear all cached data')
  console.log('• showCacheData() - Show current cache data')
}
</script>
