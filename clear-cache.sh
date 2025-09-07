#!/bin/bash

# Script to help clear development cache and restart the server
echo "🧹 Tornado Privacy - Cache Cleanup Script"
echo "========================================"

echo "1. 🛑 Stopping development server..."
pkill -f "vite" 2>/dev/null || echo "   No running vite server found"

echo "2. 🗑️  Clearing node_modules cache..."
rm -rf node_modules/.vite 2>/dev/null || echo "   No .vite cache found"
rm -rf node_modules/.cache 2>/dev/null || echo "   No .cache found"

echo "3. 🧽 Clearing build cache..."
rm -rf dist 2>/dev/null || echo "   No dist folder found"
rm -rf .vite 2>/dev/null || echo "   No .vite folder found"

echo "4. 🔄 Restarting development server..."
npm run dev &

echo ""
echo "✅ Cache cleanup complete!"
echo ""
echo "📋 Additional steps for complete cleanup:"
echo "   1. Clear browser cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)"
echo "   2. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "   3. Close all browser tabs and restart browser if needed"
echo ""
echo "🎯 If you still see 'handleWithdrawOperation is not a function' error:"
echo "   - Open browser console (F12)"
echo "   - Run: localStorage.clear(); sessionStorage.clear(); location.reload(true);"
echo ""
