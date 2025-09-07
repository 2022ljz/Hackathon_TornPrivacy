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
      <div class="space-y-3">
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
            <!-- Warning for exceeding borrowable amount -->
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
          Max borrowable = Collateral value × LTV ({{ walletStore.config.ltv * 100 || 50 }}%) / Borrow token price. Example prices can be modified in Config.
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

      <!-- Additional error warning area -->
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
        * When lending contracts are not connected, this button only performs demo accounting. Borrowing will incur interest charges.
      </p>
    </div>

    <!-- Unstake Tab -->
    <div v-if="activeTab === 'unstake'" class="space-y-6">
      <!-- Previous Stake Notes Section -->
      <div v-if="availableStakeNotes.length > 0" class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 class="text-blue-300 text-sm font-medium mb-3">📝 Your Previous Stake Notes</h3>
        <div class="space-y-2">
          <div v-for="note in availableStakeNotes" :key="note.commitment" 
               class="flex items-center justify-between bg-gray-800/50 rounded p-3 cursor-pointer hover:bg-gray-700/50"
               @click="selectStakeNote(note)">
            <div class="flex-1">
              <div class="text-sm font-mono text-blue-200">{{ note.commitment.slice(0, 20) }}...</div>
              <div class="text-xs text-mixer-muted">
                {{ note.amount }} {{ note.token }} • 
                {{ note.status }} • 
                {{ formatDate(note.timestamp) }}
              </div>
              <div v-if="note.borrows && Object.keys(note.borrows).length > 0" class="text-xs text-orange-300 mt-1">
                Debts: {{ Object.entries(note.borrows).map(([token, data]) => `${formatNumber(data.amount, 4)} ${token}`).join(', ') }}
              </div>
            </div>
            <button 
              class="text-blue-400 text-xs hover:text-blue-300 px-2 py-1 border border-blue-500/30 rounded"
              @click.stop="selectStakeNote(note)"
            >
              Select
            </button>
          </div>
        </div>
        <div class="text-xs text-mixer-muted mt-3">
          💡 Click on any note above to auto-fill the unstake form
        </div>
      </div>

      <!-- No Stakes Found - Help Section -->
      <div v-else class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
        <h3 class="text-yellow-300 text-sm font-medium mb-3">🔍 No Previous Stakes Found</h3>
        <div class="space-y-3 text-sm text-yellow-100">
          <p>If you've previously staked but can't see your notes, try these options:</p>
          
          <div class="space-y-2">
            <div class="flex items-start gap-2">
              <span class="text-yellow-400">1.</span>
              <div>
                <strong>Check Browser Storage:</strong> Ensure you're using the same browser and haven't cleared localStorage
              </div>
            </div>
            
            <div class="flex items-start gap-2">
              <span class="text-yellow-400">2.</span>
              <div>
                <strong>Manual Recovery:</strong> If you have your transaction hash, you can manually enter the commitment note below
              </div>
            </div>
            
            <div class="flex items-start gap-2">
              <span class="text-yellow-400">3.</span>
              <div>
                <strong>Check Wallet History:</strong> Look for deposit transactions to contract address: 
                <code class="text-blue-300 text-xs bg-gray-800 px-1 rounded">{{ contractAddress }}</code>
              </div>
            </div>
          </div>
          
          <div class="bg-yellow-800/30 border border-yellow-600/50 rounded p-3 mt-3">
            <div class="text-yellow-200 text-xs">
              <strong>⚠️ Important:</strong> Without the correct commitment note (nullifier + secret), you cannot unstake. 
              Make sure to always save your stake receipts!
            </div>
          </div>
        </div>
      </div>

      <!-- Manual Note Input -->
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
            <label class="block text-sm text-mixer-muted mb-2">Borrowed Tokens (to repay)</label>
            <div class="space-y-2">
              <div v-if="borrowedTokensList.length === 0" class="tornado-input bg-gray-600 text-gray-400">
                No borrowed tokens
              </div>
              <div v-else>
                <div v-for="tokenInfo in borrowedTokensList" :key="tokenInfo.token" 
                     class="tornado-input bg-red-900/20 border-red-500/30 text-red-200">
                  {{ tokenInfo.token }}: {{ formatNumber(tokenInfo.amount, 6) }} 
                  <span class="text-xs text-red-400">(+ interest)</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm text-mixer-muted mb-2">Collateral to Release</label>
            <input 
              v-model="unstakeInfo.collateralRelease" 
              class="tornado-input" 
              readonly
            />
            <div v-if="unstakeInfo.record" class="text-xs text-mixer-muted mt-1">
              Staked collateral that will be returned
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
        
        <!-- Display breakdown of required repayments by token -->
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
        * Unstaking requires repayment of all borrowed principal and interest. The system will automatically calculate the required amount.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useNotificationStore } from '@/stores/notifications'
