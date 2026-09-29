import { TokenArt } from "@/components/token-art";
import { formatAge, formatBoard, formatPct, formatUsd } from "@/lib/format";
import { GroveToken } from "@/lib/types";
import Link from "next/link";

export function BoardCard({
  token,
  href,
  badge,
}: {
  token: Pick<
    GroveToken,
    "address" | "name" | "ticker" | "image" | "marketCapSol" | "marketCapUsd" | "volumeSol" | "changePct" | "createdAt" | "graduated" | "creatorFeeBps" | "demo"
  >;
  href?: string;
  badge?: string;
}) {
  const change = token.changePct;
  const tone = change === null ? "text-[#8d887c]" : change >= 0 ? "text-[#6ee7a2]" : "text-[#f07178]";
  const mark = badge ?? (token.graduated ? "Graduated" : "Curve");
  const usd = token.marketCapUsd != null ? formatUsd(token.marketCapUsd) : null;
  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-[#0c100e]">
        <TokenArt ticker={token.ticker} image={token.image} />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-[#f6f1e4] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7a2]" />
          {mark}
        </span>
        {!token.demo && token.creatorFeeBps === 0 ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] text-[#f6f1e4]">
            0% fee
          </span>
        ) : null}
      </div>
      <div className="px-1.5 pb-1 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[15px] font-medium text-[#f6f1e4]">{token.name || "Token name"}</p>
          <p className="shrink-0 text-xs text-[#8d887c]">{token.createdAt ? formatAge(token.createdAt) : "—"}</p>
        </div>
        <p className="mt-0.5 font-mono text-xs text-[#8d887c]">${token.ticker || "TICKER"}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-[#8d887c]">Market cap</p>
            <p className="whitespace-nowrap text-[17px] font-medium tracking-tight text-[#f6f1e4]">
              {usd ?? (
                <>
                  {formatBoard(token.marketCapSol)}
                  <span className="ml-1 text-xs font-normal text-[#8d887c]">SOL</span>
                </>
              )}
            </p>
          </div>
          <p className={`font-mono text-sm ${tone}`}>{formatPct(change)}</p>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#8d887c]">
          <span>Vol 24h</span>
          <span className="text-[#f6f1e4]">{token.volumeSol == null ? "—" : `${formatBoard(token.volumeSol)} SOL`}</span>
        </div>
      </div>
    </>
  );

  const className =
    "block rounded-[18px] border border-white/[0.08] bg-[#121614] p-2 transition duration-150 hover:border-white/20";

  if (!href) return <article className={className}>{body}</article>;
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
