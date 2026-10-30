// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title TestERC721 (LNFT)
 * @notice Testnet-only NFT. Anyone can mint by passing their own tokenURI (e.g. ipfs://<CID>).
 * @dev Enumerable so the frontend can list a wallet's NFTs with only an RPC connection.
 */
contract TestERC721 is ERC721, ERC721Enumerable, ERC721URIStorage {
    uint256 private _nextTokenId = 1;

    constructor() ERC721("Lightbid Test NFT", "LNFT") {}

    /// @notice Mint an NFT to the caller with the given tokenURI.
    function mint(string calldata uri) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _setTokenURI(tokenId, uri);
        _safeMint(msg.sender, tokenId);
    }

    // ---- Required overrides (ERC721 + ERC721Enumerable + ERC721URIStorage) ----

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}