import { formatNumber, now } from '@/utils/helpers'
import { debugContractStatus, testContractDeployment } from '@/utils/contracts.js'
import { ethers } from 'ethers'

const walletStore = useWalletStore()
const notificationStore = useNotificationStore()

// 🔍 Debug: Make debug functions available globally for console access
if (typeof window !== 'undefined') {
  window.debugContractStatus = debugContractStatus
  window.testContractDeployment = testContractDeployment
  
  // Also run a quick status check on component load
  console.log('🔧 StakeBorrowPanel loaded, running contract status check...')
  setTimeout(() => {
    try {
      debugContractStatus()
    } catch (error) {
      console.warn('⚠️ Could not run contract status check:', error)
    }
  }, 1000)
}

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
  token: 'ETH', // 🔥 Changed from DAI to ETH - Only ETH supported!
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
  const base = Number(walletStore.config.borrowAPR) || 8 // Default 8% borrowing rate
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
  
  // Calculate collateral value
  const tokenData = walletStore.config.tokens.find(t => t.sym === record.token)
  const collateralValueUSD = (record.amount || 0) * (tokenData?.price || 0)
  
  // Calculate original max borrowable amount (USD)
  const ltv = Number(walletStore.config.ltv) || 0.5
  const maxBorrowableUSD = collateralValueUSD * ltv
  
  // Calculate currently borrowed amount's USD total (principal only, excluding interest)
  let totalBorrowedUSD = 0
  // Calculate current debt (including interest) for display
  let totalDebtUSD = 0
  if (record.borrows) {
    const currentTime = now()
    const borrowAPRValue = Number(walletStore.config.borrowAPR) || 8
    
    for (const [token, borrowData] of Object.entries(record.borrows)) {
      const principal = borrowData.amount || 0
      const tokenPrice = walletStore.config.tokens.find(t => t.sym === token)?.price || 1
      
      // Only calculate principal, excluding interest, because available borrow should be based on original borrow amount
      totalBorrowedUSD += principal * tokenPrice
      
      // Calculate debt including interest for display
      const borrowTime = borrowData.borrowTime || currentTime
      const elapsedTime = currentTime - borrowTime
      const days = elapsedTime / 86400
      // Natural day calculation, less than one day equals one day, round up
      const daysForCalculation = Math.max(1, Math.ceil(days))
      
      const interest = principal * borrowAPRValue / 100 * (daysForCalculation / 365)
      const totalBorrow = principal + interest
      
      totalDebtUSD += totalBorrow * tokenPrice
    }
  }
  
  // Calculate remaining borrowable amount (USD)
  const remainingBorrowableUSD = Math.max(0, maxBorrowableUSD - totalBorrowedUSD)
  
  // Convert to currently selected borrowing token
  const borrowToken = walletStore.config.tokens.find(t => t.sym === borrowForm.value.token)
  const borrowTokenPrice = borrowToken?.price || 1
  const remainingBorrowableAmount = remainingBorrowableUSD / borrowTokenPrice
  const maxBorrowableAmount = maxBorrowableUSD / borrowTokenPrice
  
  return {
    maxBorrowable: maxBorrowableAmount,
    remainingBorrowable: remainingBorrowableAmount,
    currentDebt: totalDebtUSD > 0 ? `$${formatNumber(totalDebtUSD, 2)}` : '$0',
    currentDebtValue: totalDebtUSD, // Original USD value for currency conversion
    collateralValue: `$${formatNumber(collateralValueUSD, 2)}`,
    collateralValueUSD: collateralValueUSD, // Original USD value for currency conversion
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

const borrowedTokensList = computed(() => {
  const note = unstakeForm.value.note
  if (!note || !walletStore.localData.stakeNotes) return []
  
  const record = walletStore.localData.stakeNotes[note]
  if (!record || !record.borrows) return []
  
  const currentTime = now()
  const borrowAPRValue = Number(walletStore.config.borrowAPR) || 8
  
  return Object.entries(record.borrows).map(([token, borrowData]) => {
    const principal = borrowData.amount || 0
    const borrowTime = borrowData.borrowTime || currentTime
    const elapsedTime = currentTime - borrowTime
    const days = elapsedTime / 86400
    const daysForCalculation = Math.max(1, Math.ceil(days))
    
    const interest = principal * borrowAPRValue / 100 * (daysForCalculation / 365)
    const totalAmount = principal + interest
    
    return {
      token: token,
      amount: totalAmount,
      principal: principal,
      interest: interest
    }
  })
})

const canUnstake = computed(() => {
  return unstakeForm.value.note && unstakeInfo.value.noteStatus === 'Valid' && !isUnstaking.value
})

// 获取所有可用的stake notes用于显示
const availableStakeNotes = computed(() => {
  const notes = walletStore.localData.stakeNotes || {}
  return Object.entries(notes)
    .filter(([commitment, record]) => record.status === 'active')
    .map(([commitment, record]) => ({
      commitment,
      ...record
    }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) // 最新的在前
})

// 获取合约地址用于显示
const contractAddress = computed(() => {
  return walletStore.config?.contracts?.MIXER_ADDRESS || '0xf85Daa3dBA126757027CE967F86Eb7860271AfE0'
})

// Methods
function selectStakeNote(note) {
  unstakeForm.value.note = note.commitment
  notificationStore.success(
    'Note Selected! 📝',
    `Selected stake note for ${note.amount} ${note.token}`,
    3000
  )
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date'
  try {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return 'Invalid date'
  }
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
    // 🔥 Use real blockchain balance instead of local balance!
    // 🚫 No more hardcoded local data!
    try {
      borrowBalance.value = await walletStore.getBalance(borrowForm.value.token)
    } catch (error) {
      console.error('Failed to get blockchain balance:', error)
      borrowBalance.value = 0
    }
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
    
    console.log(`🚀 Starting real blockchain stake: ${amount} ${token} on Sepolia testnet`)
    
    // 导入真实的区块链函数
    const { stakeAndBorrow } = await import('@/utils/contracts.js')
    
    // 纯质押操作：borrowAmount = 0
    const result = await stakeAndBorrow(token, amount, token, 0)
    
    console.log('✅ Blockchain stake successful:', result)
    
    // 从区块链结果中提取commitment note信息
    const commitment = result.commitment || result.note
    const nullifier = result.nullifier
    const secret = result.secret
    const txHash = result.stakeTxHash || result.txHash
    const blockNumber = result.blockNumber
    
    if (!commitment || !nullifier || !secret) {
      throw new Error('Invalid commitment data received from blockchain')
    }
    
    // 初始化 stakeNotes 对象如果不存在
    if (!walletStore.localData.stakeNotes) {
      walletStore.localData.stakeNotes = {}
    }
    
    // 只保存必要的commitment note信息用于后续区块链操作
    walletStore.localData.stakeNotes[commitment] = {
      token,
      amount,
      timestamp: Date.now(),
      status: 'active',
      borrows: {},
      // 区块链关键信息
      nullifier,
      secret,
      txHash,
      blockNumber,
      // 用于跟踪实际的区块链状态
      isBlockchainStake: true
    }
    
    walletStore.persistData()
    await updateStakeBalance()
    
    // 创建带有复制按钮的持久通知
    notificationStore.persistentSuccess(
      'Blockchain Stake Successful! 🎉',
      'Successfully staked ' + amount + ' ' + token + ' on Sepolia testnet!\n\n' +
      '⚠️ IMPORTANT: Save your commitment note securely!\n\n' +
      'Commitment: ' + commitment + '\n' +
      'Transaction: ' + txHash,
      [
        {
          label: '📋 Copy Commitment',
          variant: 'primary',
          handler: () => copyToClipboard(commitment),
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
    console.error('❌ Blockchain stake failed:', error)
    notificationStore.error(
      'Blockchain Stake Failed', 
      'Real blockchain transaction failed: ' + error.message + '\n\n' +
      'Please ensure you have sufficient balance and gas fees on Sepolia testnet.'
    )
  } finally {
    isStaking.value = false
  }
}

async function borrow() {
  if (!canBorrow.value) {
    // 提供详细的错误信息
    const amount = Number(borrowForm.value.amount)
    const remainingBorrowable = borrowInfo.value.remainingBorrowable || 0
    
    if (amount > remainingBorrowable) {
      notificationStore.error(
        '🚫 借款金额超出限制', 
        '请求借款金额: ' + amount + ' ' + borrowForm.value.token + '\n剩余可借金额: ' + formatNumber(remainingBorrowable, 6) + ' ' + borrowForm.value.token + '\n\n请减少借款金额至可用范围内。'
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
      '请求借款金额: ' + amount + ' ' + borrowForm.value.token + '\n剩余可借金额: ' + formatNumber(remainingBorrowable, 6) + ' ' + borrowForm.value.token + '\n\n请减少借款金额至可用范围内。'
    )
    return
  }
  
  isBorrowing.value = true
  try {
    const userNote = borrowForm.value.note  // 用户输入的可能是transaction note
    const token = borrowForm.value.token
    const amount = Number(borrowForm.value.amount)
    const toAddress = borrowForm.value.toAddress
    
    console.log(`🚀 Starting real blockchain borrow: ${amount} ${token} against note ${userNote}`)
    
    // 🔍 智能查找正确的commitment
    let actualCommitment = null
    let stakeRecord = null
    
    // 第1步：检查用户输入是否直接是commitment
    if (walletStore.localData.stakeNotes && walletStore.localData.stakeNotes[userNote]) {
      actualCommitment = userNote
      stakeRecord = walletStore.localData.stakeNotes[userNote]
      console.log('✅ 直接使用输入的commitment:', actualCommitment)
    }
    // 第2步：检查是否是transaction note，需要转换为commitment
    else if (walletStore.localData.notes && walletStore.localData.notes[userNote]) {
      // 从lend notes中获取nullifier和secret，计算commitment
      const lendRecord = walletStore.localData.notes[userNote]
      if (lendRecord.nullifier && lendRecord.secret) {
        // 🚨 CRITICAL FIX: 使用abi.encodePacked()等效方式，而不是abi.encode()
        // 智能合约使用: keccak256(abi.encodePacked(nullifier, secret))
        // 前端等效: keccak256(concat(nullifier, secret))
        actualCommitment = ethers.keccak256(
          ethers.concat([lendRecord.nullifier, lendRecord.secret])
        )
        console.log('🔄 从transaction note计算commitment (使用encodePacked方式):', userNote, '->', actualCommitment)
        
        // 检查计算出的commitment是否在stakeNotes中
        if (walletStore.localData.stakeNotes && walletStore.localData.stakeNotes[actualCommitment]) {
          stakeRecord = walletStore.localData.stakeNotes[actualCommitment]
        }
      }
    }
    // 第3步：尝试在所有stakeNotes中查找匹配的记录
    else if (walletStore.localData.stakeNotes) {
      for (const [commitment, record] of Object.entries(walletStore.localData.stakeNotes)) {
        // 检查是否有相关的transaction hash或其他标识符匹配
        if (record.txHash === userNote || 
            (record.nullifier && record.secret && 
             ethers.keccak256(ethers.concat([record.nullifier, record.secret])) === userNote)) {
          actualCommitment = commitment
          stakeRecord = record
          console.log('🔍 通过记录匹配找到commitment:', actualCommitment)
          break
        }
      }
    }
    
    if (!actualCommitment || !stakeRecord) {
      console.error('❌ 无法找到有效的stake记录')
      console.log('可用的stake notes:', Object.keys(walletStore.localData.stakeNotes || {}))
      console.log('可用的lend notes:', Object.keys(walletStore.localData.notes || {}))
      
      notificationStore.error(
        'Invalid Stake Note', 
        `无法找到对应的质押记录。\n\n输入的note: ${userNote}\n\n请确保：\n1. 您已完成质押操作\n2. 输入的是正确的stake commitment\n3. 或者输入的是对应的transaction note\n\n如果您有质押交易哈希，请查看交易详情获取正确的commitment。`
      )
      return
    }
    
    console.log('✅ 找到有效的stake记录:')
    console.log('   Commitment:', actualCommitment)
    console.log('   Amount:', stakeRecord.amount, stakeRecord.token)
    console.log('   Status:', stakeRecord.status)
    
    // 导入真实的区块链借款函数
    const { borrowAgainstStake } = await import('@/utils/contracts.js')
    
    // 执行真实的区块链借款操作 - 使用实际的commitment
    const result = await borrowAgainstStake(actualCommitment, token, amount)
    
    console.log('✅ Blockchain borrow successful:', result)
    
    // 更新本地commitment记录中的借款信息 - 使用actualCommitment
    if (!stakeRecord.borrows) {
      stakeRecord.borrows = {}
    }
    
    // 记录新的借款
    if (!stakeRecord.borrows[token]) {
      stakeRecord.borrows[token] = { amount: 0, borrowTime: Date.now() }
    }
    stakeRecord.borrows[token].amount += amount
    stakeRecord.borrows[token].borrowTime = Date.now()
    
    // 添加区块链交易信息
    if (!stakeRecord.borrowTxs) {
      stakeRecord.borrowTxs = []
    }
    stakeRecord.borrowTxs.push({
      token,
      amount,
      toAddress,
      txHash: result.txHash || result.transactionHash,
      blockNumber: result.blockNumber,
      timestamp: Date.now()
    })
    
    walletStore.persistData()
    await updateBorrowBalance()
    
    const txHash = result.txHash || result.transactionHash
    const newRemainingBorrowable = borrowInfo.value.remainingBorrowable - amount
    
    notificationStore.success(
      'Borrow Successful',
      'Borrowed ' + amount + ' ' + token + ' on Sepolia testnet!\n\n' +
      'To address: ' + toAddress + '\n' +
      'Transaction: ' + txHash + '\n\n' +
      'Borrow rate: ' + borrowAPR.value + '\n' +
      'Remaining borrowable: ' + formatNumber(newRemainingBorrowable, 6) + ' ' + token + '\n\n' +
      '⚠️ Interest accrues daily. Remember to repay before unstaking.'
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
    const commitment = unstakeForm.value.note
    
    if (!walletStore.localData.stakeNotes || !walletStore.localData.stakeNotes[commitment]) {
      notificationStore.error('Invalid Commitment', 'Stake commitment not found or invalid')
      return
    }
    
    const record = walletStore.localData.stakeNotes[commitment]
    const token = record.token
    const stakeAmount = record.amount
    const nullifier = record.nullifier
    const secret = record.secret
    
    if (!nullifier || !secret) {
      notificationStore.error('Missing Blockchain Data', 'Nullifier or secret not found. This commitment may not be from a real blockchain transaction.')
      return
    }
    
    console.log(`🚀 Starting real blockchain unstake for commitment: ${commitment}`)
    
    // 计算需要偿还的债务
    let totalRepayAmount = 0
    let repayToken = null
    let debtDetails = []
    
    if (record.borrows && Object.keys(record.borrows).length > 0) {
      // 目前只支持单一代币债务偿还，选择第一个债务代币
      const [firstBorrowToken, borrowData] = Object.entries(record.borrows)[0]
      repayToken = firstBorrowToken
      
      const currentTime = Date.now()
      const borrowAPRValue = Number(walletStore.config.borrowAPR) || 8
      const principal = borrowData.amount || 0
      const borrowTime = borrowData.borrowTime || currentTime
      const elapsedDays = (currentTime - borrowTime) / (1000 * 60 * 60 * 24)
      
      const dailyInterestRate = (borrowAPRValue / 100) / 365
      const interest = principal * dailyInterestRate * Math.max(0, elapsedDays)
      totalRepayAmount = principal + interest
      
      debtDetails.push(`${formatNumber(totalRepayAmount, 6)} ${repayToken} (${formatNumber(interest, 6)} interest)`)
      
      console.log(`💰 Calculated debt: ${totalRepayAmount} ${repayToken} (${elapsedDays.toFixed(1)} days)`)
    }
    
    // 导入真实的区块链unstake函数
    const { unstakeAndRepay } = await import('@/utils/contracts.js')
    
    // 执行真实的区块链unstake操作
    const result = await unstakeAndRepay(commitment, nullifier, secret, totalRepayAmount, repayToken || token)
    
    console.log('✅ Blockchain unstake successful:', result)
    
    // 清理本地记录
    delete walletStore.localData.stakeNotes[commitment]
    walletStore.persistData()
    
    await updateStakeBalance()
    
    const debtSummary = debtDetails.length > 0 ? `\nRepaid debts: ${debtDetails.join(', ')}` : '\nNo outstanding debts'
    const repayTxHash = result.repayTxHash
    const withdrawTxHash = result.withdrawTxHash
    
    notificationStore.success(
      'Unstake Successful', 
      'Successfully unstaked ' + formatNumber(stakeAmount, 6) + ' ' + token + ' on Sepolia testnet!' + debtSummary + '\n\n' +
      (repayTxHash ? 'Repay Transaction: ' + repayTxHash + '\n' : '') +
      'Withdraw Transaction: ' + withdrawTxHash + '\n\n' +
      'Total transactions: ' + result.totalTransactions
    )
    
    // Reset form
    unstakeForm.value.note = ''
    
  } catch (error) {
    console.error('❌ Blockchain unstake failed:', error)
    notificationStore.error(
      'Unstake Failed', 
    )
  } finally {
    isUnstaking.value = false
  }
}

// Watch for token changes to update balance
watch(() => stakeForm.value.token, updateStakeBalance)
watch(() => borrowForm.value.token, updateBorrowBalance) // 监听借款币种变化
watch(() => walletStore.isConnected, updateStakeBalance)
watch(() => walletStore.isConnected, updateBorrowBalance) // 监听钱包连接状态变化
watch(() => walletStore.localData.balance, updateBorrowBalance, { deep: true }) // 监听本地余额变化
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
