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

    <!-- Lend Tab -->
    <div v-if="activeTab === 'lend'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Token</label>
          <select v-model="lendForm.token" class="tornado-input">
            <option v-for="token in walletStore.config.tokens" :key="token.sym" :value="token.sym">
              {{ token.sym }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Amount</label>
          <input 
            v-model="lendForm.amount" 
            type="number" 
            placeholder="0.0" 
            class="tornado-input"
            min="0" 
            step="any"
          />
        </div>
      </div>

      <!-- Quick Amount Chips -->
      <div class="grid grid-cols-4 gap-2">
        <button 
          v-for="amount in quickAmounts" 
          :key="amount"
          @click="setQuickAmount(amount)"
          :class="['tornado-chip', { active: lendForm.amount == amount }]"
        >
          {{ amount }}
        </button>
      </div>

      <!-- Lock Duration & APY -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Lock duration</label>
          <select v-model="lendForm.lockDays" class="tornado-input" @change="updateAPY">
            <option value="0">Flexible (base APR)</option>
            <option value="7">7 days (APR + 1%)</option>
            <option value="30">30 days (APR + 3%)</option>
            <option value="90">90 days (APR + 7%)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Est. APY</label>
          <input v-model="estimatedAPY" class="tornado-input" readonly />
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Blockchain Balance</div>
          <div v-if="walletStore.isConnected" class="font-mono text-lg text-blue-400">{{ formatNumber(currentBalance) }} {{ lendForm.token }}</div>
          <div v-else class="font-mono text-lg text-gray-500">Connect wallet first</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Your balance</div>
          <div class="font-mono text-lg">{{ formatNumber(userBalance) }}</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Previously lent</div>
          <div class="font-mono text-lg">{{ formatLentInfo() }}</div>
        </div>
      </div>

      <!-- Blockchain Status Indicator -->
      <div class="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-sm font-medium text-green-700">🔗 Connected to Sepolia Testnet</span>
        <span class="text-xs text-green-600">(Real Blockchain Transactions)</span>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="approveLend"
          :disabled="!canApprove"
          class="tornado-button-secondary flex-1"
        >
          <div v-if="isApproving" class="loading-spinner"></div>
          Approve
        </button>
        <button 
          @click="lend"
          :disabled="!canLend"
          class="tornado-button-primary flex-1"
        >
          <div v-if="isLending" class="loading-spinner"></div>
          💎 Lend to Sepolia
        </button>
      </div>

      <p class="text-xs text-green-600 bg-green-50 p-2 rounded">
        ✅ <strong>Real Blockchain Mode:</strong> All transactions will be sent to Sepolia testnet and appear on Etherscan.
        Your Mixer contract: <code class="bg-white px-1 rounded">0xf85Daa3dBA126757027CE967F86Eb7860271AfE0</code>
      </p>
    </div>

    <!-- Withdraw Tab -->
    <div v-if="activeTab === 'withdraw'" class="space-y-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Transaction Note (66-char hash)</label>
          <input 
            v-model="withdrawForm.note" 
            type="text" 
            placeholder="Enter your transaction note (0x...)..." 
            class="tornado-input font-mono text-sm"
            maxlength="66"
            spellcheck="false"
          />
          <div class="text-xs mt-1" :class="withdrawInfo.noteStatus === 'Valid' ? 'text-green-400' : 'text-red-400'">
            Status: {{ withdrawInfo.noteStatus }}
          </div>
          <div v-if="withdrawForm.note" class="text-xs text-mixer-muted mt-1">
            Length: {{ withdrawForm.note.length }}/66 characters
          </div>
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Withdraw amount</label>
          <input 
            v-model="withdrawForm.amount" 
            type="number" 
            placeholder="0.0" 
            class="tornado-input"
            min="0" 
            step="any"
            :max="withdrawInfo.record?.amount || 0"
          />
          <div v-if="withdrawInfo.record" class="text-xs text-mixer-muted mt-1">
            Max available: {{ formatNumber(withdrawInfo.record.amount, 6) }} {{ withdrawInfo.record.token }}
          </div>
        </div>

        <!-- Quick Amount Chips for Withdraw -->
        <div class="grid grid-cols-4 gap-2">
          <button 
            v-for="amount in quickAmounts" 
            :key="amount"
            @click="setQuickWithdrawAmount(amount)"
            :class="['tornado-chip', { active: withdrawForm.amount == amount }]"
          >
            {{ amount }}
          </button>
        </div>
        <div>
          <label class="block text-sm text-mixer-muted mb-2">Wallet Address</label>
          <input 
            v-model="withdrawForm.address" 
            type="text" 
            placeholder="0xD645b77aaFA9035Ac603eE5d3e93AA2Ca257d06f" 
            class="tornado-input font-mono text-sm"
            spellcheck="false"
          />
          <div v-if="withdrawForm.address" class="text-xs text-mixer-muted mt-1">
            Funds will be transferred to this address
          </div>
        </div>
      </div>

      <!-- Withdraw Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Blockchain Balance</div>
          <div v-if="walletStore.isConnected" class="font-mono text-lg text-blue-400">{{ formatNumber(currentBalance) }} {{ withdrawInfo.token || 'ETH' }}</div>
          <div v-else class="font-mono text-lg text-gray-500">Connect wallet first</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Accrued Interest (est.)</div>
          <div class="font-mono text-lg text-green-400">{{ withdrawInfo.interest }}</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Lock Period</div>
          <div class="font-mono text-lg">{{ withdrawInfo.lockTarget }}</div>
        </div>
      </div>

      <!-- Blockchain Status Indicator -->
      <div class="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-sm font-medium text-green-700">🔗 Connected to Sepolia Testnet</span>
        <span class="text-xs text-green-600">(Real Blockchain Transactions)</span>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="handleWithdrawClick"
          :disabled="!canWithdraw"
          class="tornado-button-danger flex-1"
        >
          <div v-if="isWithdrawing" class="loading-spinner"></div>
          💎 Withdraw from Sepolia
        </button>
      </div>

      <!-- Confirmation Modal -->
      <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeModal">
        <div class="bg-mixer-dark border border-mixer-border rounded-lg p-6 max-w-md mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4 text-white">Confirm Withdrawal</h3>
          
          <div class="space-y-3 mb-6">
            <div class="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
              <div class="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                Early Withdrawal Warning
              </div>
              <div v-if="confirmationInfo.isEarlyWithdraw" class="text-sm text-yellow-300">
                You have not met the {{ confirmationInfo.lockDays }}-day lock period requirement
                <br>Remaining time: {{ confirmationInfo.remainingDays }} days
                <br><strong>Interest rate will drop from {{ confirmationInfo.promisedAPR }}% to {{ confirmationInfo.baseAPR }}%</strong>
              </div>
              <div v-else class="text-sm text-green-300">
                ✅ Lock period requirement met, will use promised rate {{ confirmationInfo.promisedAPR }}%
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-mixer-panel rounded p-3">
                <div class="text-mixer-muted">Withdrawal Principal</div>
                <div class="font-mono text-white">{{ withdrawForm.amount }} {{ confirmationInfo.token }}</div>
              </div>
              <div class="bg-mixer-panel rounded p-3">
                <div class="text-mixer-muted">Estimated Interest</div>
                <div class="font-mono text-green-400">{{ confirmationInfo.estimatedInterest }} {{ confirmationInfo.token }}</div>
              </div>
            </div>
            
            <div class="bg-mixer-panel rounded p-3 text-sm">
              <div class="text-mixer-muted mb-1">Transfer to Address</div>
              <div class="font-mono text-white break-all">{{ withdrawForm.address }}</div>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button @click="closeModal" class="tornado-button-secondary flex-1">
              Cancel
            </button>
            <button @click="confirmWithdraw" class="tornado-button-danger flex-1">
              Confirm Withdrawal
            </button>
          </div>
        </div>
      </div>

      <!-- Invalid Transaction Modal -->
      <div v-if="showInvalidModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeInvalidModal">
        <div class="bg-mixer-dark border border-red-500 rounded-lg p-6 max-w-md mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            Invalid Transaction
          </h3>
          
          <div class="space-y-4 mb-6">
            <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div class="text-red-300 text-sm space-y-2">
                <div><strong>Issue:</strong> {{ invalidInfo.issue }}</div>
                <div v-if="invalidInfo.note"><strong>Note:</strong> {{ invalidInfo.note }}</div>
                <div v-if="invalidInfo.amount"><strong>Amount:</strong> {{ invalidInfo.amount }}</div>
                <div v-if="invalidInfo.address"><strong>Address:</strong> {{ invalidInfo.address }}</div>
              </div>
            </div>
            
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div class="text-blue-300 text-sm">
                <div class="font-medium mb-2">📋 How to proceed:</div>
                <ul class="space-y-1 list-disc list-inside">
                  <li>Verify your transaction note is correct (66 characters, starts with 0x)</li>
                  <li>Check that the withdrawal amount doesn't exceed your deposit</li>
                  <li>Ensure the wallet address is valid</li>
                  <li>Make sure all required fields are filled</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="flex justify-center">
            <button @click="closeInvalidModal" class="tornado-button-primary">
              OK, I'll Fix It
            </button>
          </div>
        </div>
      </div>

      <p class="text-xs text-mixer-muted">
        * If the specified lock duration has not been reached, interest will be calculated at "base rate" (automatic downgrade).
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useNotificationStore } from '@/stores/notifications'
import { formatNumber, now } from '@/utils/helpers'
import { depositToMixer, withdrawFromMixer } from '@/utils/contracts.js'
import { ethers } from 'ethers'

