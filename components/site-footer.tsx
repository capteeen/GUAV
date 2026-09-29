"use client";

import { Logo } from "@/components/logo";
import { useGrove } from "@/components/grove-provider";
import Link from "next/link";

export function SiteFooter() {
  const { connect } = useGrove();

  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm">
          <Logo className="h-7 w-7" />
          <span className="font-medium">Guava</span>
          <span className="text-[#8d887c]">gua.fun</span>
          <a href="https://x.com/guafun" target="_blank" rel="noreferrer" aria-label="Guava on X" className="text-[#b7b0a0] hover:text-[#f4f1e6]">
            𝕏
          </a>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-[#b7b0a0]">
          <Link href="/#grove" className="hover:text-[#f4f1e6]">
            Explore
          </Link>
          <Link href="/launch" className="hover:text-[#f4f1e6]">
            Launch
          </Link>
          <button type="button" className="hover:text-[#f4f1e6]" onClick={connect}>
            Connect wallet
          </button>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-5 pb-6 text-xs text-[#6f6a60]">
        <p>© 2026 Guava</p>
        <Link href="/legal" className="hover:text-[#f4f1e6]">
          Legal
        </Link>
      </div>
    </footer>
  );
}
