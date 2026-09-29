"use client";

import { BoardCard } from "@/components/board-card";
import { TokenArt } from "@/components/token-art";
import { useGrove } from "@/components/grove-provider";
import { formatBoard } from "@/lib/format";
import { GroveToken } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

const FILTERS = ["All", "New today", "Gainers", "Losers"] as const;
type Filter = (typeof FILTERS)[number];
type Sort = "Newest" | "Market cap" | "Volume";

export function HomeView() {
  const { rows } = useGrove();
  const [filter, setFilter] = useState<Filter>("All");
  const [sort, setSort] = useState<Sort>("Market cap");
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const vol = useMemo(() => 20_000 + rows.reduce((sum, row) => sum + (row.volumeSol ?? 0), 0), [rows]);

  const counts = useMemo(() => {
    return {
      All: rows.length,
      "New today": rows.filter((row) => row.createdAt >= dayAgo).length,
      Gainers: rows.filter((row) => row.changePct !== null && row.changePct > 0).length,
      Losers: rows.filter((row) => row.changePct !== null && row.changePct < 0).length,
    };
  }, [rows, dayAgo]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (filter === "New today" && row.createdAt < dayAgo) return false;
      if (filter === "Gainers" && !(row.changePct !== null && row.changePct > 0)) return false;
      if (filter === "Losers" && !(row.changePct !== null && row.changePct < 0)) return false;
      if (!needle) return true;
      return row.name.toLowerCase().includes(needle) || row.ticker.toLowerCase().includes(needle);
    });
    next.sort((a, b) => {
      if (sort === "Market cap") return (b.marketCapUsd ?? b.marketCapSol ?? 0) - (a.marketCapUsd ?? a.marketCapSol ?? 0);
      if (sort === "Volume") return (b.volumeSol ?? 0) - (a.volumeSol ?? 0);
      return b.createdAt - a.createdAt;
    });
    return next;
  }, [rows, filter, query, sort, dayAgo]);

  const faces = rows.slice(0, 6);

  return (
    <div className="mx-auto max-w-[1180px] px-5">
      <section className="grid items-start gap-8 pb-2 pt-12 lg:grid-cols-[1.25fr_0.75fr] lg:pt-16">
        <h1 className="max-w-[640px] font-display text-[44px] font-medium leading-[0.92] tracking-[-0.035em] text-[#f4f1e6] sm:text-[64px]">
          Ripe launches.
          <span className="mt-1 block text-[#f28ca0]">Fresh pairs.</span>
        </h1>
        <div className="max-w-[320px] lg:justify-self-end lg:pt-3">
          <p className="text-[15px] leading-relaxed text-[#c9c3b4]">
            Launch a token on a SOL curve. You choose the cut. It trades in the grove until the pool locks.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/launch" className="inline-flex h-11 items-center rounded-full bg-[#f28ca0] px-5 text-sm font-semibold text-[#1a1214] hover:bg-[#d45b78]">
              Launch a token
            </Link>
            <a href="#grove" className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-medium text-[#f4f1e6] hover:bg-white/5">
              Explore the grove
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-4 rounded-[22px] border border-white/[0.08] bg-[#101412] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-dashed border-white/20 text-xl text-[#8d887c]">+</span>
          <div className="min-w-0">
            <p className="font-display text-2xl tracking-tight text-[#f4f1e6]">$YOURS</p>
            <p className="text-xs text-[#8d887c]">Your token</p>
          </div>
          <span className="text-2xl text-[#5c584e]">/</span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1c3a28]" aria-hidden="true">
            <SolanaLogo className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-2xl tracking-tight">SOL</p>
            <p className="text-xs text-[#8d887c]">Solana</p>
          </div>
        </div>
        <div className="inline-flex w-fit rounded-full bg-black/40 p-1">
          <span className="rounded-full bg-[#f28ca0] px-3 py-1 text-xs font-semibold text-[#1a1214]">SOL</span>
        </div>
      </section>
      <p className="sr-only">24h grove volume {formatBoard(vol)} SOL. Demo data.</p>

      <section id="grove" className="pb-4 pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-[240px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d887c]">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tokens"
              className="h-10 w-full rounded-full border border-white/10 bg-[#101412] pl-9 pr-3 text-sm outline-none placeholder:text-[#8d887c] focus:border-white/25"
            />
          </label>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {FILTERS.map((item) => {
              const active = filter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 ${active ? "bg-[#1a1f1c] text-[#f4f1e6]" : "text-[#b7b0a0] hover:text-[#f4f1e6]"}`}
                >
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7a2]" /> : null}
                  {item}
                  <span className="font-mono text-xs text-[#8d887c]">{counts[item]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 lg:ml-auto">
            <p className="text-sm text-[#8d887c]">
              Showing {visible.length} of {rows.length}
            </p>
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 text-sm text-[#b7b0a0]"
                onClick={() => setSortOpen((open) => !open)}
              >
                Sort by <span className="font-medium text-[#f4f1e6]">{sort}</span>
                <span className="text-xs">▾</span>
              </button>
              {sortOpen ? (
                <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-white/10 bg-[#141816] p-1 shadow-xl">
                  {(["Newest", "Market cap", "Volume"] as Sort[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => {
                        setSort(item);
                        setSortOpen(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-[#8d887c]">No ripe picks yet — launch the first.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {visible.map((row) => (
              <BoardCard key={row.address} token={row} href={`/token/${row.address}`} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-white/[0.06] px-4 py-16 text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          {faces.map((row) => (
            <Face key={row.address} row={row} />
          ))}
          <Link href="/launch" className="grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-[#f28ca0]/70 text-lg text-[#f28ca0]">
            +
          </Link>
        </div>
        <p className="text-sm text-[#f28ca0]">Launch on Guava</p>
        <h2 className="mx-auto mt-3 max-w-[640px] font-display text-4xl font-medium tracking-tight text-[#f4f1e6] sm:text-5xl">
          Something ripe to launch?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[#b7b0a0]">Create your token and give the grove a new pair.</p>
        <Link href="/launch" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#f28ca0] px-5 text-sm font-semibold text-[#1a1214] hover:bg-[#d45b78]">
          Launch a token →
        </Link>
      </section>
    </div>
  );
}

function Face({ row }: { row: GroveToken }) {
  return (
    <Link href={`/token/${row.address}`} className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10" aria-label={row.name}>
      <TokenArt ticker={row.ticker} image={row.image} />
    </Link>
  );
}

function SolanaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 397.7 311.7" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="solana-logo" x1="360" y1="0" x2="40" y2="312" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path fill="url(#solana-logo)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path fill="url(#solana-logo)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path fill="url(#solana-logo)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
      <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