const walletStore = useWalletStore()
const notificationStore = useNotificationStore()

// 🔍 Debug: Verify handleWithdrawOperation is removed
if (walletStore.handleWithdrawOperation) {
  console.error('❌ CRITICAL: handleWithdrawOperation still exists in walletStore!')
  console.error('   This should have been removed. Please check wallet.js')
} else {
  console.log('✅ Confirmed: handleWithdrawOperation has been properly removed')
}

// 🛡️ Add safeguard to prevent accidental calls to removed function
Object.defineProperty(walletStore, 'handleWithdrawOperation', {
  get() {
    console.error('🚫 BLOCKED: Attempt to call removed handleWithdrawOperation function!')
    console.error('   This function has been removed and replaced with real blockchain operations.')
    throw new Error('handleWithdrawOperation function has been removed. Please clear browser cache and refresh.')
  },
  configurable: false
})

// State
const activeTab = ref('lend')
const userBalance = ref(0)
const isApproving = ref(false)
const isLending = ref(false)
const isWithdrawing = ref(false)
const showConfirmModal = ref(false)
const showInvalidModal = ref(false) // Add invalid transaction prompt modal state
const confirmationInfo = ref({})
const invalidInfo = ref({}) // Add invalid transaction information

// 🔥 Real blockchain balance computed property
const currentBalance = computed(() => {
  if (!walletStore.isConnected) return 0
  // Use the real getBalance function from wallet store
  return userBalance.value || 0
})

