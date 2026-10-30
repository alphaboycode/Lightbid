// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ILightbid
 * @notice Interface for the Lightbid auction marketplace supporting ERC-721, ERC-1155, and ERC-20 assets.
 */
interface ILightbid {
    /* ------------------------------------------------------------------ */
    /* Enums                                                               */
    /* ------------------------------------------------------------------ */

    enum AssetType {
        ERC721,
        ERC1155,
        ERC20
    }

    enum AuctionStatus {
        Active,
        Settled,
        Cancelled
    }

    /* ------------------------------------------------------------------ */
    /* Structs                                                             */
    /* ------------------------------------------------------------------ */

    struct Auction {
        uint256 id;
        address seller;
        AssetType assetType;
        address token;
        uint256 tokenId;
        uint256 amount;
        address paymentToken; // address(0) for native BOT (v1)
        uint256 reservePrice;
        uint256 minIncrementBps;
        uint256 highestBid;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        AuctionStatus status;
    }

    /* ------------------------------------------------------------------ */
    /* Events                                                              */
    /* ------------------------------------------------------------------ */

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        AssetType assetType,
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

    event AuctionExtended(
        uint256 indexed auctionId,
        uint256 newEndTime
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        address indexed seller,
        uint256 amount,
        uint256 fee
    );

    event AuctionCancelled(
        uint256 indexed auctionId,
        address indexed seller
    );

    event Withdrawal(
        address indexed user,
        uint256 amount
    );

    event FeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed newFeeRecipient);
    event Erc20AllowlistToggled(bool enabled);
    event Erc20AllowlistUpdated(address indexed token, bool allowed);

    /* ------------------------------------------------------------------ */
    /* Custom Errors                                                       */
    /* ------------------------------------------------------------------ */

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDuration(uint256 duration, uint256 min, uint256 max);
    error InvalidIncrementBps(uint256 bps, uint256 min, uint256 max);
    error InvalidReservePrice();
    error InvalidFeeBps(uint256 bps, uint256 max);
    error AssetNotAllowed(address token);
    error UnsupportedPaymentToken(address token);
    error BatchNotSupported();
    error AuctionDoesNotExist(uint256 auctionId);
    error AuctionNotActive(uint256 auctionId);
    error AuctionStillActive(uint256 auctionId, uint256 endTime);
    error AuctionAlreadyEnded(uint256 auctionId, uint256 endTime);
    error AuctionHasBids(uint256 auctionId);
    error ReservePriceNotMet(uint256 bid, uint256 reservePrice);
    error BidIncrementTooLow(uint256 bid, uint256 minBid);
    error NotSeller(address caller, address seller);
    error NoPendingReturns();
    error EthTransferFailed();

    /* ------------------------------------------------------------------ */
    /* Functions                                                           */
    /* ------------------------------------------------------------------ */

    function createAuction(
        AssetType assetType,
        address token,
        uint256 tokenId,
        uint256 amount,
        uint256 reservePrice,
        uint256 minIncrementBps,
        uint256 duration
    ) external returns (uint256 auctionId);

    function placeBid(uint256 auctionId) external payable;

    function settle(uint256 auctionId) external;

    function cancelAuction(uint256 auctionId) external;

    function withdraw() external;

    function getAuction(uint256 auctionId) external view returns (Auction memory);

    function pendingReturns(address user) external view returns (uint256);
}
