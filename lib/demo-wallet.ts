export const DEMO_WALLET = "GuaDevnetWallet1111111111111111111111111";
export const GRADUATION_SOL = 2;
export const TOKENS_PER_SOL = 10_000;
export const STARTING_SOL = 8.5;

export function tradeFeeRate(creatorFeeBps: number) {
  return (100 + creatorFeeBps) / 10_000;
}

export function splitTrade(sol: number, creatorFeeBps: number) {
  const guava = sol * 0.01;
  const creator = sol * (creatorFeeBps / 10_000);
  const net = Math.max(0, sol - guava - creator);
  return { guava, creator, net };
}
