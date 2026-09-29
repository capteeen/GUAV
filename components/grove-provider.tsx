"use client";

import { DEMO_TOKENS } from "@/lib/demo";
import { DEMO_WALLET, GRADUATION_SOL, STARTING_SOL, TOKENS_PER_SOL, splitTrade } from "@/lib/demo-wallet";
import { GroveToken } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "guava-demo-board-v3";

type Saved = {
  connected: boolean;
  solBalance: number;
  extra: GroveToken[];
  patches: Record<string, GroveToken>;
  holdings: Record<string, number>;
};

type LaunchInput = {
  name: string;
  ticker: string;
  description: string;
  image?: string;
  creatorFeeBps: number;
  firstBuySol: number;
};

type GroveState = {
  rows: GroveToken[];
  demo: boolean;
  note: string;
  connected: boolean;
  wallet: string;
  solBalance: number;
  holdings: Record<string, number>;
  connect: () => void;
  disconnect: () => void;
  launch: (input: LaunchInput) => { ok: true; address: string } | { ok: false; message: string };
  buy: (address: string, sol: number, slippagePct: number) => string;
  sell: (address: string, sol: number, slippagePct: number) => string;
  find: (address: string) => GroveToken | undefined;
};

const GroveContext = createContext<GroveState | null>(null);

function freshSeeds(): GroveToken[] {
  return DEMO_TOKENS.map((row) => ({ ...row, creatorFeesSol: row.creatorFeesSol ?? 0, walletTokens: 0 }));
}

export function GroveProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [solBalance, setSolBalance] = useState(STARTING_SOL);
  const [rows, setRows] = useState<GroveToken[]>(freshSeeds);
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        const seeds = freshSeeds();
        const merged = seeds.map((row) => {
          const patch = saved.patches?.[row.address];
          if (!patch) return row;
          return {
            ...patch,
            name: row.name,
            ticker: row.ticker,
            image: row.image,
            marketCapUsd: row.marketCapUsd,
            marketCapSol: row.marketCapSol,
            graduated: row.graduated,
            realSolLamports: row.realSolLamports,
            graduationLamports: row.graduationLamports,
          };
        });
        const extras = (saved.extra ?? []).filter((row) => !merged.some((item) => item.address === row.address));
        setRows([...extras, ...merged]);
        setHoldings(saved.holdings ?? {});
        setSolBalance(typeof saved.solBalance === "number" ? saved.solBalance : STARTING_SOL);
        setConnected(Boolean(saved.connected));
      }
    } catch {
      /* keep seed rows */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const seedAddresses = new Set(DEMO_TOKENS.map((row) => row.address));
    const saved: Saved = {
      connected,
      solBalance,
      extra: rows.filter((row) => !seedAddresses.has(row.address)),
      patches: Object.fromEntries(rows.filter((row) => seedAddresses.has(row.address)).map((row) => [row.address, row])),
      holdings,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [connected, solBalance, rows, holdings, ready]);

  const api = useMemo<GroveState>(() => {
    const find = (address: string) => rows.find((row) => row.address === address);

    return {
      rows,
      demo: true,
      note: "Demo data",
      connected,
      wallet: DEMO_WALLET,
      solBalance,
      holdings,
      connect: () => setConnected(true),
      disconnect: () => setConnected(false),
      find,
      launch: (input) => {
        const name = input.name.trim();
        const ticker = input.ticker.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        if (name.length < 1 || name.length > 32) return { ok: false, message: "Name must be 1 to 32 characters." };
        if (ticker.length < 1) return { ok: false, message: "Ticker needs 1 to 10 letters or digits." };
        if (input.description.length > 280) return { ok: false, message: "Description must be 280 characters or fewer." };
        if (input.creatorFeeBps < 0 || input.creatorFeeBps > 500) return { ok: false, message: "Creator fee must stay between 0 and 5%." };
        if (rows.some((row) => row.ticker === ticker)) return { ok: false, message: "That ticker is already in the grove." };
        const address = `grove-${ticker.toLowerCase()}-${Date.now().toString(36)}`;
        let token: GroveToken = {
          address,
          name,
          ticker,
          description: input.description.trim(),
          image: input.image,
          marketCapSol: 4.2,
          volumeSol: 0,
          changePct: 0,
          createdAt: Date.now(),
          creator: DEMO_WALLET,
          creatorFeeBps: input.creatorFeeBps,
          creatorFeesSol: 0,
          demo: true,
          graduated: false,
          realSolLamports: 0,
          graduationLamports: GRADUATION_SOL * 1_000_000_000,
        };
        let nextBalance = solBalance;
        let nextHoldings = holdings[address] ?? 0;
        if (input.firstBuySol > 0) {
          if (!connected) return { ok: false, message: "Connect the Devnet wallet before a first buy." };
          if (input.firstBuySol > solBalance) return { ok: false, message: "Not enough SOL in the Devnet wallet." };
          const applied = applyBuy(token, input.firstBuySol, 1, nextHoldings, nextBalance);
          if (!applied.ok) return applied;
          token = applied.token;
          nextBalance = applied.solBalance;
          nextHoldings = applied.holding;
        }
        setRows((current) => [token, ...current]);
        setSolBalance(nextBalance);
        setHoldings((current) => ({ ...current, [address]: nextHoldings }));
        setConnected(true);
        return { ok: true, address };
      },
      buy: (address, sol, slippagePct) => {
        const token = find(address);
        if (!token) return "Not a Guava pair.";
        if (!connected) return "Connect the Devnet wallet to trade this demo pair.";
        if (!(sol > 0)) return "Enter a SOL amount.";
        const applied = applyBuy(token, sol, slippagePct, holdings[address] ?? 0, solBalance);
        if (!applied.ok) return applied.message;
        setRows((current) => current.map((row) => (row.address === address ? applied.token : row)));
        setSolBalance(applied.solBalance);
        setHoldings((current) => ({ ...current, [address]: applied.holding }));
        return applied.message;
      },
      sell: (address, sol, slippagePct) => {
        const token = find(address);
        if (!token) return "Not a Guava pair.";
        if (!connected) return "Connect the Devnet wallet to trade this demo pair.";
        if (!(sol > 0)) return "Enter a SOL amount.";
        const held = holdings[address] ?? 0;
        const { guava, creator, net } = splitTrade(sol, token.creatorFeeBps);
        const slip = Math.min(50, Math.max(0, slippagePct)) / 100;
        const tokensNeeded = (sol / (1 - slip)) * TOKENS_PER_SOL;
        if (held + 1e-6 < tokensNeeded) return "Not enough tokens in the Devnet wallet.";
        const raised = Math.max(0, token.realSolLamports / 1e9 - net);
        const next: GroveToken = {
          ...token,
          realSolLamports: raised * 1e9,
          volumeSol: (token.volumeSol ?? 0) + sol,
          marketCapSol: Math.max(0.4, (token.marketCapSol ?? 1) * (1 - net / 20)),
          changePct: (token.changePct ?? 0) - net * 3,
          creatorFeesSol: (token.creatorFeesSol ?? 0) + (token.creator === DEMO_WALLET ? creator : 0),
        };
        setRows((current) => current.map((row) => (row.address === address ? next : row)));
        setSolBalance((value) => value + net);
        setHoldings((current) => ({ ...current, [address]: held - tokensNeeded }));
        return `Demo sell filled. ${net.toFixed(4)} SOL back after ${guava.toFixed(4)} to Guava and ${creator.toFixed(4)} creator juice. Slippage ${slippagePct.toFixed(1)}%.`;
      },
    };
  }, [rows, connected, solBalance, holdings]);

  return <GroveContext.Provider value={api}>{children}</GroveContext.Provider>;
}

