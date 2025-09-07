// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// 最小 ERC20 接口
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// 兼容不返回 bool 的 ERC20
library SafeERC20Lite {
    function safeTransfer(IERC20 t, address to, uint256 v) internal {
        (bool ok, bytes memory d) = address(t).call(abi.encodeWithSelector(t.transfer.selector, to, v));
        require(ok && (d.length == 0 || abi.decode(d, (bool))), "SAFE20: transfer fail");
    }
    function safeTransferFrom(IERC20 t, address from, address to, uint256 v) internal {
        (bool ok, bytes memory d) = address(t).call(abi.encodeWithSelector(t.transferFrom.selector, from, to, v));
        require(ok && (d.length == 0 || abi.decode(d, (bool))), "SAFE20: transferFrom fail");
    }
    function safeApprove(IERC20 t, address s, uint256 v) internal {
        (bool ok, bytes memory d) = address(t).call(abi.encodeWithSelector(t.approve.selector, s, v));
        require(ok && (d.length == 0 || abi.decode(d, (bool))), "SAFE20: approve fail");
    }
}
