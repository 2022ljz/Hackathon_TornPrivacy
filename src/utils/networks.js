// Sepolia 测试网配置
export const SEPOLIA_CONFIG = {
    chainId: 11155111,
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
        name: 'SepoliaETH',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: [
        'https://sepolia.infura.io/v3/',
        'https://eth-sepolia.public.blastapi.io',
        'https://rpc.sepolia.org'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
}

// 网络切换函数
export async function switchToSepolia() {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
    }

    try {
        // 尝试切换到 Sepolia 网络
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
        })
    } catch (switchError) {
        // 如果网络不存在，添加网络
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: '0xaa36a7',
                            chainName: SEPOLIA_CONFIG.chainName,
                            nativeCurrency: SEPOLIA_CONFIG.nativeCurrency,
                            rpcUrls: SEPOLIA_CONFIG.rpcUrls,
                            blockExplorerUrls: SEPOLIA_CONFIG.blockExplorerUrls,
                        },
                    ],
                })
            } catch (addError) {
                throw new Error('Failed to add Sepolia network')
            }
        } else {
            throw switchError
        }
    }
}

// 检查是否在 Sepolia 网络
export function isSepoliaNetwork(chainId) {
    return chainId === 11155111 || chainId === '0xaa36a7'
}

// 获取测试网 ETH 水龙头信息
export const SEPOLIA_FAUCETS = [
    {
        name: 'Alchemy Sepolia Faucet',
        url: 'https://sepoliafaucet.com/',
        description: '需要 Alchemy 账户，每日可获取 0.5 ETH'
    },
    {
        name: 'Infura Sepolia Faucet',
        url: 'https://www.infura.io/faucet/sepolia',
        description: '需要 Infura 账户，每日可获取 0.5 ETH'
    },
    {
        name: 'Chainlink Sepolia Faucet',
        url: 'https://faucets.chain.link/sepolia',
        description: '需要 0.001 ETH 在主网，每日可获取 0.1 ETH'
    }
]
