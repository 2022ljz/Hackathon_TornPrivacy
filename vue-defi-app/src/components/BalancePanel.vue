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
          {{ formatNumber(walletStore.getLocalBalance(token.sym), 4) }}
        </div>
        
        <div class="balance-usd">
          ≈ ${{ formatNumber(walletStore.getLocalBalance(token.sym) * token.price, 2) }}
        </div>
        
        <!-- Balance Change Indicator -->
        <div 
          v-if="balanceChanges[token.sym]" 
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
          ${{ formatNumber(totalPortfolioValue, 2) }}
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

// Computed total portfolio value
const totalPortfolioValue = computed(() => {
  if (!walletStore.isConnected) return 0
  
  return walletStore.config.tokens.reduce((total, token) => {
    const balance = walletStore.getLocalBalance(token.sym)
    return total + (balance * token.price)
  }, 0)
})

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
  walletStore.config.tokens.forEach(token => {
    previousBalances.value[token.sym] = walletStore.getLocalBalance(token.sym)
  })
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