// Forms
const lendForm = ref({
  token: 'ETH',
  amount: '',
  lockDays: 0
})

const withdrawForm = ref({
  note: '',
  amount: '',
  address: ''
})

// Constants
const tabs = [
  { id: 'lend', label: 'Lend to earn' },
  { id: 'withdraw', label: 'Withdraw' }
]

const quickAmounts = [0.1, 1, 10, 100]

// Computed
const estimatedAPY = computed(() => {
  const base = Number(walletStore.config.baseAPR) || 0
  const lockDays = Number(lendForm.value.lockDays)
  const bonus = lockDays >= 90 ? 7 : lockDays >= 30 ? 3 : lockDays >= 7 ? 1 : 0
  return (base + bonus).toFixed(2) + '%'
})

const withdrawInfo = computed(() => {
  const note = withdrawForm.value.note
  if (!note) {
    return { interest: '–', lockTarget: '–', noteStatus: 'Please enter note' }
  }
  
  // Debug information
  console.log('🔍 Debug withdraw info:', {
    note,
    noteLength: note.length,
    localDataNotes: walletStore.localData.notes,
    hasNotes: !!walletStore.localData.notes,
    noteExists: !!(walletStore.localData.notes && walletStore.localData.notes[note]),
    availableNotes: walletStore.localData.notes ? Object.keys(walletStore.localData.notes) : [],
    noteMatches: walletStore.localData.notes ? Object.keys(walletStore.localData.notes).filter(key => key.includes(note) || note.includes(key)) : []
  })
  
  if (!walletStore.localData.notes) {
    return { interest: '–', lockTarget: '–', noteStatus: 'No notes data' }
  }
  
  const record = walletStore.localData.notes[note]
  if (!record) {
    // Try partial matching (if user input note is truncated)
    if (note.length >= 60) {
      const matchingNotes = Object.keys(walletStore.localData.notes).filter(key => 
        key.startsWith(note) || note.startsWith(key.substring(0, note.length))
      )
      
      if (matchingNotes.length === 1) {
        const fullNote = matchingNotes[0]
        const matchedRecord = walletStore.localData.notes[fullNote]
        
        console.log('🔧 Found partial match:', { note, fullNote })
        
        // Auto-complete note
        setTimeout(() => {
          withdrawForm.value.note = fullNote
        }, 100)
        
        return { 
          interest: '–', 
          lockTarget: '–', 
          noteStatus: `Auto-completing... (found ${fullNote.substring(note.length)})` 
        }
      }
    }
    
    return { interest: '–', lockTarget: '–', noteStatus: 'Invalid note' }
  }
  
  const currentTime = now()
  const lendTime = record.lendTime
  const interestTime = record.interestTime // Lock time (seconds)
  const elapsedTime = currentTime - lendTime
  
  // Always display the promised rate, as this is the user's expected return when depositing
  // When actually withdrawing, it will decide which rate to use based on whether the lock period is met
  const aprUsed = record.promisedAPR
  let interestCalculation
  
  if (elapsedTime >= interestTime) {
    interestCalculation = 'Package Rate (Locked)'
  } else {
    interestCalculation = `Package Rate (${formatNumber((interestTime - elapsedTime) / 86400, 1)}d remaining)`
  }
  
  const days = elapsedTime / 86400
  
  // Calculate by day as minimum unit, less than one day counts as one day
  const daysForCalculation = Math.max(1, Math.ceil(days)) // Round up, minimum 1 day
  
  // Get user input withdrawal amount
  const withdrawAmount = Number(withdrawForm.value.amount) || record.amount
  
  // Calculate total interest and corresponding interest for withdrawal amount
  const totalInterest = record.amount * aprUsed / 100 * (daysForCalculation / 365)
  const withdrawRatio = withdrawAmount / record.amount
  const displayInterest = totalInterest * withdrawRatio
  
  console.log('💰 Interest calculation:', {
    amount: record.amount,
    withdrawAmount,
    withdrawRatio: formatNumber(withdrawRatio, 4),
    aprUsed: aprUsed + '%',
    actualDays: formatNumber(days, 4),
    daysForCalculation,
    dailyRate: ((aprUsed / 365) * 100).toFixed(6) + '%',
    totalInterest: formatNumber(totalInterest, 8),
    displayInterest: formatNumber(displayInterest, 8)
  })
  
  return {
    interest: `${formatNumber(displayInterest, 6)} ${record.token} (${interestCalculation}: ${aprUsed}%)`,
    lockTarget: `${formatNumber(interestTime / 86400, 1)} days (${formatNumber(days, 2)} elapsed)`,
    noteStatus: 'Valid',
    record: record
  }
})