function applyBuy(
  token: GroveToken,
  sol: number,
  slippagePct: number,
  holding: number,
  balance: number,
): { ok: true; token: GroveToken; solBalance: number; holding: number; message: string } | { ok: false; message: string } {
  if (sol > balance) return { ok: false, message: "Not enough SOL in the Devnet wallet." };
  const { guava, creator, net } = splitTrade(sol, token.creatorFeeBps);
  const slip = Math.min(50, Math.max(0, slippagePct)) / 100;
  const tokens = net * (1 - slip) * TOKENS_PER_SOL;
  const raisedSol = token.realSolLamports / 1e9 + net;
  const graduated = token.graduated || raisedSol >= GRADUATION_SOL;
  const next: GroveToken = {
    ...token,
    realSolLamports: raisedSol * 1e9,
    graduated,
    volumeSol: (token.volumeSol ?? 0) + sol,
    marketCapSol: (token.marketCapSol ?? 4) + net * 6,
    changePct: (token.changePct ?? 0) + net * 4,
    creatorFeesSol: (token.creatorFeesSol ?? 0) + (token.creator === DEMO_WALLET ? creator : 0),
  };
  const venue = graduated ? "Graduated pool" : "On the curve";
  return {
    ok: true,
    token: next,
    solBalance: balance - sol,
    holding: holding + tokens,
    message: `Demo buy filled. ${venue}. ${tokens.toFixed(0)} tokens after ${guava.toFixed(4)} to Guava and ${creator.toFixed(4)} creator juice.`,
  };
}

export function useGrove() {
  const value = useContext(GroveContext);
  if (!value) throw new Error("Grove missing");
  return value;
}
