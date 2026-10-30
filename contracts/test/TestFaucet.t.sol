// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TestERC20} from "../src/testnet/TestERC20.sol";
import {TestERC721} from "../src/testnet/TestERC721.sol";

contract TestFaucetTest is Test {
    TestERC20 public token;
    TestERC721 public nft;

    address public owner = address(this);
    address public user = address(0xCAFE);

    function setUp() public {
        token = new TestERC20();
        nft = new TestERC721();
    }

    /* ------------------------------------------------------------------ */
    /* TestERC20 Tests                                                     */
    /* ------------------------------------------------------------------ */

    function test_TestERC20_Decimals() public view {
        assertEq(token.decimals(), 6);
    }

    function test_TestERC20_FaucetClaimAndCooldown() public {
        vm.prank(user);
        token.faucet();

        assertEq(token.balanceOf(user), 1_000 * 10 ** 6);
        assertGt(token.faucetCooldownRemaining(user), 0);

        // Immediate second claim should revert due to cooldown
        vm.prank(user);
        vm.expectRevert();
        token.faucet();

        // Warp past 1 hour cooldown
        vm.warp(block.timestamp + 1 hours + 1);
        assertEq(token.faucetCooldownRemaining(user), 0);

        // Second claim now succeeds
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), 2_000 * 10 ** 6);
    }

    function test_TestERC20_OwnerMint() public {
        token.mint(user, 50_000 * 10 ** 6);
        assertEq(token.balanceOf(user), 50_000 * 10 ** 6);

        // Non-owner mint must revert
        vm.prank(user);
        vm.expectRevert();
        token.mint(user, 100);
    }

    /* ------------------------------------------------------------------ */
    /* TestERC721 Tests                                                    */
    /* ------------------------------------------------------------------ */

    function test_TestERC721_MintWithURI() public {
        string memory testUri = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

        vm.prank(user);
        uint256 tokenId = nft.mint(testUri);

        assertEq(tokenId, 1);
        assertEq(nft.ownerOf(tokenId), user);
        assertEq(nft.tokenURI(tokenId), testUri);
        assertEq(nft.balanceOf(user), 1);
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.tokenOfOwnerByIndex(user, 0), tokenId);
    }
}
