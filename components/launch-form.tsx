"use client";

import { BoardCard } from "@/components/board-card";
import { useGrove } from "@/components/grove-provider";
import { GRADUATION_SOL, splitTrade } from "@/lib/demo-wallet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

const FEES = [0, 1, 2, 3, 4, 5];

export function LaunchForm() {
  const router = useRouter();
  const grove = useGrove();
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [feePct, setFeePct] = useState(0);
  const [firstBuy, setFirstBuy] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [telegram, setTelegram] = useState("");
  const [quote, setQuote] = useState<"SOL" | "USDC">("SOL");
  const [mode, setMode] = useState<"tax" | "flat">("tax");
  const [status, setStatus] = useState("");

  const cleanTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const creatorBps = mode === "tax" ? feePct * 100 : 0;
  const first = parseSol(firstBuy);
  const fees = useMemo(() => splitTrade(first || 1, creatorBps), [first, creatorBps]);
  const ready = name.trim().length > 0 && cleanTicker.length > 0 && image.length > 0 && mode === "tax";

  async function onImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 450_000) {
      setStatus("That image is too large for this browser preview. Use a smaller square file.");
      return;
    }
    const data = await fileToDataUrl(file);
    setImage(data);
    setStatus("");
  }

  function onSubmit() {
    if (mode !== "tax") {
      setStatus("0% mode is soon. Launches use the 1% Guava curve.");
      return;
    }
    if (!ready) {
      setStatus("Add a name, ticker, and image.");
      return;
    }
    const socials = [xHandle.trim() ? `X ${xHandle.trim()}` : "", telegram.trim() ? `Telegram ${telegram.trim()}` : ""]
      .filter(Boolean)
      .join(" · ");
    const result = grove.launch({
      name,
      ticker: cleanTicker,
      description: [description.trim(), socials].filter(Boolean).join("\n"),
      image,
      creatorFeeBps: creatorBps,
      firstBuySol: first,
    });
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    router.push(`/token/${result.address}`);
  }

  const preview = {
    address: "preview",
    name: name.trim() || "Token name",
    ticker: cleanTicker || "TICKER",
    image,
    marketCapSol: first > 0 ? 4.2 + fees.net * 6 : 0,
    marketCapUsd: null,
    volumeSol: first > 0 ? first : 0,
    changePct: first > 0 ? 0 : null,
    createdAt: Date.now(),
    graduated: false,
    creatorFeeBps: creatorBps,
    demo: false,
  };

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-6">
      <Link href="/#grove" className="text-sm text-[#b7b0a0] hover:text-[#f4f1e6]">
        ← Back to tokens
      </Link>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-tight text-[#f4f1e6]">Launch a token</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#b7b0a0]">
        Name it, give it a face, and pair it with SOL. The preview shows exactly how it will appear on the board.
      </p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("tax")}
              className={`rounded-2xl border px-4 py-3 text-left ${mode === "tax" ? "border-[#f28ca0]/70 bg-[#f28ca0]/5" : "border-white/10"}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`grid h-4 w-4 place-items-center rounded-full border ${mode === "tax" ? "border-[#f28ca0]" : "border-white/30"}`}>
                  {mode === "tax" ? <span className="h-2 w-2 rounded-full bg-[#f28ca0]" /> : null}
                </span>
                Tax token
              </span>
              <span className="mt-1 block pl-6 text-xs leading-relaxed text-[#8d887c]">Every trade pays 1% to Guava and your 0–5% creator fee.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("flat");
                setStatus("0% mode is soon. Launches use the 1% Guava curve.");
              }}
              className={`rounded-2xl border px-4 py-3 text-left ${mode === "flat" ? "border-white/30" : "border-white/10"}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[#d9d3c5]">
                <span className="grid h-4 w-4 place-items-center rounded-full border border-white/30" />
                0% tax token
              </span>
              <span className="mt-1 block pl-6 text-xs leading-relaxed text-[#8d887c]">Soon. A plain pool with a 0.5% fee.</span>
            </button>
          </div>

          <Section index="01" title="Identity" hint="What people will search for.">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <Field label="Name" count={`${name.length}/32`}>
                <input value={name} maxLength={32} onChange={(event) => setName(event.target.value)} placeholder="e.g. Pinkpith" className={fieldClass} />
              </Field>
              <Field label="Ticker" count={`${cleanTicker.length}/10`}>
                <input value={cleanTicker} maxLength={10} onChange={(event) => setTicker(event.target.value)} placeholder="PITH" className={`${fieldClass} font-mono uppercase`} />
              </Field>
            </div>
            <Field label="Description" count={`Optional · ${description.length}/280`}>
              <textarea
                value={description}
                maxLength={280}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is it, and why should anyone care?"
                className={`${fieldClass} min-h-[96px] resize-none py-3`}
              />
            </Field>
          </Section>

          <Section index="02" title="Artwork" hint="Square images read best. It fills the whole top of the tile.">
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-white/15 px-4 py-4 hover:border-white/30">
              <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 text-[#8d887c]">
                {image ? <img src={image} alt="" className="h-full w-full rounded-xl object-cover" /> : <ImageIcon />}
              </span>
              <span>
                <span className="block text-sm font-medium">Upload token image</span>
                <span className="mt-0.5 block text-xs text-[#8d887c]">PNG, JPG, GIF or WebP. Drop a file here or click to browse.</span>
              </span>
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={(event) => onImage(event.target.files?.[0])} />
            </label>
          </Section>

          <Section index="03" title="Pairing" hint="Pairs with SOL. The curve is Solana-native.">
            <div className="flex flex-wrap gap-2">
              {(["SOL", "USDC"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuote(item)}
                  className={`h-9 rounded-full px-3 text-sm font-medium ${quote === item ? "bg-[#f28ca0] text-[#1a1214]" : "border border-white/10 text-[#d9d3c5] hover:bg-white/5"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            {quote === "USDC" ? <p className="text-xs text-[#ffe08a]">Buys settle in SOL.</p> : null}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#101412] px-4 py-3 text-sm">
              <span>Paired with {quote}</span>
              <span className="text-[#8d887c]">Solana</span>
            </div>
          </Section>

          <Section index="04" title="Community" hint="Optional. Shown on your token so people can find you.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="X profile" count="Optional">
                <input value={xHandle} onChange={(event) => setXHandle(event.target.value)} placeholder="x.com/handle" className={fieldClass} />
              </Field>
              <Field label="Telegram" count="Optional">
                <input value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder="t.me/community" className={fieldClass} />
              </Field>
            </div>
          </Section>

          <Section index="05" title="Creator fee" hint="Your share of every trade on your coin, paid to the wallet that launches it.">
            <div className="flex flex-wrap gap-2">
              {FEES.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setFeePct(pct)}
                  className={`h-9 min-w-12 rounded-full px-3 text-sm ${feePct === pct ? "bg-[#1c1c1c] text-[#f4f1e6] ring-1 ring-white/20" : "text-[#b7b0a0] hover:text-[#f4f1e6]"}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </Section>

          <Section index="06" title="First buy" hint="Optional. Buy your coin in the same step, at the launch price.">
            <Field label="Amount" count="Optional">
              <input value={firstBuy} inputMode="decimal" onChange={(event) => setFirstBuy(event.target.value)} placeholder="0.00 SOL" className={fieldClass} />
            </Field>
            <p className="text-xs text-[#8d887c]">
              {first > 0 ? `${fees.net.toFixed(3)} SOL reaches the curve after fees. Goal is ${GRADUATION_SOL.toFixed(0)} SOL.` : "Shows how much of the curve you seed."}
            </p>
          </Section>
          {status ? <p className="mt-4 text-sm text-[#ffe08a]">{status}</p> : null}
        </div>

        <aside className="lg:sticky lg:top-20">
          <div className="rounded-[22px] border border-white/[0.08] bg-[#101412] p-3">
            <div className="mb-3 flex items-center justify-between px-1 text-xs text-[#8d887c]">
              <span>Live preview</span>
              <span>As it appears on the board</span>
            </div>
            <BoardCard token={preview} badge="New" />
            <p className="mt-4 px-1 text-xs text-[#8d887c]">Paired with {quote}</p>
            <dl className="mt-3 space-y-2.5 px-1 text-sm">
              <FeeRow k="Launch fee" v="Gas only" />
              <FeeRow k="Trade fee" v="1% to Guava" />
              <FeeRow k="Your share" v={`${feePct}% of every trade`} />
              <FeeRow k="Liquidity" v="Locks at graduation" />
            </dl>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!ready}
              className="mt-4 h-11 w-full rounded-xl bg-[#1a2420] text-sm font-medium text-[#d7d1c4] enabled:bg-[#f28ca0] enabled:font-semibold enabled:text-[#1a1214] disabled:cursor-not-allowed"
            >
              {ready ? "Launch into the grove" : "Add name, ticker and image"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const fieldClass =
  "h-11 w-full rounded-xl border border-white/10 bg-[#0c0f0d] px-3 text-sm text-[#f6f1e4] outline-none placeholder:text-[#6f6a60] focus:border-white/25";

function Section({ index, title, hint, children }: { index: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-white/[0.06] pt-6">
      <div className="mb-4 flex gap-3">
        <span className="font-mono text-xs text-[#f28ca0]">{index}</span>
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-0.5 text-sm text-[#8d887c]">{hint}</p>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Field({ label, count, children }: { label: string; count?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-xs text-[#8d887c]">
        <span>{label}</span>
        {count ? <span>{count}</span> : null}
      </span>
      {children}
    </label>
  );
}

function FeeRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-2">
      <dt className="text-[#8d887c]">{k}</dt>
      <dd className="text-right text-[#f4f1e6]">{v}</dd>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" />
      <circle cx="6" cy="6.5" r="1.2" fill="currentColor" />
      <path d="M2 12 L6 8.5 L9 11 L11 9 L14 12" stroke="currentColor" />
    </svg>
  );
}

function parseSol(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const amount = Number(trimmed);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}
