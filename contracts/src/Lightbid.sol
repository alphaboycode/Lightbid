// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {ILightbid} from "./interfaces/ILightbid.sol";

/**
 * @title Lightbid
 * @notice English auction marketplace for NFTs (ERC-721 and ERC-1155) and ERC-20 tokens on Botchain.
 * @dev Bids are placed in native BOT (v1). Escrowed assets and pull-payments follow Checks-Effects-Interactions.
 */
contract Lightbid is ILightbid, Ownable2Step, Pausable, ReentrancyGuard, IERC721Receiver, IERC1155Receiver {
    using SafeERC20 for IERC20;

    /* ------------------------------------------------------------------ */
    /* Constants                                                           */
    /* ------------------------------------------------------------------ */

    /// @notice Anti-sniping extension window: bids within this window before end time trigger an extension.
    uint256 public constant EXTENSION_WINDOW = 10 minutes;

    /// @notice Anti-sniping extension duration added to the auction end time.
    uint256 public constant EXTENSION_DURATION = 10 minutes;

    /// @notice Minimum auction duration (15 minutes).
    uint256 public constant MIN_DURATION = 15 minutes;

    /// @notice Maximum auction duration (30 days).
    uint256 public constant MAX_DURATION = 30 days;

    /// @notice Minimum bid increment basis points (100 bps = 1%).
    uint256 public constant MIN_INCREMENT_BPS = 100;

    /// @notice Maximum bid increment basis points (5000 bps = 50%).
    uint256 public constant MAX_INCREMENT_BPS = 5000;

    /// @notice Maximum platform fee basis points (1000 bps = 10%).
    uint256 public constant MAX_FEE_BPS = 1000;

    /// @notice Basis points denominator (10,000 = 100%).
    uint256 public constant BPS_DENOMINATOR = 10000;

    /* ------------------------------------------------------------------ */
    /* Storage                                                             */
    /* ------------------------------------------------------------------ */

    /// @notice Total auctions created.
    uint256 public totalAuctions;

    /// @notice Platform fee in basis points (e.g. 250 = 2.5%).
    uint256 public feeBps;

    /// @notice Recipient address for platform fees.
    address public feeRecipient;

    /// @notice Whether the ERC-20 listing allowlist is enabled.
    bool public isErc20AllowlistEnabled;

    /// @notice Mapping from ERC-20 token address to allowlist status.
    mapping(address => bool) public isErc20Allowed;

    /// @notice Auctions mapped by auction ID.
    mapping(uint256 => Auction) private _auctions;

    /// @notice Pending returns for outbid bidders and fallbacks.
    mapping(address => uint256) public override pendingReturns;

    /* ------------------------------------------------------------------ */
    /* Constructor                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * @param initialOwner Initial contract owner.
     * @param initialFeeRecipient Address receiving platform fees.
     * @param initialFeeBps Platform fee in basis points (capped at MAX_FEE_BPS).
     */
    constructor(
        address initialOwner,
        address initialFeeRecipient,
        uint256 initialFeeBps
    ) Ownable(initialOwner) {
        if (initialFeeRecipient == address(0)) revert ZeroAddress();
        if (initialFeeBps > MAX_FEE_BPS) revert InvalidFeeBps(initialFeeBps, MAX_FEE_BPS);

        feeRecipient = initialFeeRecipient;
        feeBps = initialFeeBps;

        emit FeeRecipientUpdated(initialFeeRecipient);
        emit FeeUpdated(initialFeeBps);
    }

    /* ------------------------------------------------------------------ */
    /* Auction Actions                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * @notice Creates an auction and escrows the listed asset.
     * @param assetType Type of asset (ERC721, ERC1155, or ERC20).
     * @param token Address of the token contract.
     * @param tokenId Token ID (ignored for ERC20).
     * @param amount Amount to auction (must be 1 for ERC721).
     * @param reservePrice Minimum starting bid in native BOT (wei).
     * @param minIncrementBps Minimum bid increment in basis points (100 to 5000 bps).
     * @param duration Auction length in seconds (between MIN_DURATION and MAX_DURATION).
     * @return auctionId The newly assigned auction ID.
     */
    function createAuction(
        AssetType assetType,
        address token,
        uint256 tokenId,
        uint256 amount,
        uint256 reservePrice,
        uint256 minIncrementBps,
        uint256 duration
    ) external override whenNotPaused nonReentrant returns (uint256 auctionId) {
        if (token == address(0)) revert ZeroAddress();
        if (reservePrice == 0) revert InvalidReservePrice();
        if (duration < MIN_DURATION || duration > MAX_DURATION) {
            revert InvalidDuration(duration, MIN_DURATION, MAX_DURATION);
        }
        if (minIncrementBps < MIN_INCREMENT_BPS || minIncrementBps > MAX_INCREMENT_BPS) {
            revert InvalidIncrementBps(minIncrementBps, MIN_INCREMENT_BPS, MAX_INCREMENT_BPS);
        }

        if (assetType == AssetType.ERC20) {
            if (isErc20AllowlistEnabled && !isErc20Allowed[token]) {
                revert AssetNotAllowed(token);
            }
            if (amount == 0) revert ZeroAmount();
        } else if (assetType == AssetType.ERC721) {
            amount = 1;
        } else if (assetType == AssetType.ERC1155) {
            if (amount == 0) revert ZeroAmount();
        }

        // Escrow the asset from the seller. Returns the actual amount received (handles fee-on-transfer ERC-20s).
        uint256 actualAmount = _transferAssetIn(assetType, token, tokenId, amount);

        auctionId = ++totalAuctions;
        uint256 endTime = block.timestamp + duration;

        _auctions[auctionId] = Auction({
            id: auctionId,
            seller: msg.sender,
            assetType: assetType,
            token: token,
            tokenId: tokenId,
            amount: actualAmount,
            paymentToken: address(0), // Native BOT (v1)
            reservePrice: reservePrice,
            minIncrementBps: minIncrementBps,
            highestBid: 0,
            highestBidder: address(0),
            startTime: block.timestamp,
            endTime: endTime,
            status: AuctionStatus.Active
        });

        emit AuctionCreated(
            auctionId,
            msg.sender,
            assetType,
            token,
            tokenId,
            actualAmount,
            reservePrice,
            minIncrementBps,
            endTime
        );
    }

    /**
     * @notice Places a native BOT bid on an active auction.
     * @param auctionId The auction identifier.
     */
    function placeBid(uint256 auctionId) external payable override whenNotPaused nonReentrant {
        Auction storage auction = _auctions[auctionId];
        if (auction.seller == address(0)) revert AuctionDoesNotExist(auctionId);
        if (auction.status != AuctionStatus.Active) revert AuctionNotActive(auctionId);
        if (block.timestamp >= auction.endTime) revert AuctionAlreadyEnded(auctionId, auction.endTime);

        uint256 bidAmount = msg.value;
        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        if (previousBidder == address(0)) {
            // First bid must meet or exceed the reserve price
            if (bidAmount < auction.reservePrice) {
                revert ReservePriceNotMet(bidAmount, auction.reservePrice);
            }
        } else {
            // Subsequent bids must exceed previous bid by at least minIncrementBps
            uint256 minIncrement = (previousBid * auction.minIncrementBps) / BPS_DENOMINATOR;
            uint256 minBid = previousBid + minIncrement;
            if (bidAmount < minBid) {
                revert BidIncrementTooLow(bidAmount, minBid);
            }

            // Pull-payment: credit previous bidder's funds to pendingReturns
            pendingReturns[previousBidder] += previousBid;
        }

        auction.highestBid = bidAmount;
        auction.highestBidder = msg.sender;

        // Anti-sniping check: extend if bid within the EXTENSION_WINDOW
        if (auction.endTime - block.timestamp <= EXTENSION_WINDOW) {
            auction.endTime += EXTENSION_DURATION;
            emit AuctionExtended(auctionId, auction.endTime);
        }

        emit BidPlaced(auctionId, msg.sender, bidAmount, auction.endTime);
    }

    /**
     * @notice Settles an ended auction, distributing proceeds and the escrowed asset.
     * @param auctionId The auction identifier.
     */
    function settle(uint256 auctionId) external override nonReentrant {
        Auction storage auction = _auctions[auctionId];
        if (auction.seller == address(0)) revert AuctionDoesNotExist(auctionId);
        if (auction.status != AuctionStatus.Active) revert AuctionNotActive(auctionId);
        if (block.timestamp < auction.endTime) revert AuctionStillActive(auctionId, auction.endTime);

        auction.status = AuctionStatus.Settled;

        address winner = auction.highestBidder;
        uint256 highestBid = auction.highestBid;
        uint256 fee = 0;

        if (winner != address(0)) {
            // Calculate platform fee and seller proceeds
            fee = (highestBid * feeBps) / BPS_DENOMINATOR;
            uint256 sellerProceeds = highestBid - fee;

            // Transfer platform fee if any
            if (fee > 0) {
                _safeTransferEthWithFallback(feeRecipient, fee);
            }

            // Transfer seller proceeds
            _safeTransferEthWithFallback(auction.seller, sellerProceeds);

            // Transfer escrowed asset to the winning bidder
            _transferAssetOut(auction.assetType, auction.token, auction.tokenId, auction.amount, winner);
        } else {
            // No bids placed: return asset to the seller
            _transferAssetOut(auction.assetType, auction.token, auction.tokenId, auction.amount, auction.seller);
        }

        emit AuctionSettled(auctionId, winner, auction.seller, highestBid, fee);
    }

    /**
     * @notice Cancels an auction with no bids, returning the asset to the seller.
     * @param auctionId The auction identifier.
     */
    function cancelAuction(uint256 auctionId) external override nonReentrant {
        Auction storage auction = _auctions[auctionId];
        if (auction.seller == address(0)) revert AuctionDoesNotExist(auctionId);
        if (auction.status != AuctionStatus.Active) revert AuctionNotActive(auctionId);
        if (msg.sender != auction.seller) revert NotSeller(msg.sender, auction.seller);
        if (auction.highestBidder != address(0)) revert AuctionHasBids(auctionId);

        auction.status = AuctionStatus.Cancelled;

        _transferAssetOut(auction.assetType, auction.token, auction.tokenId, auction.amount, auction.seller);

        emit AuctionCancelled(auctionId, msg.sender);
    }

    /**
     * @notice Withdraws the caller's outbid refunds or pending funds.
     */
    function withdraw() external override nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        if (amount == 0) revert NoPendingReturns();

        pendingReturns[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert EthTransferFailed();

        emit Withdrawal(msg.sender, amount);
    }

    /* ------------------------------------------------------------------ */
    /* View Functions                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * @notice Returns full auction details.
     * @param auctionId The auction identifier.
     */
    function getAuction(uint256 auctionId) external view override returns (Auction memory) {
        Auction memory auction = _auctions[auctionId];
        if (auction.seller == address(0)) revert AuctionDoesNotExist(auctionId);
        return auction;
    }

    /* ------------------------------------------------------------------ */
    /* Admin Functions                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * @notice Sets platform fee in basis points.
     * @param _feeBps New fee in basis points (max 1000 = 10%).
     */
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFeeBps(_feeBps, MAX_FEE_BPS);
        feeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    /**
     * @notice Sets fee recipient address.
     * @param _feeRecipient New recipient address.
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @notice Enables or disables ERC-20 allowlist enforcement.
     * @param _enabled True to enforce allowlist, false to permit all ERC-20s.
     */
    function setErc20AllowlistEnabled(bool _enabled) external onlyOwner {
        isErc20AllowlistEnabled = _enabled;
        emit Erc20AllowlistToggled(_enabled);
    }

    /**
     * @notice Sets allowlist status for an ERC-20 token.
     * @param token Address of the ERC-20 token.
     * @param allowed True to allow, false to forbid.
     */
    function setErc20Allowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        isErc20Allowed[token] = allowed;
        emit Erc20AllowlistUpdated(token, allowed);
    }

    /**
     * @notice Pauses auction creation and bidding.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses auction creation and bidding.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /* ------------------------------------------------------------------ */
    /* Internal Helpers                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * @dev Escrows asset from caller into this contract.
     * Measures balance change for ERC-20 to support fee-on-transfer tokens.
     */
    function _transferAssetIn(
        AssetType assetType,
        address token,
        uint256 tokenId,
        uint256 amount
    ) internal returns (uint256 actualAmount) {
        if (assetType == AssetType.ERC721) {
            IERC721(token).safeTransferFrom(msg.sender, address(this), tokenId);
            return 1;
        } else if (assetType == AssetType.ERC1155) {
            IERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
            return amount;
        } else if (assetType == AssetType.ERC20) {
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            uint256 balanceAfter = IERC20(token).balanceOf(address(this));
            actualAmount = balanceAfter - balanceBefore;
            if (actualAmount == 0) revert ZeroAmount();
            return actualAmount;
        }
        revert ZeroAddress();
    }

    /**
     * @dev Transfers escrowed asset out to recipient.
     */
    function _transferAssetOut(
        AssetType assetType,
        address token,
        uint256 tokenId,
        uint256 amount,
        address to
    ) internal {
        if (assetType == AssetType.ERC721) {
            IERC721(token).safeTransferFrom(address(this), to, tokenId);
        } else if (assetType == AssetType.ERC1155) {
            IERC1155(token).safeTransferFrom(address(this), to, tokenId, amount, "");
        } else if (assetType == AssetType.ERC20) {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @dev Transfers native BOT. If the recipient contract reverts or rejects,
     * credits amount to pendingReturns to prevent settlement DoS.
     */
    function _safeTransferEthWithFallback(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            pendingReturns[to] += amount;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Receiver Hooks & ERC165                                             */
    /* ------------------------------------------------------------------ */

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert BatchNotSupported();
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
