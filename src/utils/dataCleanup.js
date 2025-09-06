// 🔥 DATA CLEANUP UTILITY
// 强制清理所有hardcoded数据和缓存

export function forceCleanAllHardcodedData() {
    console.log('🔥 FORCE CLEANING ALL HARDCODED DATA...')

    try {
        // 清理localStorage中的所有balance数据
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
            if (key.includes('mixer') || key.includes('balance') || key.includes('token')) {
                try {
                    const data = localStorage.getItem(key)
                    if (data) {
                        const parsed = JSON.parse(data)

                        // 删除balance数据
                        if (parsed.balance) {
                            delete parsed.balance
                            localStorage.setItem(key, JSON.stringify(parsed))
                            console.log(`🧹 Cleaned balance from ${key}`)
                        }

                        // 删除非ETH token数据
                        if (parsed.tokens) {
                            parsed.tokens = parsed.tokens.filter(token => token.sym === 'ETH')
                            localStorage.setItem(key, JSON.stringify(parsed))
                            console.log(`🧹 Filtered tokens to ETH only in ${key}`)
                        }
                    }
                } catch (e) {
                    // 如果解析失败，直接删除
                    localStorage.removeItem(key)
                    console.log(`🗑️ Removed corrupted key: ${key}`)
                }
            }
        })

        // 清理Vue DevTools数据（如果存在）
        if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
            try {
                // 清理Pinia store缓存
                const stores = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.stores || []
                stores.forEach(store => {
                    if (store.$id === 'wallet' && store.localData?.balance) {
                        delete store.localData.balance
                        console.log('🧹 Cleaned wallet store balance from DevTools')
                    }
                })
            } catch (e) {
                console.warn('Could not clean DevTools data:', e)
            }
        }

        // 强制刷新页面缓存（确保新代码生效）
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name.includes('vite') || name.includes('dev')) {
                        caches.delete(name)
                        console.log(`🧹 Cleared cache: ${name}`)
                    }
                })
            })
        }

        console.log('✅ ALL HARDCODED DATA CLEANED!')

        // 显示用户通知
        if (window.showNotification) {
            window.showNotification('🔥 All hardcoded data eliminated! Only real blockchain data now.', 'success')
        }

        return true

    } catch (error) {
        console.error('❌ Failed to clean hardcoded data:', error)
        return false
    }
}

export function verifyDataCleanup() {
    console.log('🔍 VERIFYING DATA CLEANUP...')

    const issues = []

    // 检查localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
        try {
            const data = localStorage.getItem(key)
            if (data) {
                const parsed = JSON.parse(data)

                if (parsed.balance) {
                    issues.push(`localStorage key "${key}" still has balance data`)
                }

                if (parsed.tokens && parsed.tokens.some(t => t.sym !== 'ETH')) {
                    issues.push(`localStorage key "${key}" still has non-ETH tokens`)
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    })

    if (issues.length === 0) {
        console.log('✅ VERIFICATION PASSED: No hardcoded data found!')
        return true
    } else {
        console.error('❌ VERIFICATION FAILED:', issues)
        return false
    }
}

// 自动执行清理（在模块加载时）
if (typeof window !== 'undefined') {
    // 延迟执行，确保其他模块加载完成
    setTimeout(() => {
        forceCleanAllHardcodedData()
        setTimeout(verifyDataCleanup, 500)
    }, 100)
}
