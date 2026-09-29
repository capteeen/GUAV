import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { INSTRUCTION_DISC } from "./constants";
import {
  deriveConfig,
  deriveCurve,
  deriveLockAuth,
  deriveLpLock,
  deriveLpMint,
  deriveMetadata,
  deriveMint,
  derivePool,
  deriveVault,
} from "./pdas";

function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function u64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value, 0);
  return buffer;
}

function str(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function meta(pubkey: PublicKey, isSigner: boolean, isWritable: boolean) {
  return { pubkey, isSigner, isWritable };
}

export function initializeIx(programId: PublicKey, authority: PublicKey, feeRecipient: PublicKey, threshold: bigint) {
  const data = Buffer.concat([
    Buffer.from(INSTRUCTION_DISC.initialize),
    feeRecipient.toBuffer(),
    u64(threshold),
  ]);
  return new TransactionInstruction({
    programId,
    data,
    keys: [
      meta(authority, true, true),
      meta(deriveConfig(programId), false, true),
      meta(SystemProgram.programId, false, false),
    ],
  });
}

export function launchAccounts(programId: PublicKey, creator: PublicKey, ticker: string, feeRecipient: PublicKey) {
  const mint = deriveMint(programId, creator, ticker);
  const tokenProgram = TOKEN_PROGRAM_ID;
  const associated = ASSOCIATED_TOKEN_PROGRAM_ID;
  const ata = getAssociatedTokenAddressSync(mint, creator, false, tokenProgram, associated);
  return {
    mint,
    ata,
    keys: [
      meta(creator, true, true),
      meta(deriveConfig(programId), false, false),
      meta(mint, false, true),
      meta(deriveCurve(programId, mint), false, true),
      meta(deriveMetadata(programId, mint), false, true),
      meta(deriveVault(programId, mint), false, true),
      meta(ata, false, true),
      meta(feeRecipient, false, true),
      meta(derivePool(programId, mint), false, true),
      meta(deriveLpMint(programId, mint), false, true),
      meta(deriveLpLock(programId, mint), false, true),
      meta(deriveLockAuth(programId, mint), false, false),
      meta(tokenProgram, false, false),
      meta(associated, false, false),
      meta(SystemProgram.programId, false, false),
    ],
  };
}

export function launchIx(args: {
  programId: PublicKey;
  creator: PublicKey;
  feeRecipient: PublicKey;
  name: string;
  ticker: string;
  uri: string;
  description: string;
  creatorFeeBps: number;
  firstBuyLamports: bigint;
  minTokensOut: bigint;
}) {
  const { keys, mint, ata } = launchAccounts(args.programId, args.creator, args.ticker, args.feeRecipient);
  const data = Buffer.concat([
    Buffer.from(INSTRUCTION_DISC.launch),
    str(args.name),
    str(args.ticker),
    str(args.uri),
    str(args.description),
    u16(args.creatorFeeBps),
    u64(args.firstBuyLamports),
    u64(args.minTokensOut),
  ]);
  return {
    mint,
    ata,
    ix: new TransactionInstruction({ programId: args.programId, keys, data }),
  };
}

export function tradeIx(args: {
  programId: PublicKey;
  trader: PublicKey;
  mint: PublicKey;
  feeRecipient: PublicKey;
  side: "buy" | "sell";
  amount: bigint;
  minOut: bigint;
  ata: PublicKey;
}) {
  const tokenProgram = TOKEN_PROGRAM_ID;
  const associated = ASSOCIATED_TOKEN_PROGRAM_ID;
  const data = Buffer.concat([
    Buffer.from(args.side === "buy" ? INSTRUCTION_DISC.buy : INSTRUCTION_DISC.sell),
    u64(args.amount),
    u64(args.minOut),
  ]);
  const keys = [
    meta(args.trader, true, true),
    meta(deriveConfig(args.programId), false, false),
    meta(deriveCurve(args.programId, args.mint), false, true),
    meta(args.mint, false, false),
    meta(deriveVault(args.programId, args.mint), false, true),
    meta(args.ata, false, true),
    meta(args.feeRecipient, false, true),
    meta(derivePool(args.programId, args.mint), false, true),
    meta(deriveLpMint(args.programId, args.mint), false, true),
    meta(deriveLpLock(args.programId, args.mint), false, true),
    meta(deriveLockAuth(args.programId, args.mint), false, false),
    meta(tokenProgram, false, false),
    meta(associated, false, false),
    meta(new PublicKey("11111111111111111111111111111111"), false, false),
  ];
  return new TransactionInstruction({ programId: args.programId, keys, data });
}

export function claimIx(programId: PublicKey, creator: PublicKey, mint: PublicKey) {
  return new TransactionInstruction({
    programId,
    data: Buffer.from(INSTRUCTION_DISC.claim),
    keys: [
      meta(creator, true, true),
      meta(deriveCurve(programId, mint), false, true),
      meta(SystemProgram.programId, false, false),
    ],
  });
}
