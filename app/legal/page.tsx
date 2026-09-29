import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal — Guava",
  description: "Guava is an original brand.",
};

export default function LegalPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">Legal</h1>
      <div className="mt-6 space-y-4 text-sm leading-6 text-pith-muted">
        <p>Guava (Gua, gua.fun, ticker GUAV) is an original launchpad brand. This page is not legal advice.</p>
        <p>
          Memecoins can go to zero. Phase 1 targets Solana devnet. Mainnet is out of scope.
        </p>
        <p>
          Pairing on this build is native SOL on a bonding curve. Graduation moves remaining reserves into a Guava-owned constant-product pool
          and locks the LP. No stock pairing is offered.
        </p>
        <p>Guava is not a security scanner, and it is not affiliated with other launchpads or fruit-named crypto tools.</p>
        <p>Full notes live in docs/LEGAL.md in the repository.</p>
      </div>
    </article>
  );
}
