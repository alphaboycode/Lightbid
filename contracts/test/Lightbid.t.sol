// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Lightbid} from "../src/Lightbid.sol";
import {ILightbid} from "../src/interfaces/ILightbid.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockFeeOnTransferERC20} from "./mocks/MockFeeOnTransferERC20.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {MockERC1155} from "./mocks/MockERC1155.sol";
import {MaliciousBidder} from "./mocks/MaliciousBidder.sol";

contract LightbidTest is Test {
    Lightbid public marketplace;
    MockERC20 public erc20;
    MockFeeOnTransferERC20 public fotErc20;
    MockERC721 public erc721;
    MockERC1155 public erc1155;

    address public owner = address(0xAA1);
    address public feeRecipient = address(0xAA2);
    address public seller = address(0xBB1);
    address public bidder1 = address(0xCC1);
    address public bidder2 = address(0xCC2);
    address public bidder3 = address(0xCC3);

    uint256 public constant INITIAL_FEE_BPS = 250; // 2.5%
    uint256 public constant DEFAULT_DURATION = 1 hours;
    uint256 public constant DEFAULT_RESERVE = 1 ether;
    uint256 public constant DEFAULT_INCREMENT_BPS = 500; // 5%

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        ILightbid.AssetType assetType,
        address indexed token,
        uint256 tokenId,
        uint256 amount,
        uint256 reservePrice,
        uint256 minIncrementBps,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 endTime
    );

    event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime);

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        address indexed seller,
        uint256 amount,
        uint256 fee
    );

    event AuctionCancelled(uint256 indexed auctionId, address indexed seller);

    event Withdrawal(address indexed user, uint256 amount);

    function setUp() public {
        vm.deal(seller, 100 ether);
        vm.deal(bidder1, 100 ether);
        vm.deal(bidder2, 100 ether);
        vm.deal(bidder3, 100 ether);

        vm.prank(owner);
        marketplace = new Lightbid(owner, feeRecipient, INITIAL_FEE_BPS);

        erc20 = new MockERC20("Mock USD", "mUSD");
        fotErc20 = new MockFeeOnTransferERC20("Fee Token", "FOT", 500, address(0x999)); // 5% fee
        erc721 = new MockERC721("Mock NFT", "MNFT");
        erc1155 = new MockERC1155("https://api.example.com/{id}.json");
    }

    /* ------------------------------------------------------------------ */
    /* Asset Types & Escrow Tests                                          */
    /* ------------------------------------------------------------------ */

    function test_CreateAuction_ERC721() public {
        uint256 tokenId = 1;
        erc721.mint(seller, tokenId);

        vm.startPrank(seller);
        erc721.approve(address(marketplace), tokenId);

        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC721,
            address(erc721),
            tokenId,
            1,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        assertEq(auctionId, 1);
        assertEq(erc721.ownerOf(tokenId), address(marketplace));

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(a.seller, seller);
        assertEq(uint8(a.assetType), uint8(ILightbid.AssetType.ERC721));
        assertEq(a.token, address(erc721));
        assertEq(a.tokenId, tokenId);
        assertEq(a.amount, 1);
        assertEq(a.reservePrice, DEFAULT_RESERVE);
        assertEq(uint8(a.status), uint8(ILightbid.AuctionStatus.Active));
    }

    function test_CreateAuction_ERC1155() public {
        uint256 tokenId = 42;
        uint256 mintAmount = 100;
        uint256 auctionAmount = 25;

        erc1155.mint(seller, tokenId, mintAmount);

        vm.startPrank(seller);
        erc1155.setApprovalForAll(address(marketplace), true);

        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC1155,
            address(erc1155),
            tokenId,
            auctionAmount,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        assertEq(erc1155.balanceOf(address(marketplace), tokenId), auctionAmount);
        assertEq(erc1155.balanceOf(seller, tokenId), mintAmount - auctionAmount);

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(a.amount, auctionAmount);
    }

    function test_CreateAuction_ERC20() public {
        uint256 amount = 1000 ether;
        erc20.mint(seller, amount);

        vm.startPrank(seller);
        erc20.approve(address(marketplace), amount);

        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC20,
            address(erc20),
            0,
            amount,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        assertEq(erc20.balanceOf(address(marketplace)), amount);
        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(a.amount, amount);
    }

    function test_CreateAuction_FeeOnTransferERC20() public {
        uint256 transferAmount = 1000 ether;
        fotErc20.mint(seller, transferAmount);

        vm.startPrank(seller);
        fotErc20.approve(address(marketplace), transferAmount);

        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC20,
            address(fotErc20),
            0,
            transferAmount,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        // 5% fee means Lightbid actually received 950 ether
        uint256 expectedReceived = 950 ether;
        assertEq(fotErc20.balanceOf(address(marketplace)), expectedReceived);

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(a.amount, expectedReceived);
    }

    function test_CreateAuction_ERC20Allowlist() public {
        erc20.mint(seller, 100 ether);

        vm.prank(owner);
        marketplace.setErc20AllowlistEnabled(true);

        vm.startPrank(seller);
        erc20.approve(address(marketplace), 100 ether);

        // Should revert because token is not allowed
        vm.expectRevert(abi.encodeWithSelector(ILightbid.AssetNotAllowed.selector, address(erc20)));
        marketplace.createAuction(
            ILightbid.AssetType.ERC20,
            address(erc20),
            0,
            100 ether,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        // Allow token
        vm.prank(owner);
        marketplace.setErc20Allowed(address(erc20), true);

        // Now succeeds
        vm.prank(seller);
        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC20,
            address(erc20),
            0,
            100 ether,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        assertEq(auctionId, 1);
    }

    /* ------------------------------------------------------------------ */
    /* Bidding & Outbid Pull-Payments                                      */
    /* ------------------------------------------------------------------ */

    function _createDefault721Auction() internal returns (uint256) {
        uint256 tokenId = 10;
        erc721.mint(seller, tokenId);
        vm.startPrank(seller);
        erc721.approve(address(marketplace), tokenId);
        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC721,
            address(erc721),
            tokenId,
            1,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS, // 5%
            DEFAULT_DURATION
        );
        vm.stopPrank();
        return auctionId;
    }

    function test_PlaceBid_ReservePriceEnforcement() public {
        uint256 auctionId = _createDefault721Auction();

        // Below reserve price: 0.9 ether < 1.0 ether
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(ILightbid.ReservePriceNotMet.selector, 0.9 ether, DEFAULT_RESERVE));
        marketplace.placeBid{value: 0.9 ether}(auctionId);

        // Exactly reserve price: succeeds
        vm.prank(bidder1);
        marketplace.placeBid{value: 1 ether}(auctionId);

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(a.highestBid, 1 ether);
        assertEq(a.highestBidder, bidder1);
    }

    function test_PlaceBid_MinIncrementEnforcement() public {
        uint256 auctionId = _createDefault721Auction();

        // Bidder1 bids 1 ether
        vm.prank(bidder1);
        marketplace.placeBid{value: 1 ether}(auctionId);

        // Min increment is 5% = 0.05 ether. Min bid is 1.05 ether.
        // Bidder2 tries to bid 1.04 ether -> reverts
        vm.prank(bidder2);
        vm.expectRevert(abi.encodeWithSelector(ILightbid.BidIncrementTooLow.selector, 1.04 ether, 1.05 ether));
        marketplace.placeBid{value: 1.04 ether}(auctionId);

        // Bidder2 bids 1.05 ether -> succeeds
        vm.prank(bidder2);
        marketplace.placeBid{value: 1.05 ether}(auctionId);

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(a.highestBid, 1.05 ether);
        assertEq(a.highestBidder, bidder2);
    }

    function test_PlaceBid_OutbidPullPaymentRefund() public {
        uint256 auctionId = _createDefault721Auction();

        // Bidder1 bids 1 ether
        vm.prank(bidder1);
        marketplace.placeBid{value: 1 ether}(auctionId);

        // Bidder2 bids 2 ether, outbidding Bidder1
        vm.prank(bidder2);
        marketplace.placeBid{value: 2 ether}(auctionId);

        // Bidder1 should have 1 ether in pendingReturns
        assertEq(marketplace.pendingReturns(bidder1), 1 ether);

        // Bidder1 withdraws
        uint256 balanceBefore = bidder1.balance;
        vm.prank(bidder1);
        vm.expectEmit(true, false, false, true);
        emit Withdrawal(bidder1, 1 ether);
        marketplace.withdraw();

        assertEq(bidder1.balance, balanceBefore + 1 ether);
        assertEq(marketplace.pendingReturns(bidder1), 0);
    }

    function test_Withdraw_RevertWhenNoFunds() public {
        vm.prank(bidder1);
        vm.expectRevert(ILightbid.NoPendingReturns.selector);
        marketplace.withdraw();
    }

    /* ------------------------------------------------------------------ */
    /* Anti-Sniping Extension                                              */
    /* ------------------------------------------------------------------ */

    function test_AntiSnipe_Extension() public {
        uint256 auctionId = _createDefault721Auction();
        ILightbid.Auction memory aBefore = marketplace.getAuction(auctionId);
        uint256 initialEndTime = aBefore.endTime;

        // Warp to 5 minutes before end time (inside 10-minute EXTENSION_WINDOW)
        vm.warp(initialEndTime - 5 minutes);

        vm.prank(bidder1);
        vm.expectEmit(true, false, false, true);
        emit AuctionExtended(auctionId, initialEndTime + marketplace.EXTENSION_DURATION());
        marketplace.placeBid{value: 1 ether}(auctionId);

        ILightbid.Auction memory aAfter = marketplace.getAuction(auctionId);
        assertEq(aAfter.endTime, initialEndTime + marketplace.EXTENSION_DURATION());
    }

    function test_AntiSnipe_NoExtensionWhenOutsideWindow() public {
        uint256 auctionId = _createDefault721Auction();
        ILightbid.Auction memory aBefore = marketplace.getAuction(auctionId);
        uint256 initialEndTime = aBefore.endTime;

        // Warp to 20 minutes before end time (outside 10-minute window)
        vm.warp(initialEndTime - 20 minutes);

        vm.prank(bidder1);
        marketplace.placeBid{value: 1 ether}(auctionId);

        ILightbid.Auction memory aAfter = marketplace.getAuction(auctionId);
        assertEq(aAfter.endTime, initialEndTime);
    }

    /* ------------------------------------------------------------------ */
    /* Settlement Tests                                                    */
    /* ------------------------------------------------------------------ */

    function test_Settle_WithBids_ERC721() public {
        uint256 auctionId = _createDefault721Auction();

        vm.prank(bidder1);
        marketplace.placeBid{value: 10 ether}(auctionId);

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        vm.warp(a.endTime + 1);

        uint256 sellerBalanceBefore = seller.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;

        // Fee is 2.5% of 10 ether = 0.25 ether. Seller proceeds = 9.75 ether.
        uint256 expectedFee = 0.25 ether;
        uint256 expectedProceeds = 9.75 ether;

        vm.expectEmit(true, true, true, true);
        emit AuctionSettled(auctionId, bidder1, seller, 10 ether, expectedFee);
        marketplace.settle(auctionId);

        // Check balances
        assertEq(seller.balance, sellerBalanceBefore + expectedProceeds);
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + expectedFee);

        // Winner receives NFT
        assertEq(erc721.ownerOf(10), bidder1);

        // Check auction state
        ILightbid.Auction memory settledAuction = marketplace.getAuction(auctionId);
        assertEq(uint8(settledAuction.status), uint8(ILightbid.AuctionStatus(1))); // Settled
    }

    function test_Settle_WithBids_ERC1155() public {
        uint256 tokenId = 7;
        erc1155.mint(seller, tokenId, 50);

        vm.startPrank(seller);
        erc1155.setApprovalForAll(address(marketplace), true);
        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC1155,
            address(erc1155),
            tokenId,
            50,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        vm.prank(bidder1);
        marketplace.placeBid{value: 2 ether}(auctionId);

        vm.warp(block.timestamp + DEFAULT_DURATION + 1);
        marketplace.settle(auctionId);

        assertEq(erc1155.balanceOf(bidder1, tokenId), 50);
    }

    function test_Settle_WithBids_ERC20() public {
        erc20.mint(seller, 500 ether);

        vm.startPrank(seller);
        erc20.approve(address(marketplace), 500 ether);
        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC20,
            address(erc20),
            0,
            500 ether,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        vm.prank(bidder1);
        marketplace.placeBid{value: 5 ether}(auctionId);

        vm.warp(block.timestamp + DEFAULT_DURATION + 1);
        marketplace.settle(auctionId);

        assertEq(erc20.balanceOf(bidder1), 500 ether);
    }

    function test_Settle_NoBids() public {
        uint256 auctionId = _createDefault721Auction();

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        vm.warp(a.endTime + 1);

        marketplace.settle(auctionId);

        // NFT returned to seller
        assertEq(erc721.ownerOf(10), seller);

        ILightbid.Auction memory settled = marketplace.getAuction(auctionId);
        assertEq(uint8(settled.status), uint8(ILightbid.AuctionStatus.Settled));
        assertEq(settled.highestBidder, address(0));
    }

    function test_Settle_RevertIfStillActive() public {
        uint256 auctionId = _createDefault721Auction();
        vm.expectRevert();
        marketplace.settle(auctionId);
    }

    /* ------------------------------------------------------------------ */
    /* Cancellation Tests                                                  */
    /* ------------------------------------------------------------------ */

    function test_CancelAuction_Success() public {
        uint256 auctionId = _createDefault721Auction();

        vm.prank(seller);
        vm.expectEmit(true, true, false, false);
        emit AuctionCancelled(auctionId, seller);
        marketplace.cancelAuction(auctionId);

        // Asset returned to seller
        assertEq(erc721.ownerOf(10), seller);

        ILightbid.Auction memory a = marketplace.getAuction(auctionId);
        assertEq(uint8(a.status), uint8(ILightbid.AuctionStatus.Cancelled));
    }

    function test_CancelAuction_RevertIfBids() public {
        uint256 auctionId = _createDefault721Auction();

        vm.prank(bidder1);
        marketplace.placeBid{value: 1 ether}(auctionId);

        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(ILightbid.AuctionHasBids.selector, auctionId));
        marketplace.cancelAuction(auctionId);
    }

    function test_CancelAuction_RevertIfNotSeller() public {
        uint256 auctionId = _createDefault721Auction();

        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(ILightbid.NotSeller.selector, bidder1, seller));
        marketplace.cancelAuction(auctionId);
    }

    /* ------------------------------------------------------------------ */
    /* Security & Reentrancy Tests                                         */
    /* ------------------------------------------------------------------ */

    function test_ReentrancyAttack_MaliciousBidder_Withdraw() public {
        MaliciousBidder malicious = new MaliciousBidder(address(marketplace));
        vm.deal(address(malicious), 10 ether);

        uint256 auctionId = _createDefault721Auction();

        // Malicious contract bids 1 ether
        malicious.placeBid{value: 1 ether}(auctionId);

        // Bidder2 outbids with 2 ether
        vm.prank(bidder2);
        marketplace.placeBid{value: 2 ether}(auctionId);

        assertEq(marketplace.pendingReturns(address(malicious)), 1 ether);

        // Configure malicious contract to attempt reentrant withdraw in its receive hook
        malicious.setAttackConfig(true, false, false, auctionId, 0);

        // Reentrant call fails because ReentrancyGuard is active or balance is 0.
        // The outer withdraw should either revert due to reentrancy or complete safely without double payout.
        vm.expectRevert();
        malicious.withdraw();
    }

    function test_Settlement_WhenSellerRejectsEth() public {
        // Deploy malicious contract configured to revert on receiving ETH
        MaliciousBidder rejectingSeller = new MaliciousBidder(address(marketplace));

        uint256 tokenId = 99;
        erc721.mint(address(rejectingSeller), tokenId);

        // Seller creates auction
        vm.startPrank(address(rejectingSeller));
        erc721.approve(address(marketplace), tokenId);
        uint256 auctionId = marketplace.createAuction(
            ILightbid.AssetType.ERC721,
            address(erc721),
            tokenId,
            1,
            DEFAULT_RESERVE,
            DEFAULT_INCREMENT_BPS,
            DEFAULT_DURATION
        );
        vm.stopPrank();

        // Rejecting seller enables revert on receive
        rejectingSeller.setAttackConfig(false, false, true, 0, 0);

        // Bidder1 bids 5 ether
        vm.prank(bidder1);
        marketplace.placeBid{value: 5 ether}(auctionId);

        // Warp past end time
        vm.warp(block.timestamp + DEFAULT_DURATION + 1);

        // Settlement must NOT revert despite seller rejecting ETH!
        marketplace.settle(auctionId);

        // Winner gets the NFT
        assertEq(erc721.ownerOf(tokenId), bidder1);

        // Seller's proceeds are safely escrowed in pendingReturns
        uint256 fee = (5 ether * INITIAL_FEE_BPS) / 10000;
        uint256 sellerProceeds = 5 ether - fee;
        assertEq(marketplace.pendingReturns(address(rejectingSeller)), sellerProceeds);
    }

    /* ------------------------------------------------------------------ */
    /* Fuzz Testing                                                        */
    /* ------------------------------------------------------------------ */

    function testFuzz_BidSequence(uint256 b1, uint256 b2, uint256 b3) public {
        // Constrain bids to realistic values
        b1 = bound(b1, 1 ether, 50 ether);
        // Ensure b2 satisfies min increment (5%)
        uint256 minB2 = b1 + (b1 * DEFAULT_INCREMENT_BPS) / 10000;
        b2 = bound(b2, minB2, minB2 + 50 ether);
        // Ensure b3 satisfies min increment (5%)
        uint256 minB3 = b2 + (b2 * DEFAULT_INCREMENT_BPS) / 10000;
        b3 = bound(b3, minB3, minB3 + 50 ether);

        vm.deal(bidder1, b1);
        vm.deal(bidder2, b2);
        vm.deal(bidder3, b3);

        uint256 auctionId = _createDefault721Auction();

        vm.prank(bidder1);
        marketplace.placeBid{value: b1}(auctionId);

        vm.prank(bidder2);
        marketplace.placeBid{value: b2}(auctionId);

        vm.prank(bidder3);
        marketplace.placeBid{value: b3}(auctionId);

        // Check pending returns
        assertEq(marketplace.pendingReturns(bidder1), b1);
        assertEq(marketplace.pendingReturns(bidder2), b2);
        assertEq(marketplace.pendingReturns(bidder3), 0);

        // Check global balance invariant: contract holds highestBid + sum of pending returns
        uint256 expectedContractBalance = b3 + b1 + b2;
        assertEq(address(marketplace).balance, expectedContractBalance);
    }
}
