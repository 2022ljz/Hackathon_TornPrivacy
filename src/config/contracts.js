// 🌐 网络配置
const NETWORKS = {
    SEPOLIA: 11155111,
    LOCALHOST: 31337
};

// 获取当前网络配置
const getCurrentChainId = () => {
    // 如果在本地开发环境，使用本地网络
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return NETWORKS.LOCALHOST;
    }
    return NETWORKS.SEPOLIA;
};

const CURRENT_CHAIN_ID = getCurrentChainId();

export default {
    "CHAIN_ID": CURRENT_CHAIN_ID,
    "MIXER_ADDRESS": CURRENT_CHAIN_ID === NETWORKS.LOCALHOST
        ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" // 本地部署地址
        : "0xf85Daa3dBA126757027CE967F86Eb7860271AfE0", // Sepolia地址
    "LENDING_POOL_ADDRESS": CURRENT_CHAIN_ID === NETWORKS.LOCALHOST
        ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" // 本地部署地址
        : "0x79D681b26F8012b59Ed1726241168aF367cDb7Ad", // Sepolia地址
    "COLLATERAL_MANAGER_ADDRESS": CURRENT_CHAIN_ID === NETWORKS.LOCALHOST
        ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" // 本地部署地址
        : "0xC9BAe3f8F6A47Daf0847294096906d91B8eF0f1d", // Sepolia地址
    "TOKENS": {
        "ETH": {
            "address": "0x0000000000000000000000000000000000000000",
            "symbol": "ETH",
            "name": "Ethereum",
            "decimals": 18
        },
        // 🌟 Privacy Token - 现在使用真实部署地址
        "TPT": {
            "address": CURRENT_CHAIN_ID === NETWORKS.LOCALHOST
                ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" // 本地部署地址
                : "0x1234567890123456789012345678901234567890", // Sepolia部署后更新
            "symbol": "TPT",
            "name": "Test Privacy Token",
            "decimals": 18
        },
        "USDT": {
            "address": CURRENT_CHAIN_ID === NETWORKS.LOCALHOST
                ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" // 本地共用同一个合约
                : "0x2345678901234567890123456789012345678901", // Sepolia部署后更新
            "symbol": "USDT",
            "name": "Tether USD",
            "decimals": 6
        },
        "USDC": {
            "address": CURRENT_CHAIN_ID === NETWORKS.LOCALHOST
                ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" // 本地共用同一个合约
                : "0x3456789012345678901234567890123456789012", // Sepolia部署后更新
            "symbol": "USDC",
            "name": "USD Coin",
            "decimals": 6
        },
        "DAI": {
            "address": "0x4567890123456789012345678901234567890123", // 部署后更新
            "symbol": "DAI",
            "name": "Dai Stablecoin",
            "decimals": 18
        }
        // 💡 这些地址需要在实际部署ERC-20合约后更新
        // 🔐 支持approve机制的隐私交易
    }
};