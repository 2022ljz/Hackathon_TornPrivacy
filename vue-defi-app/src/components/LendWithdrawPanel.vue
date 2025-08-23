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
      <div class="grid grid-cols-2 gap-4">
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Your balance</div>
          <div class="font-mono text-lg">{{ formatNumber(userBalance) }}</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Previously lent</div>
          <div class="font-mono text-lg">{{ formatLentInfo() }}</div>
        </div>
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
          Lend
        </button>
      </div>

      <p class="text-xs text-mixer-muted">
        * 未接入合约时，Lend/Withdraw 会使用本地 localStorage 记账用于演示。
        在右上角 Config 填写你的合约地址/ABI 后，将改为真实上链交易。
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
      <div class="grid grid-cols-2 gap-4">
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Accrued Interest (est.)</div>
          <div class="font-mono text-lg text-green-400">{{ withdrawInfo.interest }}</div>
        </div>
        <div class="stat-card">
          <div class="text-sm text-mixer-muted mb-1">Lock Period</div>
          <div class="font-mono text-lg">{{ withdrawInfo.lockTarget }}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          @click="handleWithdrawClick"
          :disabled="!canWithdraw"
          class="tornado-button-danger flex-1"
        >
          <div v-if="isWithdrawing" class="loading-spinner"></div>
          Withdraw
        </button>
      </div>

      <!-- Confirmation Modal -->
      <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeModal">
        <div class="bg-mixer-dark border border-mixer-border rounded-lg p-6 max-w-md mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4 text-white">确认提取操作</h3>
          
          <div class="space-y-3 mb-6">
            <div class="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
              <div class="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                提前提取警告
              </div>
              <div v-if="confirmationInfo.isEarlyWithdraw" class="text-sm text-yellow-300">
                您尚未满足 {{ confirmationInfo.lockDays }} 天的锁定期要求
                <br>剩余时间：{{ confirmationInfo.remainingDays }} 天
                <br><strong>利率将从 {{ confirmationInfo.promisedAPR }}% 降至 {{ confirmationInfo.baseAPR }}%</strong>
              </div>
              <div v-else class="text-sm text-green-300">
                ✅ 已满足锁定期要求，将按承诺利率 {{ confirmationInfo.promisedAPR }}% 计算
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-mixer-panel rounded p-3">
                <div class="text-mixer-muted">提取本金</div>
                <div class="font-mono text-white">{{ withdrawForm.amount }} {{ confirmationInfo.token }}</div>
              </div>
              <div class="bg-mixer-panel rounded p-3">
                <div class="text-mixer-muted">预计利息</div>
                <div class="font-mono text-green-400">{{ confirmationInfo.estimatedInterest }} {{ confirmationInfo.token }}</div>
              </div>
            </div>
            
            <div class="bg-mixer-panel rounded p-3 text-sm">
              <div class="text-mixer-muted mb-1">转入地址</div>
              <div class="font-mono text-white break-all">{{ withdrawForm.address }}</div>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button @click="closeModal" class="tornado-button-secondary flex-1">
              取消
            </button>
            <button @click="confirmWithdraw" class="tornado-button-danger flex-1">
              确认提取
            </button>
          </div>
        </div>
      </div>

      <p class="text-xs text-mixer-muted">
        * 若尚未达到指定锁定时长，将按"基础利率"计算（自动降级）。
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
const activeTab = ref('lend')
const userBalance = ref(0)
const isApproving = ref(false)
const isLending = ref(false)
const isWithdrawing = ref(false)
const showConfirmModal = ref(false)
const confirmationInfo = ref({})

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
  
  // 调试信息
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
    // 尝试部分匹配（如果用户输入的 note 被截断）
    if (note.length >= 60) {
      const matchingNotes = Object.keys(walletStore.localData.notes).filter(key => 
        key.startsWith(note) || note.startsWith(key.substring(0, note.length))
      )
      
      if (matchingNotes.length === 1) {
        const fullNote = matchingNotes[0]
        const matchedRecord = walletStore.localData.notes[fullNote]
        
        console.log('🔧 Found partial match:', { note, fullNote })
        
        // 自动补全 note
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
  const interestTime = record.interestTime // 锁定时间（秒）
  const elapsedTime = currentTime - lendTime
  
  // 始终显示承诺的利率，因为这是用户存入时的预期收益
  // 实际提取时会根据是否满足锁定期来决定使用哪个利率
  const aprUsed = record.promisedAPR
  let interestCalculation
  
  if (elapsedTime >= interestTime) {
    interestCalculation = 'Package Rate (Locked)'
  } else {
    interestCalculation = `Package Rate (${formatNumber((interestTime - elapsedTime) / 86400, 1)}d remaining)`
  }
  
  const days = elapsedTime / 86400
  
  // 按天为最小单位计算利息，不足一天按一天计算
  const daysForCalculation = Math.max(1, Math.ceil(days)) // 向上取整，最少1天
  
  // 获取用户输入的提取金额
  const withdrawAmount = Number(withdrawForm.value.amount) || record.amount
  
  // 计算总利息和对应提取金额的利息
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
         withdrawForm.value.address && withdrawInfo.value.noteStatus === 'Valid' && 
         !isWithdrawing.value
})

