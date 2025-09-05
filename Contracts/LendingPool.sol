// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./IERC20.sol";

contract LendingPool {
    using SafeERC20Lite for IERC20;

    struct Loan {
        address borrower;
        address token;
        uint256 amount;
        uint256 collateralAmount;
        bool repaid;
    }
    uint256 public loanCounter;
    mapping(uint256 => Loan) public loans;

    event Fund(address indexed from, address token, uint256 amount);
    event Borrow(uint256 indexed loanId, address indexed borrower, address token, uint256 amount, uint256 collateralAmount);
    event Repay(uint256 indexed loanId, address indexed payer, uint256 amount);

    function fund(address token, uint256 amount) external {
        require(token != address(0) && amount > 0, "bad fund");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Fund(msg.sender, token, amount);
    }

    function borrowFor(address borrower, address token, uint256 amount, uint256 collateralAmount)
        external returns (uint256)
    {
        require(borrower != address(0) && token != address(0) && amount > 0, "bad args");
        require(IERC20(token).balanceOf(address(this)) >= amount, "no liquidity");

        loanCounter++;
        loans[loanCounter] = Loan({ borrower: borrower, token: token, amount: amount, collateralAmount: collateralAmount, repaid: false });
        IERC20(token).safeTransfer(borrower, amount);
        emit Borrow(loanCounter, borrower, token, amount, collateralAmount);
        return loanCounter;
    }

    function repayFrom(uint256 loanId, uint256 amount, address payer) external {
        Loan storage loan = loans[loanId];
        require(!loan.repaid, "repaid");
        require(payer != address(0) && amount >= loan.amount, "bad repay");
        IERC20(loan.token).safeTransferFrom(payer, address(this), amount);
        loan.repaid = true;
        emit Repay(loanId, payer, amount);
    }
}
