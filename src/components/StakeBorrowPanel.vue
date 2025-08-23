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
            class="tornado-input font-mono" 
            placeholder="0x..."
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
            class="tornado-input"
            min="0" 
            step="any"
          />
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Max borrowable</label>
          <input v-model="maxBorrowable" class="tornado-input" readonly />
        </div>
      </div>

      <div class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p class="text-sm text-blue-300">
          可借上限 = Σ(抵押价值 × LTV) / 借出币价。示例价格可在 Config 中修改。
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="borrow"
          :disabled="!canBorrow"
          class="tornado-button-primary flex-1"
        >
          <div v-if="isBorrowing" class="loading-spinner"></div>
          Borrow
        </button>
      </div>

      <p class="text-xs text-mixer-muted">
        * 未接入借贷合约时，此按钮只做演示记账。
      </p>
    </div>

    <!-- Unstake Tab -->
    <div v-if="activeTab === 'unstake'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Token</label>
          <select v-model="unstakeForm.token" class="tornado-input" @change="updateUnstakeAmount">
            <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
              {{ token.sym }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Amount (available)</label>
          <input 
            v-model="unstakeForm.amount" 
            class="tornado-input" 
            placeholder="0.0"
          />
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useNotificationStore } from '@/stores/notifications'
import { formatNumber } from '@/utils/helpers'

const walletStore = useWalletStore()
const notificationStore = useNotificationStore()

// State
const activeTab = ref('stake')
const stakeBalance = ref(0)
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
  toAddress: ''
})

const unstakeForm = ref({
  token: 'ETH',
  amount: ''
})

// Constants
const tabs = [
  { id: 'stake', label: 'Stake' },
  { id: 'borrow', label: 'Borrow' },
  { id: 'unstake', label: 'Unstake' }
]

// Computed
const maxBorrowable = computed(() => {
  const totalCollateralUSD = getTotalCollateralValueUSD()
  const ltv = Number(walletStore.config.ltv) || 0.5
  const borrowToken = walletStore.config.tokens.find(t => t.sym === borrowForm.value.token)
  const tokenPrice = borrowToken?.price || 1
  
  const max = totalCollateralUSD * ltv / tokenPrice
  return isFinite(max) ? formatNumber(max, 6) : '–'
})

const canApproveStake = computed(() => {
  return stakeForm.value.token && stakeForm.value.amount && !isApprovingStake.value
})

const canStake = computed(() => {
  return stakeForm.value.token && stakeForm.value.amount && !isStaking.value
})

const canBorrow = computed(() => {
  const amount = Number(borrowForm.value.amount)
  const max = Number((maxBorrowable.value || '0').replace(/,/g, ''))
  return borrowForm.value.token && amount > 0 && amount <= max + 1e-12 && !isBorrowing.value
})

const canUnstake = computed(() => {
  const amount = Number(unstakeForm.value.amount)
  const available = walletStore.localData.stakes[unstakeForm.value.token] || 0
  return amount > 0 && amount <= available && !isUnstaking.value
})

// Methods
function formatStakedInfo() {
  const stakes = walletStore.localData.stakes
  const entries = Object.entries(stakes).map(([token, amount]) => 
    `${token}:${formatNumber(amount, 4)}`
  )
  return entries.length ? entries.join(' | ') : '0'
}

function getTotalCollateralValueUSD() {
  let totalUSD = 0
  for (const [token, amount] of Object.entries(walletStore.localData.stakes)) {
    const tokenData = walletStore.config.tokens.find(t => t.sym === token)
    if (tokenData) {
      totalUSD += (amount || 0) * (tokenData.price || 0)
    }
  }
  return totalUSD
}

function updateMaxBorrow() {
  // Computed property handles this automatically
}

function updateUnstakeAmount() {
  const available = walletStore.localData.stakes[unstakeForm.value.token] || 0
  unstakeForm.value.amount = available.toString()
}

async function updateStakeBalance() {
  if (walletStore.isConnected) {
    stakeBalance.value = await walletStore.getBalance(stakeForm.value.token)
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
    
    // Update local data
    if (!walletStore.localData.stakes[token]) {
      walletStore.localData.stakes[token] = 0
    }
    walletStore.localData.stakes[token] += amount
    
    walletStore.persistData()
    await updateStakeBalance()
    
    notificationStore.success('Stake Successful', `Staked ${amount} ${token}`)
    
    // Reset form
    stakeForm.value.amount = ''
    
  } catch (error) {
    notificationStore.error('Stake Failed', error.message)
  } finally {
    isStaking.value = false
  }
}

async function borrow() {
  if (!canBorrow.value) return
  
  isBorrowing.value = true
  try {
    const token = borrowForm.value.token
    const amount = Number(borrowForm.value.amount)
    const toAddress = borrowForm.value.toAddress.trim() || walletStore.address
    
    // Update local data
    if (!walletStore.localData.borrows[token]) {
      walletStore.localData.borrows[token] = 0
    }
    walletStore.localData.borrows[token] += amount
    
    walletStore.persistData()
    
    notificationStore.success(
      'Borrow Successful', 
      `Borrowed ${amount} ${token} → ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`
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
    const token = unstakeForm.value.token
    const amount = Number(unstakeForm.value.amount)
    
    // Update local data
    walletStore.localData.stakes[token] -= amount
    if (walletStore.localData.stakes[token] <= 0) {
      delete walletStore.localData.stakes[token]
    }
    
    walletStore.persistData()
    await updateStakeBalance()
    
    notificationStore.success('Unstake Successful', `Unstaked ${amount} ${token}`)
    
    // Reset form
    unstakeForm.value.amount = ''
    updateUnstakeAmount()
    
  } catch (error) {
    notificationStore.error('Unstake Failed', error.message)
  } finally {
    isUnstaking.value = false
  }
}

// Watch for token changes to update balance
watch(() => stakeForm.value.token, updateStakeBalance)
watch(() => walletStore.isConnected, updateStakeBalance)
watch(() => walletStore.isConnected, () => {
  if (walletStore.isConnected && !borrowForm.value.toAddress) {
    borrowForm.value.toAddress = walletStore.address
  }
})

// Initialize
updateStakeBalance()
updateUnstakeAmount()
if (walletStore.isConnected) {
  borrowForm.value.toAddress = walletStore.address
}
</script>