// Methods
function generateTransactionNote() {
  // 生成32位随机哈希值作为交易凭证
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
    
    // 生成唯一交易凭证
    const note = generateTransactionNote()
    const currentTime = now()
    const interestTime = lockDays * 24 * 60 * 60 // 转换为秒
    
    // 初始化 notes 对象如果不存在
    if (!walletStore.localData.notes) {
      walletStore.localData.notes = {}
      console.log('🔧 Initialized notes object')
    }
    
    // 保存交易记录到 note
    walletStore.localData.notes[note] = {
      token,
      amount,
      lendTime: currentTime,
      interestTime,
      lockDays,
      promisedAPR,
      baseAPR: base,
      status: 'active'
    }
    
    console.log('💾 Saving note to localData:', {
      note,
      record: walletStore.localData.notes[note],
      allNotes: Object.keys(walletStore.localData.notes)
    })
    
    walletStore.persistData()
    console.log('💿 Data persisted to localStorage')
    
    // 验证数据是否正确保存
    const savedData = JSON.parse(localStorage.getItem("mixer-local") || '{}')
    console.log('✅ Verification - localStorage content:', savedData)
    await updateBalance()
    
    // 记录到控制台
    console.log('🎯 Lend Transaction Created:', {
      note,
      token,
      amount,
      lockDays,
      promisedAPR,
      timestamp: new Date().toISOString()
    })
    
    // 创建带有复制按钮的持久通知
    notificationStore.persistentSuccess(
      'Lend Successful! 🎉',
      `Successfully lent ${amount} ${token}\nLock period: ${lockDays} days\nAPR: ${promisedAPR}%\n\n⚠️ IMPORTANT: Save your transaction note securely!\nYou need it to withdraw your funds.\n\nTransaction Note:\n${note}`,
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
    lendForm.value.amount = ''
    
  } catch (error) {
    notificationStore.error('Lend Failed', error.message)
  } finally {
    isLending.value = false
  }
}

async function handleWithdrawClick() {
  if (!canWithdraw.value) return
  
  // 获取当前记录信息
  const note = withdrawForm.value.note
  const amount = Number(withdrawForm.value.amount)
  
  if (!walletStore.localData.notes || !walletStore.localData.notes[note]) {
    notificationStore.error('Invalid Note', 'Transaction note not found or invalid')
    return
  }
  
  const record = walletStore.localData.notes[note]
  const currentTime = now()
  const lendTime = record.lendTime
  const interestTime = record.interestTime
  const elapsedTime = currentTime - lendTime
  
  const isEarlyWithdraw = elapsedTime < interestTime
  const days = elapsedTime / 86400
  const remainingDays = Math.max(0, (interestTime - elapsedTime) / 86400)
  
  // 计算利息预估
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
  
  // 设置确认信息
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
  
  showConfirmModal.value = true
}

function closeModal() {
  showConfirmModal.value = false
}

async function confirmWithdraw() {
  showConfirmModal.value = false
  await withdraw()
}

async function withdraw() {
  if (!canWithdraw.value) return
  
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
    
    // 更新或删除记录
    if (amount === record.amount) {
      // 全额提取，删除记录
      delete walletStore.localData.notes[note]
    } else {
      // 部分提取，更新金额
      record.amount -= amount
    }
    
    walletStore.persistData()
    await updateBalance()
    
    notificationStore.success(
      'Withdraw Successful',
      `Successfully transferred:\n• ${amount} ${record.token} (principal)\n• ${formatNumber(withdrawInterest, 6)} ${record.token} (interest)\n\nTo wallet: ${withdrawForm.value.address}\n\nRate used: ${rateType} (${aprUsed}%)\nTime elapsed: ${formatNumber(days, 2)} days\nWithdraw ratio: ${formatNumber(withdrawRatio * 100, 2)}%`
    )
    
    // Reset form
    withdrawForm.value.note = ''
    withdrawForm.value.amount = ''
    withdrawForm.value.address = ''
    
  } catch (error) {
    notificationStore.error('Withdraw Failed', error.message)
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
