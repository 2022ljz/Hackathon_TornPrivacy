# Swap Demo — 简明说明

这是一个基于纯前端（HTML / CSS / JS + jQuery / Bootstrap CDN）的 Swap 演示页面，模拟类似 MetaMask 的 Swap UI并包含对浏览器钱包（MetaMask）的简单读取余额逻辑（仅演示，不进行真实交易）。

核心文件
- `index.html` — 页面主体（引用 `styles.css` 与 `app.js`）
- `styles.css` — 页面样式
- `app.js` — 交互逻辑（下拉、搜索、quote、MetaMask 连接与余额读取）

快速运行（本地测试 MetaMask）
1. 推荐在本地启动一个静态服务并用浏览器打开（MetaMask 的注入需要 http(s) 或 localhost）：

```powershell
# 在 assignment1 目录下运行（需要已安装 Python）
python -m http.server 3000
# 然后在浏览器打开：http://localhost:3000
```

2. 打开页面后，点击右上角的 "Connect wallet"：
   - 页面会调用 `eth_requestAccounts` 触发 MetaMask 弹窗（需安装并启用 MetaMask 扩展）。
   - 连接成功后会读取并在页面显示账户地址与 ETH 可用余额（演示用途，数值为真实链上的余额）。

注意事项与故障排查
- 如果页面显示“MetaMask not detected”：
  - 确认你用的不是 `file://` 打开页面，必须通过 `http://` 或 `https://`（localhost 可用）。
  - 确认浏览器已安装并启用 MetaMask 扩展，且允许在当前窗口/配置文件运行（私密窗口需单独允许）。
- 如果 MetaMask 弹窗被浏览器拦截，请检查插件或浏览器设置。若拒绝连接，页面会显示相关提示。

作业提交说明
- 按要求仅提交 `index.html`、`styles.css`、`app.js` 三个文件即可（项目已按此拆分）。

免责声明
- 本项目为教学/演示用途，不包含真实交易签名或链上交换逻辑；请勿在生产环境直接使用。

如需我将三个文件合并为单一 HTML 演示或生成压缩包（submission.zip），告诉我我就帮你生成。
