import pack from "@/data/pumpfun-demo-coins.json";
import { GroveToken } from "./types";

type DemoCoin = {
  name: string;
  ticker: string;
  mint: string;
  usd_market_cap: number;
  icon: string;
  complete: boolean;
  label: string;
};

const coins = pack.coins as DemoCoin[];

/** Pump.fun names and art only. Caps are a fresh curve, and none of these coins have graduated. */
export const DEMO_TOKENS: GroveToken[] = coins.map((coin, index) => {
  const fromTop = coins.length - index;
  const marketCapUsd = 900 + fromTop * 150;
  const raisedSol = 0.04 + (fromTop / coins.length) * 1.1;
  return {
    address: coin.mint,
    name: coin.name,
    ticker: coin.ticker,
    image: `/assets/pumpfun-demo/${coin.icon}`,
    description: "Demo snapshot. Not a live Guava market.",
    marketCapSol: null,
    marketCapUsd,
    volumeSol: null,
    changePct: null,
    createdAt: 0,
    creator: coin.mint,
    creatorFeeBps: 0,
    demo: true,
    graduated: false,
    realSolLamports: Math.round(raisedSol * 1e9),
    graduationLamports: 2_000_000_000,
  };
});

export function findDemo(address: string): GroveToken | undefined {
  return DEMO_TOKENS.find((row) => row.address === address);
}
