import { PublicKey } from "@solana/web3.js";

export function deriveConfig(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0];
}

export function deriveMint(programId: PublicKey, creator: PublicKey, ticker: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), creator.toBuffer(), Buffer.from(ticker)],
    programId,
  )[0];
}

function mintSeed(programId: PublicKey, seed: string, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(seed), mint.toBuffer()], programId)[0];
}

export function deriveCurve(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "curve", mint);
}

export function deriveMetadata(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "metadata", mint);
}

export function deriveVault(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "vault", mint);
}

export function derivePool(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "pool", mint);
}

export function deriveLpMint(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "lp-mint", mint);
}

export function deriveLpLock(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "lp-lock", mint);
}

export function deriveLockAuth(programId: PublicKey, mint: PublicKey): PublicKey {
  return mintSeed(programId, "lock-auth", mint);
}
