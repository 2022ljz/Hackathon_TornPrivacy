<template>
  <div v-if="showNetworkWarning" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
    <div class="bg-amber-900/90 backdrop-blur-sm border border-amber-500/30 rounded-lg p-4 shadow-xl">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z">
            </path>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-amber-400">网络提醒</h3>
          <p class="text-xs text-amber-200 mt-1">
            请切换到 Sepolia 测试网以使用完整功能
          </p>
        </div>
        <div class="flex space-x-2">
          <button 
            @click="switchToSepolia"
            :disabled="isSwitching"
            class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                   text-white text-xs rounded transition-colors duration-200"
          >
            {{ isSwitching ? '切换中...' : '切换网络' }}
          </button>
          <button 
            @click="dismissWarning"
            class="px-2 py-1 text-amber-400 hover:text-amber-300 text-xs"
          >
            忽略
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sepolia 网络状态指示器 -->
  <div v-if="isConnected" class="fixed bottom-4 right-4 z-40">
    <div class="flex items-center space-x-2 bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600/30">
      <div class="flex items-center space-x-1">
        <div :class="networkStatusClass" class="w-2 h-2 rounded-full"></div>
        <span class="text-xs font-medium" :class="networkTextClass">
          {{ networkDisplayName }}
        </span>
      </div>
      
      <!-- 测试网水龙头链接 -->
      <div v-if="isSepoliaNetwork && showFaucetLinks" class="flex items-center space-x-1">
        <span class="text-xs text-gray-400">|</span>
        <button
          @click="toggleFaucetLinks"
          class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          水龙头
        </button>
      </div>
    </div>

    <!-- 水龙头链接弹出框 -->
    <div v-if="showFaucetDropdown" 
         class="absolute bottom-full right-0 mb-2 w-80 bg-gray-900/95 backdrop-blur-sm 
                border border-gray-600/30 rounded-lg p-4 shadow-xl">
      <h4 class="text-sm font-medium text-white mb-3">Sepolia 测试网水龙头</h4>
      <div class="space-y-2">
        <div v-for="faucet in faucets" :key="faucet.name" 
             class="p-2 bg-gray-800/50 rounded border border-gray-700/30">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium text-green-400">{{ faucet.name }}</span>
            <a :href="faucet.url" target="_blank" 
               class="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              获取 ETH →
            </a>
          </div>
          <p class="text-xs text-gray-400">{{ faucet.description }}</p>
        </div>
      </div>
      <button @click="showFaucetDropdown = false" 
              class="mt-3 text-xs text-gray-400 hover:text-gray-300">
        关闭
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { switchToSepolia, isSepoliaNetwork, SEPOLIA_FAUCETS } from '@/utils/networks'

const walletStore = useWalletStore()

// 状态
const showNetworkWarning = ref(false)
const isSwitching = ref(false)
const showFaucetLinks = ref(true)
const showFaucetDropdown = ref(false)
const dismissed = ref(false)

// 水龙头信息
const faucets = ref(SEPOLIA_FAUCETS)

// 计算属性
const isConnected = computed(() => walletStore.isConnected)
const chainId = computed(() => walletStore.chainId)

const isSepoliaNetwork = computed(() => {
  return chainId.value === 11155111 || chainId.value === '0xaa36a7'
})

const networkDisplayName = computed(() => {
  if (isSepoliaNetwork.value) return 'Sepolia'
  if (chainId.value === 1) return 'Mainnet'
  if (chainId.value === 5) return 'Goerli'
  if (chainId.value === 137) return 'Polygon'
  return `Chain ${chainId.value}`
})

const networkStatusClass = computed(() => {
  if (!isConnected.value) return 'bg-gray-500'
  if (isSepoliaNetwork.value) return 'bg-green-500 animate-pulse'
  return 'bg-amber-500'
})

const networkTextClass = computed(() => {
  if (!isConnected.value) return 'text-gray-400'
  if (isSepoliaNetwork.value) return 'text-green-400'
  return 'text-amber-400'
})

// 方法
async function switchToSepolia() {
  isSwitching.value = true
  
  try {
    await switchToSepolia()
    showNetworkWarning.value = false
    dismissed.value = false
  } catch (error) {
    console.error('Failed to switch to Sepolia:', error)
    // 可以显示错误提示
  } finally {
    isSwitching.value = false
  }
}

function dismissWarning() {
  showNetworkWarning.value = false
  dismissed.value = true
}

function toggleFaucetLinks() {
  showFaucetDropdown.value = !showFaucetDropdown.value
}

// 监听网络变化
watch([isConnected, chainId], ([connected, newChainId]) => {
  if (connected && newChainId && !isSepoliaNetwork.value && !dismissed.value) {
    showNetworkWarning.value = true
  } else {
    showNetworkWarning.value = false
  }
}, { immediate: true })

// 点击外部关闭水龙头下拉框
function handleClickOutside(event) {
  if (showFaucetDropdown.value && !event.target.closest('.faucet-dropdown')) {
    showFaucetDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.faucet-dropdown {
  /* 标识用于点击外部检测 */
}
</style>
