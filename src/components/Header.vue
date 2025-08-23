<template>
  <header class="flex items-center justify-between animate-fade-in">
    <!-- Brand -->
    <div class="flex items-center gap-4">
      <div class="tornado-logo animate-tornado relative">
        <!-- Tornado Icon -->
        <div class="absolute inset-0 flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 4.5L18.5 20h-13L12 6.5z"/>
          </svg>
        </div>
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-wide">PIONEER</h1>
        <p class="text-sm text-mixer-muted flex items-center gap-2">
          <span class="privacy-indicator">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
            </svg>
            Privacy-First
          </span>
          Lend · Withdraw · Stake · Borrow · Unstake
        </p>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-4">
      <!-- Network Status -->
      <div class="connection-status">
        <span v-if="walletStore.isConnected">
          {{ walletStore.networkName }} (#{{ walletStore.chainId }})
        </span>
        <span v-else>Not connected</span>
      </div>

      <!-- Connect Button -->
      <button 
        @click="handleConnectWallet"
        :disabled="walletStore.isConnecting || isHandlingConnection"
        class="tornado-button-secondary"
      >
        <div v-if="walletStore.isConnecting || isHandlingConnection" class="loading-spinner"></div>
        <span v-else-if="walletStore.isConnected">{{ walletStore.shortAddress }}</span>
        <span v-else>Connect Wallet</span>
      </button>

      <!-- Config Button -->
      <button 
        @click="openConfig"
        class="tornado-button-primary"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        Config
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useNotificationStore } from '@/stores/notifications'

const walletStore = useWalletStore()
const notificationStore = useNotificationStore()

const emit = defineEmits(['open-config'])

// 添加防抖状态
const isHandlingConnection = ref(false)

async function handleConnectWallet() {
  // 防止重复点击
  if (isHandlingConnection.value || walletStore.isConnecting) {
    console.warn('连接操作正在进行中，请稍候...')
    return
  }

  isHandlingConnection.value = true

  try {
    if (walletStore.isConnected) {
      walletStore.disconnectWallet()
      notificationStore.info('Wallet Disconnected', 'Your wallet has been disconnected')
    } else {
      await walletStore.connectWallet()
      notificationStore.success('Wallet Connected', `Connected to ${walletStore.shortAddress}`)
    }
  } catch (error) {
    console.error('连接钱包时出错:', error)
    notificationStore.error('Connection Failed', error.message)
  } finally {
    // 延迟重置状态，避免快速重复点击
    setTimeout(() => {
      isHandlingConnection.value = false
    }, 1000)
  }
}

function openConfig() {
  emit('open-config')
}
</script>
