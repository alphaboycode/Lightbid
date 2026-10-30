# ⚡ Lightbid

> **Every bid counts. Every auction ends fair.**  
> Decentralized English auction marketplace for NFTs and tokens on **Botchain Testnet**.

[![Network: Botchain Testnet](https://img.shields.io/badge/Network-Botchain_Testnet_(968)-f59e0b?style=flat-square)](https://scan.bohr.life)
[![Solidity: 0.8.24](https://img.shields.io/badge/Solidity-0.8.24-blue?style=flat-square)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)
[![IPFS: Pinata Cloud](https://img.shields.io/badge/Storage-Pinata_IPFS-cyan?style=flat-square)](https://pinata.cloud)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Deployed Contracts (Botchain Testnet)](#deployed-contracts-botchain-testnet)
- [Architecture & Protocol Design](#architecture--protocol-design)
  - [Anti-Snipe Clock Extension](#1-anti-snipe-clock-extension)
  - [Pull-Payment Escrow & Refunds](#2-pull-payment-escrow--refunds)
  - [Multi-Asset Support](#3-multi-asset-support)
  - [Protocol Fees](#4-protocol-fees)
- [Project Structure](#project-structure)
- [Smart Contracts (Foundry)](#smart-contracts-foundry)
  - [Prerequisites](#prerequisites)
  - [Build & Test](#build--test)
  - [Deployment](#deployment)
- [Frontend Application (Web)](#frontend-application-web)
  - [Tech Stack](#tech-stack)
  - [Configuration](#configuration)
  - [Running Locally](#running-locally)
  - [Production Build](#production-build)
- [Pinata IPFS Integration](#pinata-ipfs-integration)
- [Security Auditing & Invariants](#security-auditing--invariants)
- [License](#license)

---

## 🌟 Overview

**Lightbid** is an English auction marketplace built for **Botchain Testnet** (Chain ID: `968`). 

Traditional web3 auctions suffer from last-second bot front-running ("sniping") and failed bid refunds caused by malicious contracts that revert upon receiving funds. Lightbid solves both issues at the protocol level:
1. **Dynamic Anti-Snipe**: Any bid placed within 10 minutes of auction completion automatically extends the clock by 10 minutes, ensuring every legitimate bidder has time to respond.
2. **Safe Pull Payments**: Outbid funds are credited to an escrow ledger (`pendingReturns`), allowing bidders to withdraw their funds safely without risking auction lockouts or reentrancy exploits.

---

## ✨ Key Features

- **Multi-Standard Asset Auctions**:
  - **ERC-721**: Single NFTs with direct metadata rendering.
  - **ERC-1155**: Multi-token batch auctions and semi-fungible editions.
  - **ERC-20**: Token bundle auctions (optional allowlist protection for verified tokens).
- **Native BOT Bidding**: Bids are denominated in native `BOT` with zero wrapped-token friction.
- **Fair Anti-Snipe Mechanism**: Guaranteed 10-minute window extension on last-minute bids (`EXTENSION_WINDOW = 10 min`, `EXTENSION_DURATION = 10 min`).
- **One-Click Outbid Refund Claims**: Persistent navbar indicator and dedicated banner to withdraw outbid escrow balances instantly.
- **Pinata IPFS Minting Workflow**: Integrated media uploader and ERC-721 compliant JSON metadata generator pinned directly to Pinata IPFS.
- **Testnet Token Faucet**: In-app faucet dispensing 1,000 `tUSD` with cooldown protection and one-click MetaMask asset import.

---

## 🚀 Deployed Contracts (Botchain Testnet)

The core marketplace and test tokens are deployed and live on **Botchain Testnet**:

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **Lightbid Marketplace** | `0x39FfB249F207a2583Be272d2f55AcebE0d09b2b8` | [View on Explorer](https://scan.bohr.life/address/0x39FfB249F207a2583Be272d2f55AcebE0d09b2b8) |
| **TestERC20 (tUSD)** | `0x249D23b4c2e58cf40eB0273e6afCE8d23170d82d` | [View on Explorer](https://scan.bohr.life/address/0x249D23b4c2e58cf40eB0273e6afCE8d23170d82d) |
| **TestERC721 (LNFT)** | `0xD8c92E8e8ECe7F00C947eB2C12Cdb2A110f9B63b` | [View on Explorer](https://scan.bohr.life/address/0xD8c92E8e8ECe7F00C947eB2C12Cdb2A110f9B63b) |

### Botchain Testnet RPC & Network Details

- **Network Name**: Botchain Testnet
- **Chain ID**: `968`
- **RPC URL**: `https://rpc.bohr.life`
- **Native Token**: `BOT`
- **Total Supply**: `150 Million`
- **Decimals**: `18`
- **Block Explorer**: `https://scan.bohr.life`

---

## 🏛️ Architecture & Protocol Design

```
+-------------------------------------------------------------+
|                      Lightbid Protocol                      |
+-------------------------------------------------------------+
        │                                             │
        ▼                                             ▼
 [Create Auction]                              [Place Bid]
  - Transfers asset to escrow                   - Verifies bid >= reservePrice
  - Validates duration (15m - 30d)              - Verifies min increment BPS
  - Validates increment (1% - 50%)              - Anti-snipe check:
                                                    If endTime - now < 10m:
                                                    endTime += 10m
                                                - Credits previous bidder
                                                  in pendingReturns[bidder]
        │                                             │
        ▼                                             ▼
 [Settle Auction]                              [Withdraw Escrow]
  - Verifies block.timestamp >= endTime         - Bidders call
  - Transfers fee to feeRecipient                 withdrawPendingReturns()
  - Transfers balance to seller                 - Checks-Effects-Interactions
  - Transfers escrowed asset to winner            pattern prevents reentrancy
```

### 1. Anti-Snipe Clock Extension
```solidity
uint256 public constant EXTENSION_WINDOW = 10 minutes;
uint256 public constant EXTENSION_DURATION = 10 minutes;

if (auction.endTime - block.timestamp <= EXTENSION_WINDOW) {
    auction.endTime += EXTENSION_DURATION;
    emit AuctionExtended(auctionId, auction.endTime);
}
```
If a bid is received when less than 10 minutes remain on the clock, `endTime` is extended by an additional 10 minutes.

### 2. Pull-Payment Escrow & Refunds
Instead of pushing native tokens directly to the outbid bidder (which allows malicious contracts to reject transfers and freeze the auction), Lightbid records refunds in a pending ledger:
```solidity
pendingReturns[previousBidder] += previousBid;
```
Bidders can safely claim all accumulated refunds at any time via `withdrawPendingReturns()`.

### 3. Multi-Asset Support
Lightbid accepts standard ERC-721, ERC-1155, and ERC-20 assets:
- **ERC-721**: Uses `safeTransferFrom` and implements `IERC721Receiver`.
- **ERC-1155**: Handles semi-fungible amounts and implements `IERC1155Receiver`.
- **ERC-20**: Uses OpenZeppelin's `SafeERC20` with optional admin token allowlisting.

### 4. Protocol Fees
Configurable platform fee capped at `MAX_FEE_BPS = 1000` (10%). Default is set to 250 bps (2.5%), distributed to the `feeRecipient` upon auction settlement.

---

## 📁 Project Structure

```
Lightbid/
├── contracts/               # Foundry Smart Contracts
│   ├── src/
│   │   ├── Lightbid.sol     # Core marketplace contract
│   │   ├── interfaces/      # ILightbid interface & custom errors
│   │   └── testnet/         # TestERC20 (tUSD) & TestERC721 (LNFT)
│   ├── test/                # Foundry test suite (26 comprehensive tests)
│   ├── script/              # Deploy and operational scripts
│   └── foundry.toml         # Foundry build & RPC configuration
├── web/                     # React Frontend Application
│   ├── src/
│   │   ├── abi/             # Deployed contract ABIs
│   │   ├── components/      # UI components (Navbar, AuctionCard, Timer, etc.)
│   │   ├── config/          # Network & app configuration (appConfig.ts)
│   │   ├── lib/             # Pinata IPFS integration (ipfs.ts)
│   │   └── pages/           # Explore, AuctionDetail, Create, Mint, Faucet
│   ├── tailwind.config.js   # Tailwind design tokens & dark theme
│   └── vite.config.ts       # Vite bundler configuration
```

---

## 🛠️ Smart Contracts (Foundry)

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- Solidity version: `0.8.24`

### Build & Test

```bash
cd contracts

# Install dependencies (if not already fetched)
forge install

# Compile contracts
forge build

# Run test suite
forge test -vv
```

The test suite covers:
- Auction creation with valid/invalid parameters
- Bidding mechanics, reserve prices, and min increment checks
- Anti-sniping dynamic time extension trigger
- Safe pull-payment withdrawal and balance isolation
- Settlement with protocol fees and asset transfer
- Malicious contract reentrancy and revert resistance
- Admin controls (fees, recipient, pausing, allowlist)

### Deployment

Deploy to Botchain Testnet using Foundry script:

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url botchain \
  --account lightbid \
  --password papa4mama4 \
  --broadcast
```

---

## 💻 Frontend Application (Web)

### Tech Stack

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Web3 Integrations**: Wagmi v2, Viem, RainbowKit
- **Styling**: Tailwind CSS with custom dark glassmorphic UI
- **Icons**: Lucide React
- **Storage**: Pinata IPFS SDK / HTTP API

### Configuration

All contract addresses and network RPC configurations reside in [`web/src/config/appConfig.ts`](./web/src/config/appConfig.ts):

```typescript
export const APP_CONFIG = {
  network: {
    chainId: 968,
    name: 'Botchain Testnet',
    rpcUrl: 'https://rpc.bohr.life',
    blockExplorerUrl: 'https://scan.bohr.life',
    currencySymbol: 'BOT',
  },
  contracts: {
    lightbid: '0x39FfB249F207a2583Be272d2f55AcebE0d09b2b8',
    testERC20: '0x249D23b4c2e58cf40eB0273e6afCE8d23170d82d',
    testERC721: '0xD8c92E8e8ECe7F00C947eB2C12Cdb2A110f9B63b',
  },
  ipfs: {
    gateway: 'https://gateway.pinata.cloud/ipfs/',
  },
};
```

Environment variables in [`web/.env`](./web/.env) only store authentication credentials:

```env
VITE_PINATA_JWT=your_pinata_jwt_here
```

### Running Locally

```bash
cd web

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

```bash
cd web
npm run build
```

---

## 📦 Pinata IPFS Integration

Lightbid connects directly to **Pinata Cloud IPFS** to support decentralized media and metadata:
- **Media Uploads**: Pinning raw images/files with CIDv1 format.
- **ERC-721 Metadata Generation**: Generates OpenSea-compatible metadata JSON containing asset name, description, traits, and external URL references.
- **Gateway Resolution**: High-speed resolution via Pinata Dedicated / Public IPFS gateways.

Functions are defined in [`web/src/lib/ipfs.ts`](./web/src/lib/ipfs.ts):
- `uploadFileToPinata(file, jwt)`: Uploads raw media.
- `uploadJSONToPinata(metadata, jwt)`: Pins JSON metadata.
- `uploadNFTToPinata(file, metadata, jwt)`: Orchestrates image + metadata upload in a single call.
- `resolveIpfsUrl(url)`: Resolves `ipfs://` protocol URIs to HTTP gateway URLs.

## 🛡️ Security Auditing & Invariants

Lightbid adheres to strict smart contract engineering standards:
- **Reentrancy Protection**: All state mutations use OpenZeppelin's `ReentrancyGuard`.
- **Checks-Effects-Interactions**: Storage updates precede external calls during settlement and escrow payouts.
- **Pull Over Push**: Never sends native tokens to arbitrary addresses inside standard bidding flows.
- **Two-Step Ownership**: Inherits `Ownable2Step` to prevent accidental transfer of protocol ownership.
- **Emergency Circuit Breaker**: Inherits `Pausable` to freeze new listings or bids during critical upgrades.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
