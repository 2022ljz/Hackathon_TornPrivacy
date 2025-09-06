<template>
  <div 
    class="fixed inset-0 z-50 overflow-hidden"
    :class="{ 'pointer-events-none': !isOpen }"
  >
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
      :class="{ 'opacity-0': !isOpen, 'opacity-100': isOpen }"
      @click="close"
    ></div>
    
    <!-- Drawer -->
    <div 
      class="fixed top-0 right-0 w-96 max-w-[90vw] h-full bg-mixer-panel border-l border-mixer-border shadow-mixer transition-transform duration-300 ease-out overflow-auto"
      :class="{ 'translate-x-full': !isOpen, 'translate-x-0': isOpen }"
    >
      <div class="p-6 pb-20">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold tracking-wide">Configuration</h3>
          <button @click="close" class="tornado-button-secondary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Close
          </button>
        </div>

        <div class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
          <p class="text-sm text-blue-300">
            如需**真实链上交互**：在下方填入你的 ERC20 / Lending / Mixer 合约地址。
            如果没有，就保持空白以使用"演示模式"（localStorage 记账）。
          </p>
        </div>

        <!-- Tokens Configuration -->
        <div class="mb-8">
          <h4 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
            </svg>
            Tokens
          </h4>
          <p class="text-sm text-mixer-muted mb-4">内置 4 种示例 Token（可编辑）。</p>
          
          <div class="space-y-4">
            <div 
              v-for="(token, index) in walletStore.config.tokens" 
              :key="token.sym"
              class="tornado-panel p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold">{{ token.sym }}</h5>
                <div 
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  :class="getTokenColor(token.sym)"
                >
                  {{ token.sym.charAt(0) }}
                </div>
              </div>
              
              <div class="grid grid-cols-1 gap-3">
                <div>
                  <label class="block text-xs text-mixer-muted mb-1">Contract Address</label>
                  <input 
                    v-model="token.addr"
                    @change="saveConfig"
                    class="tornado-input text-sm font-mono" 
                    placeholder="0x... (留空=演示)"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-mixer-muted mb-1">Decimals</label>
                    <input 
                      v-model.number="token.decimals"
                      @change="saveConfig"
                      type="number"
                      class="tornado-input text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-mixer-muted mb-1">Price (USD)</label>
                    <input 
                      v-model.number="token.price"
                      @change="saveConfig"
                      type="number"
                      step="any"
                      class="tornado-input text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Protocols Configuration -->
        <div class="mb-8">
          <h4 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
            Protocols (optional)
          </h4>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-mixer-muted mb-2">Lending Contract</label>
              <input 
                v-model="walletStore.config.lendingAddr"
                @change="saveConfig"
                class="tornado-input font-mono" 
                placeholder="0x... (borrow/stake/unstake)"
              />
            </div>
            
            <div>
              <label class="block text-sm text-mixer-muted mb-2">Mixer Contract</label>
              <input 
                v-model="walletStore.config.mixerAddr"
                @change="saveConfig"
                class="tornado-input font-mono" 
                placeholder="0x... (lend/withdraw)"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-mixer-muted mb-2">Base APR (%)</label>
                <input 
                  v-model.number="walletStore.config.baseAPR"
                  @change="saveConfig"
                  type="number"
                  step="0.1"
                  class="tornado-input font-mono"
                />
              </div>
              
              <div>
                <label class="block text-sm text-mixer-muted mb-2">LTV Ratio</label>
                <input 
                  v-model.number="walletStore.config.ltv"
                  @change="saveConfig"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  class="tornado-input font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Privacy Settings -->
        <div class="mb-8">
          <h4 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
            </svg>
            Privacy Features
          </h4>
          
          <div class="space-y-4">
            <div class="tornado-panel p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h5 class="font-medium">Zero-Knowledge Proofs</h5>
                  <p class="text-xs text-mixer-muted">Protect transaction privacy using ZK technology</p>
                </div>
                <div class="privacy-indicator">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  Active
                </div>
              </div>
            </div>
            
            <div class="tornado-panel p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h5 class="font-medium">Transaction Mixing</h5>
                  <p class="text-xs text-mixer-muted">Break transaction history links</p>
                </div>
                <div class="privacy-indicator">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  Active
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Save Notice -->
        <div class="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p class="text-sm text-green-300">
            修改后会立即保存至浏览器（可刷新保留）。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useWalletStore } from '@/stores/wallet'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const walletStore = useWalletStore()

function close() {
  emit('close')
}

function saveConfig() {
  walletStore.persistData()
}

function getTokenColor(symbol) {
  const colors = {
    ETH: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    // 🔥 DAI, USDC, WBTC colors REMOVED!
    // 🚫 Only ETH supported on Sepolia testnet!
  }
  return colors[symbol] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
}
</script>
