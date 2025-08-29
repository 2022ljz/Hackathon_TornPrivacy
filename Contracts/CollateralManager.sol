// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./Mixer.sol";
import "./LendingPool.sol";


contract CollateralManager {
    Mixer public mixer;
    LendingPool public pool;

    struct Collateral { bytes32 commitment; bool locked; uint256 loanId; }
    mapping(bytes32 => Collateral) public collaterals;

    constructor(address mixerAddress, address poolAddress) {
        require(mixerAddress != address(0) && poolAddress != address(0), "zero addr");
        mixer = Mixer(mixerAddress);
        pool  = LendingPool(poolAddress);
    }

    function lockAndBorrow(bytes32 commitment, address borrowToken, uint256 borrowAmount) external {
        (address token, uint256 face, bool withdrawn, bool isLocked) = mixer.getDeposit(commitment);
        require(face > 0 && !withdrawn && !isLocked, "invalid note");
        require(!collaterals[commitment].locked, "already locked");
        mixer.lock(commitment);
        collaterals[commitment] = Collateral({ commitment: commitment, locked: true, loanId: 0 });
        uint256 loanId = pool.borrowFor(msg.sender, borrowToken, borrowAmount, face);
        collaterals[commitment].loanId = loanId; token; // silence unused var
    }

    function repayAndUnlock(bytes32 commitment, uint256 repayAmount) external {
        Collateral storage col = collaterals[commitment];
        require(col.locked && col.loanId > 0, "not locked/loan");
        pool.repayFrom(col.loanId, repayAmount, msg.sender);
        ( , , , , bool repaid) = pool.loans(col.loanId);
        require(repaid, "not repaid");
        mixer.unlock(commitment);
        col.locked = false; col.loanId = 0;
    }
}
