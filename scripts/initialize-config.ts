/**
 * One-time devnet/local initialize.
 * Usage (after deploy, with a funded keypair):
 *   SOLANA_RPC_URL=https://api.devnet.solana.com \
 *   GUAVA_PROGRAM_ID=... \
 *   GUAVA_FEE_RECIPIENT=... \
 *   GUAVA_KEYPAIR=keys/local-test.json \
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/initialize-config.ts
 *
 * Default threshold is 2 SOL. Pass GRADUATION_LAMPORTS=85000000000 only when you
 * intentionally want the documented mainnet-shaped value. That is not a live mainnet claim.
 */
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { initializeIx } from "../lib/instructions";
import { DEVNET_GRADUATION_LAMPORTS } from "../lib/constants";

async function main() {
  const rpc = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const programId = new PublicKey(process.env.GUAVA_PROGRAM_ID || process.env.NEXT_PUBLIC_GUAVA_PROGRAM_ID || "");
  const feeRecipient = new PublicKey(process.env.GUAVA_FEE_RECIPIENT || process.env.NEXT_PUBLIC_GUAVA_FEE_RECIPIENT || "");
  const secret = JSON.parse(readFileSync(process.env.GUAVA_KEYPAIR || "keys/local-test.json", "utf8"));
  const authority = Keypair.fromSecretKey(Uint8Array.from(secret));
  const threshold = BigInt(process.env.GRADUATION_LAMPORTS || DEVNET_GRADUATION_LAMPORTS.toString());
  const connection = new Connection(rpc, "confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    initializeIx(programId, authority.publicKey, feeRecipient, threshold),
  );
  const signature = await sendAndConfirmTransaction(connection, tx, [authority]);
  console.log("config initialized", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
