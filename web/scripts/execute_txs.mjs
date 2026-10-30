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

// Read .env from web directory
const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

const RPC_URL = "https://rpc.bohr.life";
const CHAIN_ID = 968;

const botchain = defineChain({
  id: CHAIN_ID,
  name: "Botchain Testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
});

const publicClient = createPublicClient({
  chain: botchain,
  transport: http(RPC_URL),
});

const w1Address = getEnvVar("WALLET_1_ADDRESS");
const w1Key = getEnvVar("WALLET_1_PRIVATE_KEY");
const w2Address = getEnvVar("WALLET_2_ADDRESS");
const w2Key = getEnvVar("WALLET_2_PRIVATE_KEY");
const w3Address = getEnvVar("WALLET_3_ADDRESS");
const w3Key = getEnvVar("WALLET_3_PRIVATE_KEY");

const wallets = [
  {
    name: "Wallet 1",
    address: w1Address,
    privateKey: w1Key,
    recipient: w2Address,
  },
  {
    name: "Wallet 2",
    address: w2Address,
    privateKey: w2Key,
    recipient: w3Address,
  },
  {
    name: "Wallet 3",
    address: w3Address,
    privateKey: w3Key,
    recipient: w1Address,
  },
];

async function main() {
  console.log("==================================================");
  console.log("Executing 8 transactions per wallet on Botchain Testnet");
  console.log(`RPC: ${RPC_URL} | Chain ID: ${CHAIN_ID}`);
  console.log("==================================================\n");

  const allReceipts = [];

  for (const w of wallets) {
    console.log(`\n==================================================`);
    console.log(`>>> Starting transactions for ${w.name}: ${w.address} <<<`);
    console.log(`Recipient: ${w.recipient}`);
    console.log(`==================================================`);

    const account = privateKeyToAccount(w.privateKey);
    const walletClient = createWalletClient({
      account,
      chain: botchain,
      transport: http(RPC_URL),
    });

    const initialBal = await publicClient.getBalance({ address: account.address });
    console.log(`Initial Balance: ${formatEther(initialBal)} BOT`);

    let currentNonce = await publicClient.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
    console.log(`Starting Nonce: ${currentNonce}`);

    for (let i = 1; i <= 8; i++) {
      console.log(`\n[${w.name}] Submitting tx ${i}/8 (nonce: ${currentNonce})...`);

      const hash = await walletClient.sendTransaction({
        to: w.recipient,
        value: parseEther("0.001"),
        nonce: currentNonce,
        gasPrice: 20000000000n, // 20 gwei
      });

      console.log(`[${w.name}] Tx submitted: ${hash}`);
      console.log(`Waiting for confirmation...`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`[${w.name}] Tx ${i}/8 confirmed in block ${receipt.blockNumber} (Status: ${receipt.status})`);

      allReceipts.push({
        wallet: w.name,
        index: i,
        from: w.address,
        to: w.recipient,
        hash,
        block: receipt.blockNumber.toString(),
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
      });

      currentNonce++;
    }

    const finalBal = await publicClient.getBalance({ address: account.address });
    console.log(`\nFinal Balance for ${w.name}: ${formatEther(finalBal)} BOT`);
  }

  console.log("\n==================================================");
  console.log("ALL 24 TRANSACTIONS (8 PER WALLET) COMPLETED!");
  console.log("==================================================\n");
  console.table(allReceipts);

  console.log("\nTransaction Explorer Links:");
  for (const r of allReceipts) {
    console.log(`[${r.wallet} Tx ${r.index}/8]: https://scan.bohr.life/tx/${r.hash}`);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
