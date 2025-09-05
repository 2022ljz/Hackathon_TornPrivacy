<template>
  <header class="flex items-center justify-between animate-fade-in">
    <!-- Brand -->
    <div class="flex items-center gap-4">
      <div class="logo-container">
        <img 
          src="/pioneer.jpg" 
          alt="Pioneer Logo" 
          class="w-12 h-12 rounded-xl object-cover border-2 border-green-400/30 hover:border-green-400 transition-all duration-300"
        />
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

      <!-- Clear Cache Button -->
      <button 
        @click="clearCache"
        class="tornado-button-danger"
        title="Clear all cached data"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        Clear Cache
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

async function clearCache() {
  try {
    // 显示确认对话框
    const confirmed = confirm(
      '⚠️ 确定要清空所有缓存数据吗？\n\n这将删除：\n• 所有借贷记录\n• 所有质押记录\n• 所有交易笔记\n• 配置设置\n\n此操作不可撤销！'
    )
    
    if (!confirmed) {
      return
    }
    
    // 清空缓存
    const success = walletStore.clearAllData()
    
    if (success) {
      notificationStore.success(
        '🗑️ 缓存已清空', 
        '所有本地数据已成功删除。页面将在3秒后刷新。'
      )
      
      // 延迟刷新页面以应用更改
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } else {
      notificationStore.error('清空失败', '清空缓存时发生错误，请重试')
    }
  } catch (error) {
    console.error('清空缓存时出错:', error)
    notificationStore.error('操作失败', error.message)
  }
}
</script>
