// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Mixer.sol";

contract GasProfiler {
    Mixer public mixer;
    
    constructor() {
        mixer = new Mixer();
    }
    
    // 测量单个withdraw操作的gas使用
    function profileWithdraw(
        address to,
        bytes32 nullifier,
        bytes32 secret,
        address token,
        uint256 amount
    ) external returns (uint256 gasUsed) {
        // 首先需要存款
        bytes32 commitment = keccak256(abi.encodePacked(nullifier, secret));
        
        if (token == address(0)) {
            mixer.deposit{value: amount}(commitment, token, amount);
        } else {
            // 这里需要先approve token
            mixer.deposit(commitment, token, amount);
        }
        
        // 记录gas使用前的状态
        uint256 gasBefore = gasleft();
        
        // 执行withdraw操作
        mixer.withdraw(to, nullifier, secret);
        
        // 计算实际使用的gas
        gasUsed = gasBefore - gasleft();
        
        return gasUsed;
    }
    
    // 分别测量存储写入的成本
    function profileStorageWrites() external view returns (
        uint256 nullifierWriteCost,
        uint256 withdrawnWriteCost
    ) {
        // 这些值是以太坊的标准gas成本
        nullifierWriteCost = 20000; // SSTORE from zero to non-zero
        withdrawnWriteCost = 5000;  // SSTORE modify existing
        
        return (nullifierWriteCost, withdrawnWriteCost);
    }
}
