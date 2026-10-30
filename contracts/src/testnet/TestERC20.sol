// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestERC20 (tUSD)
 * @notice Testnet-only token with a public faucet. Has no real value.
 * @dev Uses 6 decimals to mimic USDC. Anyone can call `faucet()` once per cooldown.
 *      The owner (deployer) can mint arbitrary amounts for test setup.
 */
contract TestERC20 is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** 6; // 1,000 tUSD
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucetClaim;

    error FaucetCooldown(uint256 availableAt);

    constructor() ERC20("Test USD", "tUSD") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint FAUCET_AMOUNT tUSD to the caller. Limited by cooldown per address.
    function faucet() external {
        uint256 last = lastFaucetClaim[msg.sender];
        if (last != 0 && block.timestamp < last + FAUCET_COOLDOWN) {
            revert FaucetCooldown(last + FAUCET_COOLDOWN);
        }
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Seconds until `account` can use the faucet again (0 if available now).
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 last = lastFaucetClaim[account];
        if (last == 0 || block.timestamp >= last + FAUCET_COOLDOWN) return 0;
        return last + FAUCET_COOLDOWN - block.timestamp;
    }

    /// @notice Owner-only mint for arbitrary test setups.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}