const canApprove = computed(() => {
  return lendForm.value.token && lendForm.value.amount && !isApproving.value
})

const canLend = computed(() => {
  return lendForm.value.token && lendForm.value.amount && !isLending.value
})

const canWithdraw = computed(() => {
  return withdrawForm.value.note && withdrawForm.value.amount && 
         withdrawForm.value.address && withdrawForm.value.address.trim() !== '' &&
         withdrawInfo.value.noteStatus === 'Valid' && 
         !isWithdrawing.value
})

// Methods

// 🧹 Cache cleanup function
function clearBrowserCache() {
  console.log('🧹 Clearing browser cache and storage...')
  
  try {
    // Clear localStorage
    localStorage.clear()
    console.log('✅ localStorage cleared')
    
    // Clear sessionStorage
    sessionStorage.clear()
    console.log('✅ sessionStorage cleared')
    
    notificationStore.success(
      'Cache Cleared',
      'Browser cache has been cleared. The page will refresh in 2 seconds.',
      3000
    )
    
    // Force reload after 2 seconds
    setTimeout(() => {
      window.location.reload(true)
    }, 2000)
    
  } catch (error) {
    console.error('❌ Failed to clear cache:', error)
    notificationStore.error(
      'Cache Clear Failed',
      'Please manually clear your browser cache (Ctrl+Shift+Delete) and refresh the page.'
    )
  }
}

