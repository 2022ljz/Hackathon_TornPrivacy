#!/bin/bash

# PIONEER 部署脚本

echo "🚀 开始构建 PIONEER..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 构建项目
echo "🔨 构建生产版本..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建完成！"
echo "📁 生产文件位于: ./dist/"
echo ""
echo "🌐 部署选项:"
echo "1. 静态托管: 将 dist/ 文件夹上传到任何静态网站托管服务"
echo "2. Vercel: vercel --prod"
echo "3. Netlify: netlify deploy --prod --dir=dist"
echo "4. GitHub Pages: 推送到 gh-pages 分支"
echo ""
echo "🔗 本地预览: npm run preview"
