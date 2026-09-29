export function TokenArt({
  ticker,
  image,
  className = "",
}: {
  ticker: string;
  image?: string;
  className?: string;
}) {
  if (image) {
    return <img src={image} alt="" className={`h-full w-full object-cover ${className}`} />;
  }

  const hue = hash(ticker || "gua");
  const palette = PALETTES[hue % PALETTES.length];
  const motif = hue % 6;

  return (
    <svg viewBox="0 0 320 320" className={`h-full w-full ${className}`} aria-hidden="true">
      <rect width="320" height="320" fill={palette.bg} />
      {motif === 0 ? <CrossSection palette={palette} shift={hue} /> : null}
      {motif === 1 ? <RingCut palette={palette} shift={hue} /> : null}
      {motif === 2 ? <SeedCluster palette={palette} shift={hue} /> : null}
      {motif === 3 ? <LeafMark palette={palette} shift={hue} /> : null}
      {motif === 4 ? <SplitFlesh palette={palette} shift={hue} /> : null}
      {motif === 5 ? <DropMark palette={palette} shift={hue} /> : null}
    </svg>
  );
}

type Palette = { bg: string; a: string; b: string; c: string };

function CrossSection({ palette, shift }: { palette: Palette; shift: number }) {
  const x = 150 + (shift % 20);
  return (
    <>
      <circle cx={x} cy="168" r="108" fill={palette.c} />
      <circle cx={x} cy="168" r="78" fill={palette.a} />
      <circle cx={x - 16} cy="156" r="7" fill={palette.b} />
      <circle cx={x + 14} cy="172" r="6" fill={palette.b} />
      <circle cx={x - 4} cy="188" r="5" fill={palette.b} />
      <circle cx={x + 22} cy="150" r="4" fill={palette.b} />
    </>
  );
}

function RingCut({ palette, shift }: { palette: Palette; shift: number }) {
  const tilt = (shift % 30) - 15;
  return (
    <g transform={`rotate(${tilt} 160 160)`}>
      <rect x="36" y="36" width="248" height="248" rx="48" fill={palette.c} />
      <circle cx="160" cy="160" r="78" fill={palette.a} />
      <circle cx="160" cy="160" r="28" fill={palette.b} />
    </g>
  );
}

function SeedCluster({ palette, shift }: { palette: Palette; shift: number }) {
  const spots = [
    [70, 80],
    [180, 60],
    [240, 150],
    [90, 200],
    [190, 230],
    [140, 140],
  ];
  return (
    <>
      <circle cx="160" cy="170" r="120" fill={palette.c} />
      {spots.map(([x, y], index) => (
        <circle key={index} cx={x + (shift % 12)} cy={y} r={index === 5 ? 34 : 22} fill={index % 2 ? palette.a : palette.b} />
      ))}
    </>
  );
}

function LeafMark({ palette, shift }: { palette: Palette; shift: number }) {
  return (
    <g transform={`rotate(${(shift % 20) - 8} 160 170)`}>
      <ellipse cx="160" cy="176" rx="70" ry="120" fill={palette.c} />
      <ellipse cx="160" cy="176" rx="42" ry="88" fill={palette.a} />
      <path d="M160 70 L160 270" stroke={palette.b} strokeWidth="6" />
    </g>
  );
}

function SplitFlesh({ palette, shift }: { palette: Palette; shift: number }) {
  return (
    <>
      <circle cx={110 + (shift % 16)} cy="160" r="90" fill={palette.a} />
      <circle cx="210" cy="170" r="78" fill={palette.c} />
      <circle cx="168" cy="166" r="22" fill={palette.b} />
    </>
  );
}

function DropMark({ palette, shift }: { palette: Palette; shift: number }) {
  return (
    <>
      <rect x="0" y="180" width="320" height="140" fill={palette.c} />
      <circle cx={160 + (shift % 24)} cy="150" r="86" fill={palette.a} />
      <circle cx="160" cy="150" r="34" fill={palette.b} />
    </>
  );
}

const PALETTES: Palette[] = [
  { bg: "#163024", a: "#F28CA0", b: "#F6F1E4", c: "#2F6B3A" },
  { bg: "#24161c", a: "#F6F1E4", b: "#F28CA0", c: "#3F6B4A" },
  { bg: "#102018", a: "#FFE08A", b: "#F28CA0", c: "#1C3A2A" },
  { bg: "#1a2214", a: "#3F9A4E", b: "#F6F1E4", c: "#F28CA0" },
  { bg: "#2a1418", a: "#D45B78", b: "#FFE08A", c: "#F6F1E4" },
  { bg: "#101816", a: "#F28CA0", b: "#2F6B3A", c: "#E7D7C4" },
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
