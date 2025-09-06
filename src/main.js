import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// 🔥 FORCE CLEAN ALL HARDCODED DATA IMMEDIATELY!
import './utils/dataCleanup.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

console.log('🔥 TORN PRIVACY - SEPOLIA TESTNET ONLY')
console.log('🚫 ALL HARDCODED DATA ELIMINATED!')
console.log('🔗 PURE BLOCKCHAIN OPERATIONS ACTIVE!')
