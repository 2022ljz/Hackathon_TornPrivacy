<template>
  <div class="min-h-screen bg-mixer-bg">
    <!-- Background Effects -->
    <div class="fixed inset-0 bg-gradient-mixer"></div>
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div 
        v-for="i in 5" 
        :key="i"
        class="absolute w-64 h-64 bg-green-500/5 rounded-full blur-3xl animate-float"
        :style="{ 
          left: Math.random() * 100 + '%', 
          top: Math.random() * 100 + '%',
          animationDelay: i * 2 + 's'
        }"
      ></div>
    </div>

    <!-- Main Content -->
    <div class="relative z-10">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <!-- Header -->
        <Header @open-config="isConfigOpen = true" />
        
        <!-- Balance Panel -->
        <BalancePanel class="mt-6" />
        
        <!-- Main Interface -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <!-- Left Panel: Lend/Withdraw -->
          <LendWithdrawPanel />
          
          <!-- Right Panel: Stake/Borrow/Unstake -->
          <StakeBorrowPanel />
        </div>
        
        <!-- Market Table -->
        <MarketTable class="mt-8" />
        
        <!-- Footer -->
        <Footer />
      </div>
    </div>

    <!-- Config Drawer -->
    <ConfigDrawer :isOpen="isConfigOpen" @close="isConfigOpen = false" />
    
    <!-- Notifications -->
    <NotificationContainer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import Header from '@/components/Header.vue'
import BalancePanel from '@/components/BalancePanel.vue'
import LendWithdrawPanel from '@/components/LendWithdrawPanel.vue'
import StakeBorrowPanel from '@/components/StakeBorrowPanel.vue'
import MarketTable from '@/components/MarketTable.vue'
import Footer from '@/components/Footer.vue'
import ConfigDrawer from '@/components/ConfigDrawer.vue'
import NotificationContainer from '@/components/NotificationContainer.vue'

const walletStore = useWalletStore()
const isConfigOpen = ref(false)

onMounted(() => {
  walletStore.loadPersistedData()
})
</script>
