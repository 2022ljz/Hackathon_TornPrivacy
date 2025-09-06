// 清理localStorage中的旧代币数据
// 在浏览器控制台中运行这个脚本

console.log('🧹 开始清理localStorage中的旧代币数据...');

try {
    // 清理mixer-local数据
    const mixerLocal = localStorage.getItem('mixer-local');
    if (mixerLocal) {
        const data = JSON.parse(mixerLocal);

        // 只保留ETH余额
        if (data.balance) {
            const ethBalance = data.balance.ETH || 0;
            data.balance = { ETH: ethBalance };
            console.log('✅ 清理了balance数据，只保留ETH:', ethBalance);
        }

        // 保存清理后的数据
        localStorage.setItem('mixer-local', JSON.stringify(data));
    }

    // 清理defi-platform-data（如果存在）
    const defiData = localStorage.getItem('defi-platform-data');
    if (defiData) {
        const data = JSON.parse(defiData);

        if (data.balance) {
            const ethBalance = data.balance.ETH || 0;
            data.balance = { ETH: ethBalance };
            localStorage.setItem('defi-platform-data', JSON.stringify(data));
            console.log('✅ 清理了defi-platform-data');
        }
    }

    console.log('🎉 localStorage清理完成！请刷新页面。');

} catch (error) {
    console.error('❌ 清理localStorage时出错:', error);
}

// 自动刷新页面
setTimeout(() => {
    console.log('🔄 自动刷新页面...');
    window.location.reload();
}, 1000);
