const BPS = 10_000n;

export function splitFee(amount: bigint, platformBps: number, creatorBps: number) {
  const platform = (amount * BigInt(platformBps)) / BPS;
  const creator = (amount * BigInt(creatorBps)) / BPS;
  const net = amount - platform - creator;
  return { platform, creator, net };
}

export function tokensForSol(virtualSol: bigint, virtualToken: bigint, solIn: bigint): bigint {
  if (solIn <= 0n || virtualSol <= 0n || virtualToken <= 0n) return 0n;
  const k = virtualSol * virtualToken;
  const newVirtualSol = virtualSol + solIn;
  const newVirtualToken = k / newVirtualSol;
  if (newVirtualToken >= virtualToken) return 0n;
  return virtualToken - newVirtualToken;
}

export function solForTokens(virtualSol: bigint, virtualToken: bigint, tokensIn: bigint): bigint {
  if (tokensIn <= 0n || virtualSol <= 0n || virtualToken <= 0n) return 0n;
  const k = virtualSol * virtualToken;
  const newVirtualToken = virtualToken + tokensIn;
  const newVirtualSol = k / newVirtualToken;
  if (newVirtualSol >= virtualSol) return 0n;
  return virtualSol - newVirtualSol;
}

export function marketCapLamports(quoteReserve: bigint, tokenReserve: bigint, supply: bigint): bigint {
  if (tokenReserve <= 0n) return 0n;
  return (quoteReserve * supply) / tokenReserve;
}

export function applySlippage(amount: bigint, slippageBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.min(5_000, slippageBps)));
  return (amount * (10_000n - bps)) / 10_000n;
}

/** 1 SOL in, 200 bps creator, 100 bps platform. See README. */
export const WORKED_BUY_TOKENS_OUT = 33_607_039_070_068n;
