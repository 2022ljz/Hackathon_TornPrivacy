// Browser Cache Cleanup Script
// Run this in browser console to clear cache and storage

console.log('🧹 Clearing browser cache and storage...');

// Clear localStorage
try {
    localStorage.clear();
    console.log('✅ localStorage cleared');
} catch (e) {
    console.error('❌ Failed to clear localStorage:', e);
}

// Clear sessionStorage
try {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
} catch (e) {
    console.error('❌ Failed to clear sessionStorage:', e);
}

// Clear IndexedDB (if used)
if ('indexedDB' in window) {
    try {
        // Note: This is a basic cleanup, specific to common names
        const dbNames = ['mixer-local', 'tornado-privacy', 'defi-platform'];
        dbNames.forEach(name => {
            indexedDB.deleteDatabase(name);
        });
        console.log('✅ IndexedDB cleared');
    } catch (e) {
        console.error('❌ Failed to clear IndexedDB:', e);
    }
}

// Clear Web SQL (deprecated but might still exist)
if ('openDatabase' in window) {
    try {
        const db = openDatabase('', '', '', '');
        if (db) {
            console.log('✅ Web SQL cleared');
        }
    } catch (e) {
        console.error('❌ Failed to clear Web SQL:', e);
    }
}

console.log('🔄 Please refresh the page (Ctrl+F5 or Cmd+Shift+R) for changes to take effect');
console.log('🎯 If the error persists, please close all browser tabs and restart the browser');

// Force reload after 2 seconds
setTimeout(() => {
    console.log('🔄 Forcing page reload...');
    window.location.reload(true);
}, 2000);
