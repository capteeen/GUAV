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
const ANCHOR = Date.parse("2026-09-29T12:00:00Z");
const FEES = [0, 100, 100, 200, 300, 500];

/** Curve-stage board. Stats are stable so the page looks filled in, and none of these coins have graduated. */
export const DEMO_TOKENS: GroveToken[] = coins.map((coin, index) => {
  const fromTop = coins.length - index;
  const marketCapUsd = 900 + fromTop * 150;
  const raisedSol = 0.04 + (fromTop / coins.length) * 1.1;
  const n = mix(coin.mint);
  const changePct = Math.round((((n % 2801) / 100 - 14) * 10)) / 10;
  const volumeSol = Math.round((18 + (n % 4200) / 10) * 10) / 10;
  return {
    address: coin.mint,
    name: coin.name,
    ticker: coin.ticker,
    image: `/assets/pumpfun-demo/${coin.icon}`,
    description: `${coin.name} trades against SOL. The pool locks when the curve fills.`,
    marketCapSol: raisedSol * 420,
    marketCapUsd,
    volumeSol,
    changePct,
    createdAt: ANCHOR - (20 + (n % (60 * 36))) * 60 * 1000,
    creator: coin.mint,
    creatorFeeBps: FEES[n % FEES.length],
    demo: true,
    graduated: false,
    realSolLamports: Math.round(raisedSol * 1e9),
    graduationLamports: 2_000_000_000,
  };
});

function mix(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function findDemo(address: string): GroveToken | undefined {
  return DEMO_TOKENS.find((row) => row.address === address);
}
