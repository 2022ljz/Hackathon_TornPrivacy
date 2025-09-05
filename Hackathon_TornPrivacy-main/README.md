# PIONEER

一个受 Tornado Cash 启发的隐私优先 DeFi 平台，使用 Vue 3 + Vite 构建。

## 🌟 特性

- **隐私优先**: 受 Tornado Cash 启发的设计理念
- **现代界面**: 暗色主题，流畅动画，响应式设计
- **完整功能**: 借贷、质押、借出、提取、解除质押
- **钱包集成**: 支持 MetaMask 等 Web3 钱包
- **演示模式**: 本地存储演示，无需真实合约
- **实时更新**: 市场数据实时更新
- **配置化**: 可配置代币、合约地址、APR 等参数

## 🎨 设计特色

### Tornado Cash 风格
- 深色主题配色方案
- 绿色主色调 (#22c55e)
- 毛玻璃效果和渐变背景
- 隐私指示器和安全徽章

### 动画效果
- 页面加载动画 (fade-in, slide-up)
- 浮动动画 (float)
- Tornado 旋转动画
- 按钮悬停效果

### 响应式设计
- 移动端友好
- 自适应布局
- Tailwind CSS 工具类

## 🚀 快速开始

### 安装依赖

```bash
cd vue-defi-app
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 📁 项目结构

```
vue-defi-app/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── Header.vue       # 顶部导航栏
│   │   ├── LendWithdrawPanel.vue    # 借贷面板
│   │   ├── StakeBorrowPanel.vue     # 质押借出面板
│   │   ├── MarketTable.vue          # 市场数据表格
│   │   ├── ConfigDrawer.vue         # 配置抽屉
│   │   ├── NotificationContainer.vue # 通知容器
│   │   └── Footer.vue       # 页脚
│   ├── stores/              # Pinia 状态管理
│   │   ├── wallet.js        # 钱包状态
│   │   └── notifications.js # 通知状态
│   ├── utils/               # 工具函数
│   │   └── helpers.js       # 帮助函数
│   ├── App.vue              # 主应用组件
│   ├── main.js              # 应用入口
│   └── style.css            # 全局样式
├── public/                  # 静态资源
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── vite.config.js           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
└── postcss.config.js        # PostCSS 配置
```

## 🔧 配置

### 代币配置
在配置面板中可以设置：
- 合约地址
- 小数位数
- 价格（演示用）

### 协议配置
- Lending 合约地址
- Mixer 合约地址
- 基础 APR
- LTV 比率

### 隐私功能
- 零知识证明（概念演示）
- 交易混合（概念演示）

## 🌐 钱包集成

支持的钱包：
- MetaMask
- 其他兼容 EIP-1193 的钱包

网络支持：
- Ethereum Mainnet
- 各种测试网
- Polygon
- 其他 EVM 兼容链

## 💰 功能模块

### 借贷 (Lend/Withdraw)
- 选择代币和金额
- 设置锁定期限
- 查看预期收益
- 一键借出和提取

### 质押借出 (Stake/Borrow/Unstake)
- 质押抵押品
- 基于 LTV 计算借贷额度
- 借出到指定地址
- 解除质押

### 市场数据
- 实时 APY 显示
- 总供应量和借贷量
- 利用率计算
- 一键选择代币

## 🔒 隐私特性

### Tornado Cash 启发
- 隐私优先的用户界面
- 零知识证明概念
- 交易混合理念
- 匿名性保护

### 数据安全
- 本地数据存储
- 无服务器依赖（演示模式）
- 客户端加密

## 🎯 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **状态管理**: Pinia
- **样式框架**: Tailwind CSS
- **Web3 集成**: ethers.js
- **动画库**: GSAP (计划中)
- **工具函数**: @vueuse/core

## 📱 响应式设计

- 移动端优化
- 平板适配
- 桌面端完整体验
- 触摸友好的界面

## 🔄 状态管理

### Wallet Store
- 钱包连接状态
- 用户余额
- 网络信息
- 配置数据

### Notification Store
- 成功/错误提示
- 警告信息
- 自动消失定时器
- 多种通知类型

## 🚨 注意事项

1. **演示模式**: 默认使用 localStorage 进行数据模拟
2. **合约集成**: 需要在配置中填写真实合约地址
3. **测试环境**: 建议先在测试网进行测试
4. **安全提醒**: 不要在主网使用未经审计的合约

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [ethers.js](https://docs.ethers.io/)
- [Pinia](https://pinia.vuejs.org/)

---

**免责声明**: 此项目仅供学习和演示用途。在生产环境中使用前，请确保代码经过充分测试和安全审计。
