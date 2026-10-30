// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockFeeOnTransferERC20 is ERC20 {
    uint256 public feeBps; // e.g., 500 = 5%
    address public feeRecipient;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _feeBps,
        address _feeRecipient
    ) ERC20(name, symbol) {
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && feeBps > 0) {
            uint256 fee = (value * feeBps) / 10000;
            uint256 netValue = value - fee;
            super._update(from, feeRecipient, fee);
            super._update(from, to, netValue);
        } else {
            super._update(from, to, value);
        }
    }
}
