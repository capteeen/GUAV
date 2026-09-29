/** Chain constants. Match programs/guava/src/constants.rs. */

export const PROGRAM_ID_PLACEHOLDER = "67HiGDKWjYSgGQNq7icz6vPRNNQAMogdzdJvgztYYPmX";

export const TOKEN_DECIMALS = 6;
export const TOKEN_SUPPLY = 1_000_000_000_000_000n;
export const VIRTUAL_SOL_LAMPORTS = 30_000_000_000n;
export const VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n;
export const REAL_TOKEN_RESERVES = 800_000_000_000_000n;
export const PLATFORM_FEE_BPS = 100;
export const MAX_CREATOR_FEE_BPS = 500;

/** Devnet initialize script uses 2 SOL. */
export const DEVNET_GRADUATION_LAMPORTS = 2_000_000_000n;
/** Documented mainnet-shaped config. Not deployed. */
export const MAINNET_SHAPED_GRADUATION_LAMPORTS = 85_000_000_000n;

export const CURVE_DISCRIMINATOR = Uint8Array.from([
  191, 180, 249, 66, 180, 71, 51, 182,
]);

export const INSTRUCTION_DISC = {
  initialize: Uint8Array.from([175, 175, 109, 31, 13, 152, 155, 237]),
  launch: Uint8Array.from([153, 241, 93, 225, 22, 69, 74, 61]),
  buy: Uint8Array.from([102, 6, 61, 18, 1, 218, 235, 234]),
  sell: Uint8Array.from([51, 230, 133, 164, 1, 127, 131, 173]),
  claim: Uint8Array.from([0, 23, 125, 234, 156, 118, 134, 89]),
};

export function configuredProgramId(): string {
  return (process.env.NEXT_PUBLIC_GUAVA_PROGRAM_ID || "").trim();
}

export function isProgramConfigured(): boolean {
  const id = configuredProgramId();
  return id.length >= 32 && id !== PROGRAM_ID_PLACEHOLDER;
}

export function explorerTx(signature: string): string {
  const base = process.env.NEXT_PUBLIC_EXPLORER_BASE || "https://explorer.solana.com/?cluster=devnet";
  const url = new URL("https://explorer.solana.com/tx/" + signature);
  url.search = "cluster=devnet";
  if (base.includes("cluster=")) return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  return url.toString();
}

export function explorerAddress(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
