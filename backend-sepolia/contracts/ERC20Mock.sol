// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ERC20Mock {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;
    event Transfer(address indexed from,address indexed to,uint256 value);
    event Approval(address indexed owner,address indexed spender,uint256 value);
    modifier onlyOwner(){require(msg.sender==owner,"not owner"); _;}

    constructor(string memory _n,string memory _s,uint8 _decimals){name=_n;symbol=_s;decimals=_decimals;owner=msg.sender;}

    function transfer(address to,uint256 v) external returns(bool){_transfer(msg.sender,to,v);return true;}
    function approve(address s,uint256 v) external returns(bool){allowance[msg.sender][s]=v;emit Approval(msg.sender,s,v);return true;}
    function transferFrom(address f,address t,uint256 v) external returns(bool){uint256 a=allowance[f][msg.sender];require(a>=v,"allowance");allowance[f][msg.sender]=a-v;_transfer(f,t,v);return true;}
    function _transfer(address f,address t,uint256 v) internal {require(t!=address(0),"to=0");uint256 b=balanceOf[f];require(b>=v,"balance");unchecked{balanceOf[f]=b-v;}balanceOf[t]+=v;emit Transfer(f,t,v);}
    function mint(address to,uint256 v) external onlyOwner {require(to!=address(0),"to=0");totalSupply+=v;balanceOf[to]+=v;emit Transfer(address(0), to, v);}    
}
