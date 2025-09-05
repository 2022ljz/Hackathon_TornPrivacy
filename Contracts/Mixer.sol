// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./IERC20.sol";

contract Mixer {
    using SafeERC20Lite for IERC20;

    // 轻量重入保护
    uint256 private _status; // 1=NOT_ENTERED, 2=ENTERED
    modifier nonReentrant() { require(_status != 2, "REENTRANCY"); _status = 2; _; _status = 1; }
    constructor() { _status = 1; }

    struct DepositInfo {
        address token;
        uint256 amount;
        bool withdrawn;
        bool locked;
    }

    mapping(bytes32 => DepositInfo) public deposits;    // commitment -> info
    mapping(bytes32 => bool) public nullifierSpent;     // nullifierHash -> spent?
    address public collateralManager;                   // 只设置一次

    event Deposit(bytes32 indexed commitment, address token, uint256 amount);
    event Withdraw(address indexed to, bytes32 indexed commitment, address token, uint256 amount, bytes32 nullifierHash);
    event Locked(bytes32 indexed commitment);
    event Unlocked(bytes32 indexed commitment);
    event CollateralManagerSet(address cm);

    function setCollateralManager(address cm) external {
        require(collateralManager == address(0), "CM set");
        require(cm != address(0), "cm=0");
        collateralManager = cm;
        emit CollateralManagerSet(cm);
    }
    modifier onlyCM() { require(msg.sender == collateralManager, "not CM"); _; }

    /// 存款：先在 token 对本合约 approve，再调用本函数
    function deposit(bytes32 commitment, address token, uint256 amount) external nonReentrant {
        require(token != address(0) && amount > 0, "bad args");
        require(deposits[commitment].amount == 0, "commitment exists");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        deposits[commitment] = DepositInfo({ token: token, amount: amount, withdrawn: false, locked: false });
        emit Deposit(commitment, token, amount);
    }

    /// 提现：公开 (nullifier, secret)；不绑定存款地址
    function withdraw(address to, bytes32 nullifier, bytes32 secret) external nonReentrant {
        require(to != address(0), "to=0");
        bytes32 commitment = keccak256(abi.encodePacked(nullifier, secret));
        DepositInfo storage info = deposits[commitment];
        require(info.amount > 0 && !info.withdrawn && !info.locked, "invalid note");
        bytes32 nullifierHash = keccak256(abi.encodePacked(nullifier));
        require(!nullifierSpent[nullifierHash], "nullifier used");
        nullifierSpent[nullifierHash] = true;
        info.withdrawn = true;
        IERC20(info.token).safeTransfer(to, info.amount);
        emit Withdraw(to, commitment, info.token, info.amount, nullifierHash);
    }

    /// 抵押锁定/解锁
    function lock(bytes32 commitment) external onlyCM {
        DepositInfo storage i = deposits[commitment];
        require(i.amount > 0 && !i.withdrawn && !i.locked, "invalid");
        i.locked = true; emit Locked(commitment);
    }
    function unlock(bytes32 commitment) external onlyCM {
        DepositInfo storage i = deposits[commitment];
        require(i.locked, "not locked"); i.locked = false; emit Unlocked(commitment);
    }

    function getDeposit(bytes32 commitment) external view returns (address, uint256, bool, bool) {
        DepositInfo storage i = deposits[commitment];
        return (i.token, i.amount, i.withdrawn, i.locked);
    }
}
