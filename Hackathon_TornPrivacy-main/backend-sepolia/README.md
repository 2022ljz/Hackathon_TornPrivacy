简洁指南 — Sepolia 一键部署包

快速步骤（在 PowerShell 中运行）：

1. 复制 `.env.example` 为 `.env`，并把 `PRIVATE_KEY` 换成你的 Sepolia 私钥（仅测试账号）

示例命令：

cd "d:\Program Files\Microsoft VS Code\qzr_code\Hackathon_TornPrivacy-main\backend-sepolia"
npm install
npm run build

部署 Mocks（USDC 6位，DAI 18位），并铸 1,000,000 给 deployer：

npm run deploy:mocks

记录控制台输出的 USDC 与 DAI 地址，填回前端 YAML：
- `tokens[0].public_erc20_address` = USDC 地址
- `tokens[1].public_erc20_address` = DAI 地址
- `lending_params.bootstrap_pool.token_address` = DAI 地址

部署核心合约：

npm run deploy:core

记录输出的 `mixer/pool/cm` 地址，填回前端合约配置。

给资金池打底（示例注入 1000 DAI）：在 PowerShell 中可以先设置环境变量再运行：

$env:TOKEN = "<DAI_ADDRESS>"
$env:AMT = "1000"
$env:POOL = "<POOL_ADDRESS>"
npm run fund

导出 ABI（可选，默认导出到 backend-sepolia/abis 或 .env 中指定的目录）：

npm run export:abis

演示顺序建议：
1) 在前端连接钱包并确认 token 可用（若是用 deployer 地址，前端钱包需导入该地址）
2) 前端 approve -> Mixer.deposit（保存 note）
3) CollateralManager.lockAndBorrow
4) CollateralManager.repayAndUnlock
5) Mixer.withdraw

部署完成后，把控制台的地址输出粘回给我，我可以生成 `addresses.json` 并把前端 YAML 自动填满。
