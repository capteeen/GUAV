"use client";

import { TokenArt } from "@/components/token-art";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGrove } from "@/components/grove-provider";
import { GRADUATION_SOL, splitTrade } from "@/lib/demo-wallet";
import { formatPct, formatSolNumber, formatUsd } from "@/lib/format";
import { useMemo, useState } from "react";

export function TokenScreen({ address }: { address: string }) {
  const grove = useGrove();
  const token = grove.find(address);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.10");
  const [slippage, setSlippage] = useState(1);
  const [status, setStatus] = useState("");

  if (!token) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-4xl font-semibold">Guava: token</h1>
        <p className="mt-4 max-w-xl text-lg">Not a Guava pair.</p>
        <p className="mt-2 max-w-xl text-sm text-pith-muted">Trading on Guava is available for coins launched on its own board.</p>
        <p className="mt-4 font-mono text-xs text-pith-muted">{address}</p>
      </div>
    );
  }

  const sol = Number(amount);
  const quote = Number.isFinite(sol) && sol > 0 ? splitTrade(sol, token.creatorFeeBps) : null;
  const raised = token.realSolLamports / 1e9;
  const pct = Math.min(100, (raised / GRADUATION_SOL) * 100);
  const held = grove.holdings[token.address] ?? 0;

  function onTrade() {
    const message = side === "buy" ? grove.buy(token!.address, sol, slippage) : grove.sell(token!.address, sol, slippage);
    setStatus(message);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-16 w-16 overflow-hidden rounded-2xl">
              <TokenArt ticker={token.ticker} image={token.image} />
            </span>
            <div>
              <h1 className="font-display text-4xl font-semibold">{token.name}</h1>
              <p className="font-mono text-sm text-pith-muted">
                {token.ticker} · {token.graduated ? "Graduated" : "On the curve"} · SOL
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm text-pith-muted">{token.description || "No description yet."}</p>
          <p className="mt-3 text-sm text-pith-muted">
            When the curve fills its SOL goal, the pair graduates into a locked Guava pool.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-pith-muted">
            <span>Mcap {token.marketCapUsd != null ? formatUsd(token.marketCapUsd) : `${formatSolNumber(token.marketCapSol)} SOL`}</span>
            <span>24h vol {token.volumeSol == null ? "—" : formatSolNumber(token.volumeSol)}</span>
            <span>Change {formatPct(token.changePct)}</span>
            <span>You hold {held.toFixed(0)} {token.ticker}</span>
          </div>
          <div className="mt-5">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${token.graduated ? 100 : pct}%` }} />
            </div>
            <p className="mt-2 font-mono text-xs text-pith-muted">
              {token.graduated ? "Graduated" : "On the curve"} · {token.graduated ? GRADUATION_SOL.toFixed(3) : raised.toFixed(3)} / {GRADUATION_SOL} SOL
            </p>
          </div>
          <PriceChart seed={token.address} positive={(token.changePct ?? 0) >= 0} pair={`${token.ticker}/SOL`} change={formatPct(token.changePct)} />
        </div>
        <aside className="panel p-5">
          <div className="flex gap-2">
            <button type="button" className="chip" data-active={side === "buy"} onClick={() => setSide("buy")}>
              Buy
            </button>
            <button type="button" className="chip" data-active={side === "sell"} onClick={() => setSide("sell")}>
              Sell
            </button>
          </div>
          <p className="mt-4 text-sm">
            {token.graduated ? "Graduated. Trades clear on the locked pool." : "On the curve. Quote is SOL."}
          </p>
          <p className="mt-1 font-mono text-xs text-pith-muted">Wallet {grove.solBalance.toFixed(3)} SOL</p>
          <label className="mt-4 grid gap-2">
            <Label>SOL amount</Label>
            <Input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="0.10" />
          </label>
          <label className="mt-3 grid gap-2">
            <Label>Slippage {slippage.toFixed(1)}%</Label>
            <input type="range" min={0.1} max={15} step={0.1} value={slippage} onChange={(event) => setSlippage(Number(event.target.value))} />
          </label>
          <dl className="mt-4 space-y-2 text-sm">
            <Fee k="1% to Guava" v={quote ? `${quote.guava.toFixed(4)} SOL` : "—"} />
            <Fee k={`Creator ${(token.creatorFeeBps / 100).toFixed(2)}%`} v={quote ? `${quote.creator.toFixed(4)} SOL` : "—"} />
            <Fee k="Net to the pair" v={quote ? `${quote.net.toFixed(4)} SOL` : "—"} />
          </dl>
          <Button className="mt-5 w-full" variant="flesh" onClick={onTrade}>
            {side === "buy" ? "Buy" : "Sell"}
          </Button>
          {status ? <p className="mt-3 text-sm text-pith-muted">{status}</p> : null}
        </aside>
      </div>
    </div>
  );
}

function PriceChart({ seed, positive, pair, change }: { seed: string; positive: boolean; pair: string; change: string }) {
  const path = useMemo(() => seriesPath(seed, positive), [seed, positive]);
  const color = positive ? "#6ee7a2" : "#f07178";
  const id = `curve-${mix(seed).toString(16)}`;
  return (
    <div className="panel mt-6 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 text-xs">
        <span className="font-mono text-[#b7b0a0]">{pair}</span>
        <span className="font-mono" style={{ color }}>
          {change} 24h
        </span>
      </div>
      <svg viewBox="0 0 640 220" className="h-56 w-full" role="img" aria-label={`${pair} price`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 90, 140, 190].map((y) => (
          <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path d={path.area} fill={`url(#${id})`} />
        <path d={path.line} fill="none" stroke={color} strokeWidth="2.25" />
      </svg>
    </div>
  );
}

function seriesPath(seed: string, positive: boolean) {
  const pts: number[] = [];
  let value = 42;
  let h = mix(seed);
  for (let i = 0; i < 72; i += 1) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    value = Math.max(10, Math.min(92, value + ((h % 9) - 4) + (positive ? 0.32 : -0.26)));
    pts.push(value);
  }
  const width = 640;
  const height = 220;
  const step = width / (pts.length - 1);
  const y = (point: number) => height - (point / 100) * (height - 28) - 14;
  const line = pts.map((point, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${y(point).toFixed(1)}`).join(" ");
  return { line, area: `${line} L${width},${height} L0,${height} Z` };
}

function mix(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Fee({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-pith-muted">{k}</dt>
      <dd className="font-mono text-xs">{v}</dd>
    </div>
  );
}
