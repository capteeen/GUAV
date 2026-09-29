export function formatSol(lamports: bigint | number, digits = 3): string {
  const value = typeof lamports === "bigint" ? Number(lamports) / 1e9 : lamports / 1e9;
  if (!Number.isFinite(value)) return "—";
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(digits);
  return value.toFixed(4);
}

export function formatSolNumber(sol: number | null): string {
  if (sol === null || !Number.isFinite(sol)) return "—";
  if (sol >= 100) return sol.toFixed(1);
  if (sol >= 1) return sol.toFixed(2);
  return sol.toFixed(3);
}

export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatBoard(sol: number | null): string {
  if (sol === null || !Number.isFinite(sol)) return "—";
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K`;
  if (sol >= 100) return sol.toFixed(0);
  if (sol >= 10) return sol.toFixed(1);
  return sol.toFixed(1);
}

export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatAge(createdAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1e9;
}

export function shortKey(value: string, size = 4): string {
  if (value.length <= size * 2 + 1) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}
