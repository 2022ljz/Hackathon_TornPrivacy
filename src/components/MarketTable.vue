<template>
  <div class="tornado-panel animate-slide-up">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold tracking-wide">Core Assets</h2>
      <div class="privacy-indicator">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>
        </svg>
        Private Markets
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left">
            <th class="pb-4 text-sm font-semibold text-mixer-muted">Asset</th>
            <th class="pb-4 text-sm font-semibold text-mixer-muted">Total Supplied</th>
            <th class="pb-4 text-sm font-semibold text-mixer-muted">Supply APY</th>
            <th class="pb-4 text-sm font-semibold text-mixer-muted">Total Borrowed</th>
            <th class="pb-4 text-sm font-semibold text-mixer-muted">Borrow APY</th>
            <th class="pb-4"></th>
          </tr>
        </thead>
        <tbody class="space-y-2">
          <tr 
            v-for="(asset, index) in marketData" 
            :key="asset.symbol"
            class="market-row border-b border-mixer-border/50 animate-fade-in"
            :style="{ animationDelay: index * 100 + 'ms' }"
          >
            <td class="py-4">
              <div class="flex items-center gap-3">
                <div 
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  :class="getTokenColor(asset.symbol)"
                >
                  {{ asset.symbol.charAt(0) }}
                </div>
                <div>
                  <div class="font-semibold">{{ asset.symbol }}</div>
                  <div class="text-xs text-mixer-muted">{{ getTokenName(asset.symbol) }}</div>
                </div>
              </div>
            </td>
            <td class="py-4">
              <div class="font-mono">{{ asset.totalSupplied }}</div>
              <div class="text-xs text-mixer-muted">{{ formatCurrency(asset.suppliedUSD) }}</div>
            </td>
            <td class="py-4">
              <span 
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                :class="getApyColor(asset.supplyAPY)"
              >
                {{ asset.supplyAPY }}
              </span>
            </td>
            <td class="py-4">
              <div class="font-mono">{{ asset.totalBorrowed }}</div>
              <div class="text-xs text-mixer-muted">{{ formatCurrency(asset.borrowedUSD) }}</div>
            </td>
            <td class="py-4">
              <span 
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                :class="getApyColor(asset.borrowAPY, true)"
              >
                {{ asset.borrowAPY }}
              </span>
            </td>
            <td class="py-4">
              <div class="flex items-center gap-2">
                <button 
                  @click="quickSelect(asset.symbol)"
                  class="tornado-button-secondary text-xs px-3 py-1"
                >
                  Select
                </button>
                <div class="text-xs text-mixer-muted">
                  {{ getUtilizationRate(asset) }}%
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'
import { formatNumber } from '@/utils/helpers'

const notificationStore = useNotificationStore()

// Market data (demo)
const marketData = ref([
  {
    symbol: 'ETH',
    totalSupplied: '2.47M',
    suppliedUSD: 8645000000,
    supplyAPY: '2.00%',
    totalBorrowed: '2.20M',
    borrowedUSD: 7700000000,
    borrowAPY: '2.65%'
  },
  {
    symbol: 'DAI',
    totalSupplied: '5.12B',
    suppliedUSD: 5120000000,
    supplyAPY: '5.10%',
    totalBorrowed: '4.66B',
    borrowedUSD: 4660000000,
    borrowAPY: '6.20%'
  },
  {
    symbol: 'USDC',
    totalSupplied: '5.83B',
    suppliedUSD: 5830000000,
    supplyAPY: '4.89%',
    totalBorrowed: '5.05B',
    borrowedUSD: 5050000000,
    borrowAPY: '6.32%'
  },
  {
    symbol: 'WBTC',
    totalSupplied: '43.9K',
    suppliedUSD: 2853500000,
    supplyAPY: '0.01%',
    totalBorrowed: '3.39K',
    borrowedUSD: 220350000,
    borrowAPY: '0.39%'
  }
])

let updateInterval = null

// Methods
function getTokenColor(symbol) {
  const colors = {
    ETH: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    DAI: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    USDC: 'bg-green-500/20 text-green-300 border border-green-500/30',
    WBTC: 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
  }
  return colors[symbol] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
}

function getTokenName(symbol) {
  const names = {
    ETH: 'Ethereum',
    DAI: 'Dai Stablecoin',
    USDC: 'USD Coin',
    WBTC: 'Wrapped Bitcoin'
  }
  return names[symbol] || symbol
}

function getApyColor(apy, isBorrow = false) {
  const rate = parseFloat(apy.replace('%', ''))
  if (isBorrow) {
    if (rate > 5) return 'bg-red-500/20 text-red-300 border-red-500/30'
    if (rate > 2) return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    return 'bg-green-500/20 text-green-300 border-green-500/30'
  } else {
    if (rate > 4) return 'bg-green-500/20 text-green-300 border-green-500/30'
    if (rate > 2) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    return 'bg-red-500/20 text-red-300 border-red-500/30'
  }
}

function getUtilizationRate(asset) {
  const supplied = parseFloat(asset.totalSupplied.replace(/[^\d.]/g, ''))
  const borrowed = parseFloat(asset.totalBorrowed.replace(/[^\d.]/g, ''))
  const rate = (borrowed / supplied) * 100
  return formatNumber(rate, 1)
}

function formatCurrency(amount) {
  if (amount >= 1e9) return `$${formatNumber(amount / 1e9, 2)}B`
  if (amount >= 1e6) return `$${formatNumber(amount / 1e6, 2)}M`
  if (amount >= 1e3) return `$${formatNumber(amount / 1e3, 2)}K`
  return `$${formatNumber(amount, 2)}`
}

function quickSelect(symbol) {
  // Emit event to parent components to select this token
  const event = new CustomEvent('token-selected', {
    detail: { symbol },
    bubbles: true
  })
  document.dispatchEvent(event)
  
  notificationStore.info('Token Selected', `Selected ${symbol} for trading`)
}

function updateMarketData() {
  // Simulate real-time data updates
  marketData.value.forEach(asset => {
    // Small random fluctuations
    const supplyChange = (Math.random() - 0.5) * 0.1
    const borrowChange = (Math.random() - 0.5) * 0.1
    
    let currentSupplyAPY = parseFloat(asset.supplyAPY.replace('%', ''))
    let currentBorrowAPY = parseFloat(asset.borrowAPY.replace('%', ''))
    
    currentSupplyAPY = Math.max(0, currentSupplyAPY + supplyChange)
    currentBorrowAPY = Math.max(0, currentBorrowAPY + borrowChange)
    
    asset.supplyAPY = currentSupplyAPY.toFixed(2) + '%'
    asset.borrowAPY = currentBorrowAPY.toFixed(2) + '%'
  })
}

// Lifecycle
onMounted(() => {
  // Update market data every 30 seconds
  updateInterval = setInterval(updateMarketData, 30000)
  
  // Listen for token selection events
  document.addEventListener('token-selected', (event) => {
    const symbol = event.detail.symbol
    // Update form selects in other components
    const selects = document.querySelectorAll('select')
    selects.forEach(select => {
      for (const option of select.options) {
        if (option.value === symbol) {
          select.value = symbol
          select.dispatchEvent(new Event('change'))
          break
        }
      }
    })
  })
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>
