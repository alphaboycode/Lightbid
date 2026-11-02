import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env
const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

// Read contract ABIs
const abiDir = path.resolve(__dirname, "../src/abi");
const lightbidAbi = JSON.parse(fs.readFileSync(path.join(abiDir, "Lightbid.json"), "utf-8"));
const testERC721Abi = JSON.parse(fs.readFileSync(path.join(abiDir, "TestERC721.json"), "utf-8"));

const RPC_URL = "https://rpc.botchain.ai";
const CHAIN_ID = 677;

const botchain = defineChain({
  id: CHAIN_ID,
  name: "Botchain Mainnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
});

const publicClient = createPublicClient({
  chain: botchain,
  transport: http(RPC_URL),
});

const LIGHTBID_ADDRESS = "0x249D23b4c2e58cf40eB0273e6afCE8d23170d82d";
const TEST_ERC721_ADDRESS = "0x8b117EEE6007159983342373cC45c343db1dfcE8";

// IPFS Metadata URIs uploaded from web/src/assets
const NFT_METADATA = [
  {
    name: "Bored Ape #1042",
    description: "Iconic Bored Ape on Botchain Mainnet",
    uri: "ipfs://QmWhQBtEeaEbCaX36GmJ9Jg4D627X9b4opXx2G4DrPAFGv",
  },
  {
    name: "Azuki #8812",
    description: "Skater anime hero on Botchain Mainnet",
    uri: "ipfs://QmQa1HFsNudjmj8zLMGrJqD1FMb29Jx9hEmTYDnmrPH4Dt",
  },
  {
    name: "Doodle #3319",
    description: "Rainbow pastel character on Botchain Mainnet",
    uri: "ipfs://QmbBekDoso2pYTMZv6EUZ1sZk6qV5e1GvsagyVWMANhLHN",
  },
];

const walletsConfig = [
  {
    id: 1,
    name: "Wallet 1",
    address: getEnvVar("WALLET_1_ADDRESS"),
    privateKey: getEnvVar("WALLET_1_PRIVATE_KEY"),
    nft: NFT_METADATA[0],
  },
  {
    id: 2,
    name: "Wallet 2",
    address: getEnvVar("WALLET_2_ADDRESS"),
    privateKey: getEnvVar("WALLET_2_PRIVATE_KEY"),
    nft: NFT_METADATA[1],
  },
  {
    id: 3,
    name: "Wallet 3",
    address: getEnvVar("WALLET_3_ADDRESS"),
    privateKey: getEnvVar("WALLET_3_PRIVATE_KEY"),
    nft: NFT_METADATA[2],
  },
];