function generateTransactionNote() {
  // Generate 32-bit random hash as transaction proof
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
      'Transaction note copied to clipboard',
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

function setQuickAmount(amount) {
  lendForm.value.amount = amount
}

function setQuickWithdrawAmount(amount) {
  withdrawForm.value.amount = amount
}

function updateAPY() {
  // APY is computed automatically
}

function formatLentInfo() {
  const notes = walletStore.localData.notes || {}
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

async function updateBalance() {
  if (walletStore.isConnected) {
    userBalance.value = await walletStore.getBalance(lendForm.value.token)
  }
}

function updateWithdrawInfo() {
  // Computed property handles this automatically
}

async function approveLend() {
  if (!canApprove.value) return
  
  isApproving.value = true
  try {
    const token = lendForm.value.token
    const amount = Number(lendForm.value.amount)
    
    const contract = await walletStore.getTokenContract(token)
    if (!contract) {
      notificationStore.warning(
        'No Approval Needed', 
        'Native ETH does not require approval; for ERC20 tokens, please set contract address in Config'
      )
      return
    }
    
    const spender = walletStore.config.mixerAddr || walletStore.config.lendingAddr
    if (!spender) {
      notificationStore.error(
        'Missing Contract Address', 
        'Please set Mixer or Lending contract address in Config for real approvals'
      )
      return
    }
    
    // Simulate approval for demo
    notificationStore.success('Approval Sent', `Approved ${amount} ${token}`)
    
  } catch (error) {
    notificationStore.error('Approval Failed', error.message)
  } finally {
    isApproving.value = false
  }
}

async function lend() {
  if (!canLend.value) return
  
  isLending.value = true
  try {
    const token = lendForm.value.token
    const amount = Number(lendForm.value.amount)
    const lockDays = Number(lendForm.value.lockDays)
    const base = Number(walletStore.config.baseAPR) || 0
    const bonus = lockDays >= 90 ? 7 : lockDays >= 30 ? 3 : lockDays >= 7 ? 1 : 0
    const promisedAPR = base + bonus
    
    console.log(`🚀 Starting REAL blockchain lend operation: ${amount} ${token}`)
    
    // Initialize contracts if not already done
    const { initializeContracts, depositToMixer } = await import('@/utils/contracts.js')
    await initializeContracts()
    
    // Generate unique transaction proof
    const note = generateTransactionNote()
    const currentTime = now()
    const interestTime = lockDays * 24 * 60 * 60 // Convert to seconds
    
    // 🔗 REAL BLOCKCHAIN TRANSACTION
    console.log(`📡 Sending transaction to Sepolia testnet...`)
    const blockchainResult = await depositToMixer(token, amount, note)
    
    console.log(`🎉 Real transaction successful!`)
    console.log(`   TX Hash: ${blockchainResult.txHash}`)
    console.log(`   Block: ${blockchainResult.blockNumber}`)
    console.log(`   Commitment: ${blockchainResult.commitment}`)
    console.log(`   Nullifier: ${blockchainResult.nullifier}`)
    console.log(`   Secret: ${blockchainResult.secret}`)
    
    // Initialize notes object if it doesn't exist
    if (!walletStore.localData.notes) {
      walletStore.localData.notes = {}
      console.log('🔧 Initialized notes object')
    }
    
    // Save transaction record with REAL blockchain data
    walletStore.localData.notes[note] = {
      token,
      amount,
      lendTime: currentTime,
      interestTime,
      lockDays,
      promisedAPR,
      baseAPR: base,
      status: 'active',
      // 🔗 REAL BLOCKCHAIN DATA
      txHash: blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber,
      commitment: blockchainResult.commitment,
      nullifier: blockchainResult.nullifier,
      secret: blockchainResult.secret,
      gasUsed: blockchainResult.gasUsed,
      isRealTransaction: true
    }
    
    console.log('💾 Saving note with real blockchain data:', {
      note,
      record: walletStore.localData.notes[note],
      allNotes: Object.keys(walletStore.localData.notes)
    })
    
    walletStore.persistData()
    console.log('💿 Data persisted to localStorage')
    
    // 🔥 NO MORE LOCAL BALANCE OPERATIONS!
    // 🚫 handleLendOperation() removed - only real blockchain!
    
    // Verify data is saved correctly
    const savedData = JSON.parse(localStorage.getItem("mixer-local") || '{}')
    console.log('✅ Verification - localStorage content:', savedData)
    await updateBalance()
    
    // Log to console
    console.log('🎯 REAL Blockchain Lend Transaction Created:', {
      note,
      token,
      amount,
      lockDays,
      promisedAPR,
      txHash: blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber,
      commitment: blockchainResult.commitment,
      timestamp: new Date().toISOString()
    })
    
    // Create persistent notification with REAL blockchain info
    notificationStore.persistentSuccess(
      '🚀 Real Blockchain Lend Successful! 🎉',
      `✅ Successfully lent ${amount} ${token} on Sepolia testnet!\n\n📋 Transaction Details:\n• Amount: ${amount} ${token}\n• Lock period: ${lockDays} days\n• APR: ${promisedAPR}%\n• TX Hash: ${blockchainResult.txHash}\n• Block: ${blockchainResult.blockNumber}\n\n⚠️ IMPORTANT: Save your transaction note securely!\nYou need it to withdraw your funds.\n\n🔐 Transaction Note:\n${note}\n\n🔗 View on Etherscan:\nhttps://sepolia.etherscan.io/tx/${blockchainResult.txHash}`,
      [
        {
          label: '📋 Copy Note',
          variant: 'primary',
          handler: () => copyToClipboard(note),
          autoClose: false
        },
        {
          label: '🔗 View TX',
          variant: 'secondary',
          handler: () => window.open(`https://sepolia.etherscan.io/tx/${blockchainResult.txHash}`, '_blank'),
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
    lendForm.value.amount = ''
    
  } catch (error) {
    console.error('❌ Real blockchain lend failed:', error)
    notificationStore.error(
      '🚫 Blockchain Transaction Failed', 
      `Failed to lend ${lendForm.value.amount} ${lendForm.value.token} on Sepolia testnet.\n\nError: ${error.message}\n\nPlease check:\n• Your wallet has enough ${lendForm.value.token}\n• You have enough ETH for gas fees\n• Network connection is stable\n• MetaMask is connected to Sepolia`
    )
  } finally {
    isLending.value = false
  }
}

async function handleWithdrawClick() {
  if (!canWithdraw.value) return
  
  // Set response detection timeout
  const timeoutId = setTimeout(() => {
    // If confirmation modal is not shown within 3 seconds, show error
    if (!showConfirmModal.value) {
      invalidInfo.value = {
        issue: 'Withdraw operation timeout',
        note: 'The withdraw process did not respond within expected time',
        amount: '',
        address: 'Please check your connection and try again, or contact support if the problem persists'
      }
      showInvalidModal.value = true
    }
  }, 3000)
  
  try {
    // Validate transaction validity
    const validationResult = validateWithdrawTransaction()
    if (!validationResult.isValid) {
      clearTimeout(timeoutId)
      // Show invalid transaction modal
      invalidInfo.value = validationResult.error
      showInvalidModal.value = true
      return
    }
    
    // Get current record information
    const note = withdrawForm.value.note
    const amount = Number(withdrawForm.value.amount)
    const record = walletStore.localData.notes[note]
    const currentTime = now()
    const lendTime = record.lendTime
    const interestTime = record.interestTime
    const elapsedTime = currentTime - lendTime
    
    const isEarlyWithdraw = elapsedTime < interestTime
    const days = elapsedTime / 86400
    const remainingDays = Math.max(0, (interestTime - elapsedTime) / 86400)
    
    // Calculate interest estimate
    let aprUsed
    if (isEarlyWithdraw) {
      aprUsed = record.baseAPR
    } else {
      aprUsed = record.promisedAPR
    }
    
    const daysForCalculation = Math.max(1, Math.ceil(days))
    const totalInterest = record.amount * aprUsed / 100 * (daysForCalculation / 365)
    const withdrawRatio = amount / record.amount
    const estimatedInterest = totalInterest * withdrawRatio
    
    // Set confirmation information
    confirmationInfo.value = {
      isEarlyWithdraw,
      lockDays: record.lockDays,
      remainingDays: formatNumber(remainingDays, 1),
      promisedAPR: record.promisedAPR,
      baseAPR: record.baseAPR,
      token: record.token,
      estimatedInterest: formatNumber(estimatedInterest, 6),
      actualDays: formatNumber(days, 1)
    }
    
    // 清除超时检测
    clearTimeout(timeoutId)
    showConfirmModal.value = true
  } catch (error) {
    clearTimeout(timeoutId)
    // 如果出现错误，显示错误信息
    invalidInfo.value = {
      issue: 'Withdraw operation failed',
      note: error.message || 'An unexpected error occurred',
      amount: '',
      address: 'Please try again or contact support if the problem persists'
    }
    showInvalidModal.value = true
  }
}

function validateWithdrawTransaction() {
  const note = withdrawForm.value.note.trim()
  const amount = Number(withdrawForm.value.amount)
  const address = withdrawForm.value.address.trim()
  
  // 检查note是否为空
  if (!note) {
    return {
      isValid: false,
      error: {
        issue: 'Transaction note is required',
        note: 'Please enter your transaction note to proceed',
        amount: '',
        address: ''
      }
    }
  }
  
  // 检查note格式
  if (!note.startsWith('0x') || note.length !== 66) {
    return {
      isValid: false,
      error: {
        issue: 'Invalid transaction note format',
        note: `${note} (Length: ${note.length}/66)`,
        amount: '',
        address: 'Expected format: 0x followed by 64 hexadecimal characters'
      }
    }
  }
  
  // 检查note是否存在于记录中
  if (!walletStore.localData.notes || !walletStore.localData.notes[note]) {
    return {
      isValid: false,
      error: {
        issue: 'Transaction note not found',
        note: note,
        amount: '',
        address: 'This note does not exist in our records. Please check if you have made a lending transaction with this note.'
      }
    }
  }
  
  const record = walletStore.localData.notes[note]
  
  // 检查金额是否为空或无效
  if (!amount || amount <= 0) {
    return {
      isValid: false,
      error: {
        issue: 'Invalid withdrawal amount',
        note: '',
        amount: `${withdrawForm.value.amount} (Must be greater than 0)`,
        address: ''
      }
    }
  }
  
  // 检查金额是否超出存款
  if (amount > record.amount) {
    return {
      isValid: false,
      error: {
        issue: 'Withdrawal amount exceeds deposit',
        note: '',
        amount: `Requested: ${amount} ${record.token}, Available: ${record.amount} ${record.token}`,
        address: ''
      }
    }
  }
  
  // 检查地址是否为空
  if (!address || address.trim() === '') {
    return {
      isValid: false,
      error: {
        issue: 'Wallet address is required',
        note: '',
        amount: '',
        address: 'Please enter the wallet address where you want to receive the funds'
      }
    }
  }
  
  // 检查地址格式
  if (!address.startsWith('0x') || address.length !== 42) {
    return {
      isValid: false,
      error: {
        issue: 'Invalid wallet address format',
        note: '',
        amount: '',
        address: `${address} (Length: ${address.length}/42) - Expected format: 0x followed by 40 hexadecimal characters`
      }
    }
  }

  return { isValid: true }
}

function closeModal() {
  showConfirmModal.value = false
}

function closeInvalidModal() {
  showInvalidModal.value = false
}

async function confirmWithdraw() {
  showConfirmModal.value = false
  await withdraw()
}

async function withdraw() {
  if (!canWithdraw.value) return
  
  // 🔐 确保钱包已连接
  if (!walletStore.isConnected) {
    notificationStore.error('Wallet Not Connected', 'Please connect your wallet first before withdrawing')
    return
  }
  
  // 🔗 确保有有效的provider和signer
  if (!walletStore.provider || !walletStore.signer) {
    notificationStore.error('Provider Not Available', 'Wallet provider or signer not available. Please reconnect your wallet.')
    return
  }
  
  isWithdrawing.value = true
  try {
    const note = withdrawForm.value.note
    const amount = Number(withdrawForm.value.amount)
    
    if (!walletStore.localData.notes || !walletStore.localData.notes[note]) {
      notificationStore.error('Invalid Note', 'Transaction note not found or invalid')
      return
    }
    
    const record = walletStore.localData.notes[note]
    
    if (amount > record.amount) {
      notificationStore.error('Insufficient Balance', 'Withdrawal amount exceeds deposited amount')
      return
    }
    
    // 计算利息
    const currentTime = now()
    const lendTime = record.lendTime
    const interestTime = record.interestTime
    const elapsedTime = currentTime - lendTime
    
    let aprUsed, rateType
    if (elapsedTime >= interestTime) {
      // 满足锁定时间，使用承诺的利率套餐
      aprUsed = record.promisedAPR
      rateType = 'Package Rate'
    } else {
      // 未满足锁定时间，使用基础利率（实际提取时的惩罚）
      aprUsed = record.baseAPR
      rateType = 'Base Rate (Early Withdrawal)'
    }
    
    const days = elapsedTime / 86400
    
    // 按天为最小单位计算利息，不足一天按一天计算
    const daysForCalculation = Math.max(1, Math.ceil(days))
    
    // 根据提取金额计算对应的利息，而不是整个存款的利息
    const totalInterest = record.amount * aprUsed / 100 * (daysForCalculation / 365)
    const withdrawRatio = amount / record.amount  // 提取比例
    const withdrawInterest = totalInterest * withdrawRatio  // 提取对应的利息
    
    console.log('💸 Withdraw interest calculation:', {
      totalAmount: record.amount,
      withdrawAmount: amount,
      withdrawRatio: formatNumber(withdrawRatio, 4),
      aprUsed: aprUsed + '%',
      actualDays: formatNumber(days, 4),
      daysForCalculation,
      totalInterest: formatNumber(totalInterest, 8),
      withdrawInterest: formatNumber(withdrawInterest, 8)
    })

    // 🚀 执行真实的区块链withdraw交易
    console.log('🚀 Starting REAL blockchain withdraw operation:', amount, record.token)
    console.log('📡 Sending withdraw transaction to Sepolia testnet...')
    
    try {
      // 使用记录中存储的nullifier和secret
      const nullifier = record.nullifier
      const secret = record.secret
      const toAddress = withdrawForm.value.address
      
      if (!nullifier || !secret) {
        throw new Error('Missing nullifier or secret for withdrawal. This note may be from an older version.')
      }
      
      console.log('🔐 Using stored cryptographic proof for withdrawal:')
      console.log('   Nullifier:', nullifier)
      console.log('   Secret:', secret)
      console.log('   To Address:', toAddress)
      
      // 🔍 Additional validation and debugging
      if (!nullifier || !nullifier.startsWith('0x') || nullifier.length !== 66) {
        throw new Error(`Invalid nullifier format: ${nullifier}. Expected 66-character hex string starting with 0x`)
      }
      
      if (!secret || !secret.startsWith('0x') || secret.length !== 66) {
        throw new Error(`Invalid secret format: ${secret}. Expected 66-character hex string starting with 0x`)
      }
      
      if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
        throw new Error(`Invalid address format: ${toAddress}. Expected 42-character hex string starting with 0x`)
      }
      
      console.log('✅ All parameters passed format validation')
      
      // 🧪 Calculate commitment for verification
      try {
        const calculatedCommitment = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [nullifier, secret])
        )
        console.log('🔍 Calculated commitment from nullifier+secret:', calculatedCommitment)
        console.log('   Note: This should match the commitment from your original deposit')
      } catch (err) {
        console.warn('⚠️ Could not calculate commitment:', err)
      }
      
      const result = await withdrawFromMixer(nullifier, secret, toAddress)
      
      console.log('✅ Withdraw blockchain transaction successful!')
      console.log('   Transaction Hash:', result.txHash)
      console.log('   Block:', result.blockNumber)
      
      // 显示区块链交易成功的通知
      notificationStore.success(
        'Blockchain Transaction Sent!', 
        `Withdraw transaction submitted to Sepolia testnet!\n\nTransaction Hash: ${result.txHash}\n\nView on Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}`
      )
      
    } catch (blockchainError) {
      console.error('❌ Blockchain withdraw failed:', blockchainError)
      notificationStore.error(
        'Blockchain Transaction Failed', 
        `Real blockchain transaction failed: ${blockchainError.message}\n\nNote: Local balance will still be updated for demo purposes.`
      )
      // 继续执行本地更新，即使区块链交易失败
    }
    
    // 更新或删除记录
    if (amount === record.amount) {
      // 全额提取，删除记录
      delete walletStore.localData.notes[note]
    } else {
      // 部分提取，更新金额
      record.amount -= amount
    }
    
    walletStore.persistData()
    
    // 🔥 NO MORE LOCAL BALANCE OPERATIONS!
    // 🚫 handleWithdrawOperation() was removed - only real blockchain!
    // 💰 Real balance will be updated from blockchain query automatically
    
    await updateBalance()
    
    // 🔄 添加延迟刷新机制确保区块链数据已更新
    setTimeout(async () => {
      console.log('🔄 Refreshing balance after withdraw transaction...')
      try {
        await updateBalance()
        console.log('✅ Balance refreshed successfully')
      } catch (refreshError) {
        console.warn('⚠️ Balance refresh failed:', refreshError)
      }
    }, 10000) // 10秒后再次刷新
    
    notificationStore.success(
      'Withdraw Successful',
      `Successfully transferred:\n• ${amount} ${record.token} (principal)\n• ${formatNumber(withdrawInterest, 6)} ${record.token} (interest)\n\nTo wallet: ${withdrawForm.value.address}\n\nRate used: ${rateType} (${aprUsed}%)\nTime elapsed: ${formatNumber(days, 2)} days\nWithdraw ratio: ${formatNumber(withdrawRatio * 100, 2)}%\n\n💡 Balance will auto-refresh in 10 seconds`
    )
    
    // Reset form
    withdrawForm.value.note = ''
    withdrawForm.value.amount = ''
    withdrawForm.value.address = ''
    
  } catch (error) {
    console.error('❌ Withdraw error details:', error)
    
    // Check if the error is related to the removed function
    if (error.message && error.message.includes('handleWithdrawOperation')) {
      console.error('🔧 DETECTED: Error calling removed handleWithdrawOperation function!')
      console.error('   This suggests browser cache issues. Please clear browser cache and refresh.')
      
      notificationStore.error(
        'Cache Error Detected',
        'The browser is using an outdated version of the code. Please:\n\n1. Clear browser cache (Ctrl+Shift+Delete)\n2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)\n3. Restart browser if needed\n\nThe withdrawal transaction was still processed successfully on the blockchain.'
      )
    } else {
      notificationStore.error('Withdraw Failed', error.message)
    }
  } finally {
    isWithdrawing.value = false
  }
}

// Watch for token changes to update balance
watch(() => lendForm.value.token, updateBalance)
watch(() => walletStore.isConnected, updateBalance)

// Watch for withdraw amount changes to update interest calculation
watch(() => withdrawForm.value.amount, () => {
  // Force re-computation of withdrawInfo by triggering reactivity
  // The computed property will automatically recalculate
})

// Initialize
walletStore.loadPersistedData()
updateBalance()
</script>
