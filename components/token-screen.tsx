"use client";

import { TokenArt } from "@/components/token-art";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGrove } from "@/components/grove-provider";
import { GRADUATION_SOL, splitTrade } from "@/lib/demo-wallet";
import { formatPct, formatSolNumber, formatUsd } from "@/lib/format";
import { useState } from "react";

export function TokenScreen({ address }: { address: string }) {
  const grove = useGrove();
  const token = grove.find(address);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
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
      <p className="mb-4 rounded-md border border-demo/40 px-3 py-2 text-sm text-demo">Demo data. Buys and sells stay in this browser. Not a live market.</p>
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
              {token.marketCapUsd != null
                ? `${token.graduated ? "Graduated" : "On the curve"} · demo snapshot`
                : `${token.graduated ? "Graduated" : "On the curve"} · ${raised.toFixed(3)} / ${GRADUATION_SOL} SOL raised`}
            </p>
          </div>
          <div className="panel mt-6 grid min-h-56 place-items-center p-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-juice">Chart placeholder</p>
            <p className="mt-2 max-w-sm text-sm text-pith-muted">This panel does not draw live candles. The progress bar is the demo curve.</p>
          </div>
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
            {token.graduated ? "Graduated. Demo trades clear on the locked pool." : "On the curve. Quote is SOL."}
          </p>
          <p className="mt-1 font-mono text-xs text-pith-muted">Devnet wallet {grove.solBalance.toFixed(3)} SOL</p>
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

function Fee({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-pith-muted">{k}</dt>
      <dd className="font-mono text-xs">{v}</dd>
    </div>
  );
}