async function main() {
  console.log("==================================================");
  console.log("Executing Lightbid Auction & Bidding Transactions");
  console.log("Botchain Mainnet (Chain ID 677)");
  console.log("==================================================\n");

  const clients = {};
  const walletTransactions = { 1: [], 2: [], 3: [] };
  const nonces = {};

  for (const w of walletsConfig) {
    const account = privateKeyToAccount(w.privateKey);
    clients[w.id] = createWalletClient({
      account,
      chain: botchain,
      transport: http(RPC_URL),
    });
    const balance = await publicClient.getBalance({ address: w.address });
    nonces[w.id] = await publicClient.getTransactionCount({
      address: w.address,
      blockTag: "pending",
    });
    console.log(`${w.name} (${w.address}): Balance = ${formatEther(balance)} BOT | Nonce = ${nonces[w.id]}`);
  }

  // Helper to execute and track a transaction
  async function execTx(walletId, actionName, callDataPromise) {
    const w = walletsConfig.find((x) => x.id === walletId);
    console.log(`\n[${w.name}] -> Action: ${actionName} (nonce: ${nonces[walletId]})...`);
    const hash = await callDataPromise();
    console.log(`[${w.name}] Tx Submitted: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[${w.name}] Confirmed in block ${receipt.blockNumber} (Status: ${receipt.status})`);

    const record = {
      wallet: w.name,
      txIndex: walletTransactions[walletId].length + 1,
      action: actionName,
      hash,
      block: receipt.blockNumber.toString(),
      status: receipt.status,
    };
    walletTransactions[walletId].push(record);
    nonces[walletId]++;
    return { hash, receipt };
  }

  const mintedTokenIds = {};
  const createdAuctionIds = {};

  // =========================================================================
  // STAGE 1: Minting NFT for each wallet from assets (Tx 1 for each wallet)
  // =========================================================================
  console.log("\n==================================================");
  console.log("STAGE 1: Minting NFTs from src/assets (Tx 1 per wallet)");
  console.log("==================================================");

  for (const w of walletsConfig) {
    const { receipt } = await execTx(w.id, `Mint NFT: ${w.nft.name}`, () =>
      clients[w.id].writeContract({
        address: TEST_ERC721_ADDRESS,
        abi: testERC721Abi,
        functionName: "mint",
        args: [w.nft.uri],
        nonce: nonces[w.id],
        gasPrice: 20000000000n,
      })
    );

    // Extract minted tokenId from Transfer event (topic 3)
    const transferLog = receipt.logs.find(
      (l) => l.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    );
    const tokenId = BigInt(transferLog.topics[3]);
    mintedTokenIds[w.id] = tokenId;
    console.log(`>>> Minted ${w.nft.name} with Token ID: ${tokenId} for ${w.name}`);
  }

  // =========================================================================
  // STAGE 2: Approving Lightbid Marketplace (Tx 2 for each wallet)
  // =========================================================================
  console.log("\n==================================================");
  console.log("STAGE 2: Approving Lightbid Marketplace (Tx 2 per wallet)");
  console.log("==================================================");

  for (const w of walletsConfig) {
    await execTx(w.id, "Approve Lightbid Marketplace", () =>
      clients[w.id].writeContract({
        address: TEST_ERC721_ADDRESS,
        abi: testERC721Abi,
        functionName: "setApprovalForAll",
        args: [LIGHTBID_ADDRESS, true],
        nonce: nonces[w.id],
        gasPrice: 20000000000n,
      })
    );
  }

  // =========================================================================
  // STAGE 3: Creating Auction on Lightbid (Tx 3 for each wallet)
  // =========================================================================
  console.log("\n==================================================");
  console.log("STAGE 3: Creating Auctions on Lightbid (Tx 3 per wallet)");
  console.log("==================================================");

  for (const w of walletsConfig) {
    const tokenId = mintedTokenIds[w.id];
    await execTx(w.id, `Create Auction for ${w.nft.name} (Token #${tokenId})`, () =>
      clients[w.id].writeContract({
        address: LIGHTBID_ADDRESS,
        abi: lightbidAbi,
        functionName: "createAuction",
        args: [
          0, // AssetType.ERC721
          TEST_ERC721_ADDRESS,
          tokenId,
          1n, // amount
          parseEther("0.001"), // reservePrice: 0.001 BOT
          100n, // minIncrementBps: 1.0% (100 BPS)
          86400n, // duration: 24 hours
        ],
        nonce: nonces[w.id],
        gasPrice: 20000000000n,
      })
    );

    const total = await publicClient.readContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "totalAuctions",
    });
    createdAuctionIds[w.id] = total;
    console.log(`>>> Created Auction #${total} for ${w.name}`);
  }

  const a1 = createdAuctionIds[1];
  const a2 = createdAuctionIds[2];
  const a3 = createdAuctionIds[3];

  console.log("\n==================================================");
  console.log(`Active Auctions Created: #${a1}, #${a2}, #${a3}`);
  console.log("STAGE 4: Placing Bids (Txs 4 - 8 for each wallet)");
  console.log("==================================================");

  // Round 1 of Bidding:
  // Wallet 1 bids on Auction A2 (0.001 BOT) -> W1 Tx 4
  await execTx(1, `Place Bid on Auction #${a2} (0.001 BOT)`, () =>
    clients[1].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a2],
      value: parseEther("0.001"),
      nonce: nonces[1],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 2 bids on Auction A3 (0.001 BOT) -> W2 Tx 4
  await execTx(2, `Place Bid on Auction #${a3} (0.001 BOT)`, () =>
    clients[2].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a3],
      value: parseEther("0.001"),
      nonce: nonces[2],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 3 bids on Auction A1 (0.001 BOT) -> W3 Tx 4
  await execTx(3, `Place Bid on Auction #${a1} (0.001 BOT)`, () =>
    clients[3].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a1],
      value: parseEther("0.001"),
      nonce: nonces[3],
      gasPrice: 20000000000n,
    })
  );

  // Round 2 of Bidding:
  // Wallet 1 bids on Auction A3 (0.00102 BOT) -> W1 Tx 5
  await execTx(1, `Place Bid on Auction #${a3} (0.00102 BOT)`, () =>
    clients[1].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a3],
      value: parseEther("0.00102"),
      nonce: nonces[1],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 2 bids on Auction A1 (0.00102 BOT) -> W2 Tx 5
  await execTx(2, `Place Bid on Auction #${a1} (0.00102 BOT)`, () =>
    clients[2].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a1],
      value: parseEther("0.00102"),
      nonce: nonces[2],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 3 bids on Auction A2 (0.00102 BOT) -> W3 Tx 5
  await execTx(3, `Place Bid on Auction #${a2} (0.00102 BOT)`, () =>
    clients[3].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a2],
      value: parseEther("0.00102"),
      nonce: nonces[3],
      gasPrice: 20000000000n,
    })
  );

  // Round 3 of Bidding:
  // Wallet 1 bids on Auction A2 (0.00105 BOT) -> W1 Tx 6
  await execTx(1, `Place Bid on Auction #${a2} (0.00105 BOT)`, () =>
    clients[1].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a2],
      value: parseEther("0.00105"),
      nonce: nonces[1],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 2 bids on Auction A3 (0.00105 BOT) -> W2 Tx 6
  await execTx(2, `Place Bid on Auction #${a3} (0.00105 BOT)`, () =>
    clients[2].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a3],
      value: parseEther("0.00105"),
      nonce: nonces[2],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 3 bids on Auction A1 (0.00105 BOT) -> W3 Tx 6
  await execTx(3, `Place Bid on Auction #${a1} (0.00105 BOT)`, () =>
    clients[3].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a1],
      value: parseEther("0.00105"),
      nonce: nonces[3],
      gasPrice: 20000000000n,
    })
  );

  // Round 4 of Bidding:
  // Wallet 1 bids on Auction A3 (0.00108 BOT) -> W1 Tx 7
  await execTx(1, `Place Bid on Auction #${a3} (0.00108 BOT)`, () =>
    clients[1].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a3],
      value: parseEther("0.00108"),
      nonce: nonces[1],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 2 bids on Auction A1 (0.00108 BOT) -> W2 Tx 7
  await execTx(2, `Place Bid on Auction #${a1} (0.00108 BOT)`, () =>
    clients[2].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a1],
      value: parseEther("0.00108"),
      nonce: nonces[2],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 3 bids on Auction A2 (0.00108 BOT) -> W3 Tx 7
  await execTx(3, `Place Bid on Auction #${a2} (0.00108 BOT)`, () =>
    clients[3].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a2],
      value: parseEther("0.00108"),
      nonce: nonces[3],
      gasPrice: 20000000000n,
    })
  );

  // Round 5 of Bidding (8th Tx for each wallet):
  // Wallet 1 bids on Auction A2 (0.00112 BOT) -> W1 Tx 8
  await execTx(1, `Place Bid on Auction #${a2} (0.00112 BOT)`, () =>
    clients[1].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a2],
      value: parseEther("0.00112"),
      nonce: nonces[1],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 2 bids on Auction A3 (0.00112 BOT) -> W2 Tx 8
  await execTx(2, `Place Bid on Auction #${a3} (0.00112 BOT)`, () =>
    clients[2].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a3],
      value: parseEther("0.00112"),
      nonce: nonces[2],
      gasPrice: 20000000000n,
    })
  );

  // Wallet 3 bids on Auction A1 (0.00112 BOT) -> W3 Tx 8
  await execTx(3, `Place Bid on Auction #${a1} (0.00112 BOT)`, () =>
    clients[3].writeContract({
      address: LIGHTBID_ADDRESS,
      abi: lightbidAbi,
      functionName: "placeBid",
      args: [a1],
      value: parseEther("0.00112"),
      nonce: nonces[3],
      gasPrice: 20000000000n,
    })
  );

  console.log("\n==================================================");
  console.log("ALL 24 TRANSACTIONS (8 PER WALLET) COMPLETED!");
  console.log("==================================================\n");

  const allRecords = [
    ...walletTransactions[1],
    ...walletTransactions[2],
    ...walletTransactions[3],
  ];

  console.table(allRecords);

  // Save report to JSON file
  fs.writeFileSync(
    path.resolve(__dirname, "../../mainnet_transactions.json"),
    JSON.stringify(allRecords, null, 2)
  );

  console.log("\n--- Full Explorer Links ---");
  for (const r of allRecords) {
    console.log(`[${r.wallet} Tx ${r.txIndex}/8] ${r.action}: https://scan.botchain.ai/tx/${r.hash}`);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
