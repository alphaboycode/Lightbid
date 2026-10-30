// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ILightbid} from "../../src/interfaces/ILightbid.sol";

/**
 * @title MaliciousBidder
 * @notice Mock malicious contract that attempts reentrancy during withdrawals or rejects ETH transfers.
 */
contract MaliciousBidder {
    ILightbid public immutable marketplace;
    bool public shouldReenterWithdraw;
    bool public shouldReenterBid;
    bool public shouldRevert;
    uint256 public targetAuctionId;
    uint256 public attackBidAmount;
    uint256 public attackCount;

    constructor(address _marketplace) {
        marketplace = ILightbid(_marketplace);
    }

    function setAttackConfig(
        bool _reenterWithdraw,
        bool _reenterBid,
        bool _revert,
        uint256 _auctionId,
        uint256 _bidAmount
    ) external {
        shouldReenterWithdraw = _reenterWithdraw;
        shouldReenterBid = _reenterBid;
        shouldRevert = _revert;
        targetAuctionId = _auctionId;
        attackBidAmount = _bidAmount;
    }

    function placeBid(uint256 auctionId) external payable {
        marketplace.placeBid{value: msg.value}(auctionId);
    }

    function withdraw() external {
        marketplace.withdraw();
    }

    receive() external payable {
        if (shouldRevert) {
            revert("MaliciousBidder: rejected ETH");
        }

        if (shouldReenterWithdraw && attackCount == 0) {
            attackCount++;
            marketplace.withdraw();
        }

        if (shouldReenterBid && attackCount == 0 && address(this).balance >= attackBidAmount) {
            attackCount++;
            marketplace.placeBid{value: attackBidAmount}(targetAuctionId);
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
