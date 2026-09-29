"use client";

import { Button } from "@/components/ui/button";
import { useGrove } from "@/components/grove-provider";
import { DEMO_WALLET } from "@/lib/demo-wallet";
import Link from "next/link";
import { useState } from "react";

export function ProfileView() {
  const grove = useGrove();
  const [note, setNote] = useState("");
  const mine = grove.connected ? grove.rows.filter((row) => row.creator === DEMO_WALLET) : [];
  const claimable = mine.reduce((sum, row) => sum + (row.creatorFeesSol ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-flesh">Your grove</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Guava: your profile</h1>
      {!grove.connected ? (
        <div className="mt-4 max-w-xl">
          <p className="text-pith-muted">Connect the Devnet wallet to see tokens you seeded and claimable creator juice.</p>
          <Button className="mt-4" variant="rind" onClick={grove.connect}>
            Connect wallet
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-3 font-mono text-sm text-pith-muted">Devnet wallet · demo · {grove.solBalance.toFixed(3)} SOL</p>
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl">Tokens you seeded</h2>
              <p className="font-mono text-sm">
                Claimable creator juice <span className="text-juice">{claimable.toFixed(4)} SOL</span>
              </p>
            </div>
            {mine.length === 0 ? (
              <p className="mt-4 text-sm text-pith-muted">
                No seeds from this wallet yet. <Link className="underline" href="/launch">Launch the first.</Link>
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-leaf-700 border-y border-leaf-700">
                {mine.map((row) => (
                  <li key={row.address} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link href={`/token/${row.address}`} className="font-medium">
                        {row.name} <span className="font-mono text-xs text-pith-muted">{row.ticker}</span>
                      </Link>
                      <p className="font-mono text-xs text-pith-muted">
                        {row.graduated ? "Graduated" : "On the curve"} · juice {(row.creatorFeesSol ?? 0).toFixed(4)} SOL
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setNote("Creator juice on this page is demo-only. Nothing is sent.")}>
                      Claim juice
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {mine.length === 0 ? (
              <Button className="mt-4" variant="ghost" size="sm" onClick={() => setNote("Creator juice on this page is demo-only. Nothing is sent.")}>
                Claim juice
              </Button>
            ) : null}
          </section>
        </>
      )}
      {note ? <p className="mt-4 text-sm text-juice">{note}</p> : null}
      <p className="mt-6 text-xs text-demo">Demo data</p>
    </div>
  );
}
