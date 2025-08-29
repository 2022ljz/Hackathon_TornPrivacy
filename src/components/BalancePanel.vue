<template>
  <div class="tornado-panel animate-slide-up">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-green-400">💰 Account Balance</h2>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full" :class="walletStore.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'"></div>
        <span class="text-sm text-gray-400">
          {{ walletStore.isConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- Balance Cards -->
    <div v-if="walletStore.isConnected" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div 
        v-for="token in walletStore.config.tokens" 
        :key="token.sym"
        class="balance-card"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="token-symbol">{{ token.sym }}</div>
          <div class="token-icon">
            {{ getTokenIcon(token.sym) }}
          </div>
        </div>
        
        <div class="balance-amount">
          {{ displayBalance(token.sym) }}
        </div>

        <div class="balance-usd">
          {{ displayUSD(token.sym, token.price) }}
        </div>
        
        <!-- Balance Change Indicator -->
        <div 
          v-if="(typeof chainBalances[token.sym] === 'number') && balanceChanges[token.sym]" 
          class="balance-change"
          :class="balanceChanges[token.sym].type"
        >
          {{ balanceChanges[token.sym].type === 'increase' ? '+' : '-' }}{{ formatNumber(Math.abs(balanceChanges[token.sym].amount), 4) }}
        </div>
      </div>
    </div>

    <!-- Disconnected State -->
    <div v-else class="text-center py-12">
      <div class="text-6xl mb-4">🔒</div>
      <h3 class="text-lg font-semibold text-gray-400 mb-2">Wallet Not Connected</h3>
      <p class="text-sm text-gray-400 mb-6">
        Connect your wallet to view your balance and start using DeFi features
      </p>
      <button 
        @click="walletStore.connectWallet"
        class="tornado-button-primary"
        :disabled="walletStore.isConnecting"
      >
        {{ walletStore.isConnecting ? 'Connecting...' : 'Connect Wallet' }}
      </button>
    </div>

    <!-- Total Portfolio Value -->
    <div v-if="walletStore.isConnected" class="mt-6 p-4 bg-gray-800 rounded-xl border border-gray-600">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-400">Total Portfolio Value</span>
        <span class="text-2xl font-bold text-green-400">
          {{ totalPortfolioValue === null ? '-' : ('$' + formatNumber(totalPortfolioValue, 2)) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { formatNumber } from '@/utils/helpers'

const walletStore = useWalletStore()

// Track balance changes for animation
const balanceChanges = ref({})
const previousBalances = ref({})

// Map of on-chain balances fetched from provider: { 'ETH': 1.23, ... }
const chainBalances = ref({})
const isLoadingBalances = ref(false)

// Computed total portfolio value using on-chain balances when available, else fallback to local balances
const totalPortfolioValue = computed(() => {
  const tokens = walletStore.config.tokens || []
  // If any token is missing on-chain balance, return null so UI shows '-'
  for (const token of tokens) {
    const sym = token.sym
    if (typeof chainBalances.value[sym] !== 'number') return null
  }

  let total = 0
  for (const token of tokens) {
    const sym = token.sym
    const price = token.price || 0
    const bal = chainBalances.value[sym] || 0
    total += bal * price
  }
  return total
})

// Helper to format display: show '-' until on-chain value exists
function displayBalance(sym) {
  if (!walletStore.isConnected) return '-'
  const val = chainBalances.value[sym]
  if (typeof val === 'number') return formatNumber(val, 4)
  return '-'
}

function displayUSD(sym, price) {
  if (!walletStore.isConnected) return '-'
  const val = chainBalances.value[sym]
  if (typeof val === 'number' && price) return '≈ $' + formatNumber(val * price, 2)
  return '-'
}

// Refresh balances from chain
async function refreshBalances() {
  if (!walletStore.config || !walletStore.config.tokens) return
  isLoadingBalances.value = true
  try {
    const tokens = walletStore.config.tokens
    for (const token of tokens) {
      try {
        // walletStore.getBalance returns on-chain balance (uses provider). Fallback to local on error.
        const val = await walletStore.getBalance(token.sym)
        chainBalances.value = { ...chainBalances.value, [token.sym]: Number(val) }
      } catch (err) {
        // keep previous or local balance
        console.warn('Failed to fetch on-chain balance for', token.sym, err)
      }
    }
  } finally {
    isLoadingBalances.value = false
  }
}

// Token icons mapping
function getTokenIcon(symbol) {
  const icons = {
    ETH: '⟠',
    DAI: '◈',
    USDC: '●',
    WBTC: '₿'
  }
  return icons[symbol] || '◯'
}

// Watch for balance changes to show indicators
watch(
  () => walletStore.config.tokens.map(token => walletStore.getLocalBalance(token.sym)),
  (newBalances, oldBalances) => {
    if (!oldBalances) return
    
    walletStore.config.tokens.forEach((token, index) => {
      const newBalance = newBalances[index]
      const oldBalance = oldBalances[index]
      
      if (newBalance !== oldBalance) {
        const change = newBalance - oldBalance
        balanceChanges.value[token.sym] = {
          type: change > 0 ? 'increase' : 'decrease',
          amount: Math.abs(change)
        }
        
        // Clear the indicator after 3 seconds
        setTimeout(() => {
          if (balanceChanges.value[token.sym]) {
            delete balanceChanges.value[token.sym]
          }
        }, 3000)
      }
    })
  },
  { deep: true }
)

// Initialize previous balances
onMounted(() => {
  // initialize previous balances using local store
  walletStore.config.tokens.forEach(token => {
    previousBalances.value[token.sym] = walletStore.getLocalBalance(token.sym)
  })

  // If already connected, fetch real balances
  if (walletStore.isConnected) {
    refreshBalances()
  }
})

// Also refresh when wallet connection changes
watch(() => walletStore.isConnected, (connected) => {
  if (connected) refreshBalances()
})
</script>

<style scoped>
.balance-card {
  @apply bg-gray-800 p-4 rounded-xl border border-gray-600 relative overflow-hidden;
  transition: all 0.3s ease;
}

.balance-card:hover {
  @apply border-green-400 shadow-lg;
  transform: translateY(-2px);
}

.token-symbol {
  @apply text-sm font-semibold text-gray-400 uppercase tracking-wider;
}

.token-icon {
  @apply text-2xl opacity-70;
}

.balance-amount {
  @apply text-xl font-bold text-green-400 font-mono;
}

.balance-usd {
  @apply text-sm text-gray-400 font-mono;
}

.balance-change {
  @apply absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full;
  animation: fadeInOut 3s ease-in-out;
}

.balance-change.increase {
  @apply bg-green-500 text-white;
}

.balance-change.decrease {
  @apply bg-red-500 text-white;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: scale(0.8); }
  20% { opacity: 1; transform: scale(1.1); }
  80% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8); }
}
</style>
