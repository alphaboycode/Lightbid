// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Lightbid} from "../src/Lightbid.sol";
import {TestERC20} from "../src/testnet/TestERC20.sol";
import {TestERC721} from "../src/testnet/TestERC721.sol";

/**
 * @title DeployScript
 * @notice Deploys Lightbid, TestERC20 (tUSD) and TestERC721 (LNFT) on Botchain Testnet (Chain ID: 968).
 * @dev Requires DEPLOYER in .env (or defaults to msg.sender). That address becomes the Lightbid owner and fee recipient,
 *      and must be the wallet unlocked by --account.
 *
 *   .env:
 *     DEPLOYER=0x44311F227048df7e80292A54286a266aA1CEDe52
 *     FEE_BPS=250            # optional, default 250 (2.5%), max 1000
 *
 *   Usage:
 *   forge script script/Deploy.s.sol:DeployScript \
 *     --rpc-url botchain \
 *     --account lightbid \
 *     --password <password> \
 *     --broadcast
 */
contract DeployScript is Script {
    function run()
        external
        returns (
            Lightbid marketplace,
            TestERC20 testToken,
            TestERC721 testNft
        )
    {
        address deployer = vm.envOr("DEPLOYER", msg.sender);
        if (deployer == address(0)) {
            deployer = msg.sender;
        }
        uint256 feeBps = vm.envOr("FEE_BPS", uint256(250)); // Default: 2.5%

        require(deployer != address(0), "DEPLOYER is zero address");
        require(feeBps <= 1000, "FEE_BPS exceeds Lightbid MAX_FEE_BPS (1000)");

        console.log("Deploying Lightbid Ecosystem on Botchain. Chain ID:", block.chainid);
        console.log("Deployer / Owner:", deployer);
        console.log("Fee Recipient:", deployer);
        console.log("Fee BPS:", feeBps);
        console.log("==================================================");

        // Passing the address makes forge sign with exactly this wallet.
        // If --account's keystore is a different address, forge errors before sending anything.
        vm.startBroadcast(deployer);

        // 1. Marketplace: constructor(initialOwner, initialFeeRecipient, initialFeeBps)
        marketplace = new Lightbid(deployer, deployer, feeBps);
        console.log("1. Lightbid deployed at:", address(marketplace));

        // 2. Test ERC-20 (tUSD, 6 decimals, public faucet). Owner = deployer.
        testToken = new TestERC20();
        console.log("2. TestERC20 (tUSD) deployed at:", address(testToken));

        // 3. Test ERC-721 (LNFT, mint with your own tokenURI). Enumerable.
        testNft = new TestERC721();
        console.log("3. TestERC721 (LNFT) deployed at:", address(testNft));

        vm.stopBroadcast();

        // Sanity check
        require(marketplace.owner() == deployer, "Owner mismatch");

        console.log("==================================================");
        console.log("Deployment Complete! Add to web/.env:");
        console.log("VITE_LIGHTBID_ADDRESS=", address(marketplace));
        console.log("VITE_TEST_ERC20_ADDRESS=", address(testToken));
        console.log("VITE_TEST_ERC721_ADDRESS=", address(testNft));
        console.log("==================================================");
    }
}