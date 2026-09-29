const KEY = "guava.local.v1";

export type LocalRecord = {
  mint: string;
  image?: string;
  socialX?: string;
  socialTg?: string;
};

function readAll(): Record<string, LocalRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalRecord>) : {};
  } catch {
    return {};
  }
}

export function readLocal(mint: string): LocalRecord | undefined {
  return readAll()[mint];
}

export function writeLocal(record: LocalRecord) {
  if (typeof window === "undefined") return;
  const all = readAll();
  const image = record.image && record.image.length < 450_000 ? record.image : undefined;
  all[record.mint] = { ...record, image };
  window.localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("guava-grove"));
}
