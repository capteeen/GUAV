"use client";

import { Logo } from "@/components/logo";
import { useGrove } from "@/components/grove-provider";
import { shortKey } from "@/lib/format";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function SiteHeader() {
  const { connected, connect, disconnect, solBalance, wallet } = useGrove();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-[#070807]/90 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center gap-5 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="font-display text-[17px] font-semibold tracking-tight">Guava</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[#b7b0a0]">
          <Link href="/#grove" className={`inline-flex items-center gap-1.5 hover:text-[#f4f1e6] ${pathname === "/" ? "text-[#f4f1e6]" : ""}`}>
            {pathname === "/" ? <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7a2]" /> : null}
            Explore
          </Link>
          <Link href="/launch" className={`inline-flex items-center gap-1.5 hover:text-[#f4f1e6] ${pathname === "/launch" ? "text-[#f4f1e6]" : ""}`}>
            {pathname === "/launch" ? <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7a2]" /> : null}
            Launch
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href="https://x.com/useguav" target="_blank" rel="noreferrer" aria-label="Guava on X" className="hidden h-9 w-9 place-items-center rounded-full border border-white/10 text-[#d9d3c5] hover:bg-white/5 sm:grid">
            <XIcon />
          </a>
          <Link href="/legal" aria-label="About Guava" className="hidden h-9 w-9 place-items-center rounded-full border border-white/10 text-[#d9d3c5] hover:bg-white/5 sm:grid">
            <GlobeIcon />
          </Link>
          <span className="ml-1 hidden h-9 items-center rounded-full border border-white/10 px-3 text-sm text-[#d9d3c5] sm:inline-flex">
            24h volume <span className="ml-1.5 font-medium text-[#f4f1e6]">7 SOL</span>
          </span>
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-[#f28ca0] px-3 text-sm font-semibold text-[#1a1214] hover:bg-[#d45b78] sm:px-4"
              onClick={() => {
                if (connected) setOpen((value) => !value);
                else {
                  connect();
                  setOpen(true);
                }
              }}
            >
              {connected ? `${solBalance.toFixed(2)} SOL` : "Connect wallet"}
            </button>
            {open && connected ? (
              <div className="absolute right-0 top-11 w-56 rounded-2xl border border-white/10 bg-[#141816] p-3 text-sm shadow-xl">
                <p className="font-medium">Wallet</p>
                <p className="mt-1 font-mono text-[11px] text-[#8d887c]">{wallet ? shortKey(wallet) : ""}</p>
                <p className="mt-2 font-mono text-xs">{solBalance.toFixed(3)} SOL</p>
                <Link href="/profile" className="mt-3 block text-xs text-[#f28ca0]" onClick={() => setOpen(false)}>
                  Profile
                </Link>
                <button
                  type="button"
                  className="mt-2 text-xs text-[#b7b0a0]"
                  onClick={() => {
                    disconnect();
                    setOpen(false);
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M9.5 6.8 15.2 0h-1.4L8.9 5.9 4.8 0H0l6 8.7L0 16h1.4l5.2-6.1L11.2 16H16L9.5 6.8Zm-1.8 2.1-.6-.9L2 1h2.1l3.9 5.5.6.9L14 15h-2.1L7.7 8.9Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" />
      <ellipse cx="8" cy="8" rx="2.6" ry="6.2" stroke="currentColor" />
      <path d="M2 8h12" stroke="currentColor" />
    </svg>
  );
}
