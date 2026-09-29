import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { CURVE_DISCRIMINATOR, TOKEN_SUPPLY, isProgramConfigured, configuredProgramId } from "./constants";
import { marketCapLamports } from "./curve-math";
import { decodeCurve, decodeMetadata, decodePool, hasCurveDiscriminator } from "./layout";
import { deriveCurve, deriveMetadata, derivePool } from "./pdas";
import { readLocal } from "./registry";
import { GroveToken, TokenDetail } from "./types";

export function activeProgramId(): PublicKey | null {
  if (!isProgramConfigured()) return null;
  try {
    return new PublicKey(configuredProgramId());
  } catch {
    return null;
  }
}

function toRow(decoded: ReturnType<typeof decodeCurve>, pool?: ReturnType<typeof decodePool> | null): GroveToken {
  const local = typeof window === "undefined" ? undefined : readLocal(decoded.mint.toBase58());
  const graduated = decoded.graduated && pool;
  const quote = graduated ? pool.solReserves : decoded.virtualSolReserves;
  const tokens = graduated ? pool.tokenReserves : decoded.virtualTokenReserves;
  const supply = decoded.tokenTotalSupply || TOKEN_SUPPLY;
  const mcapLamports = marketCapLamports(quote, tokens, supply);
  const raised = decoded.graduated ? decoded.solRaised : decoded.realSolReserves;
  return {
    address: decoded.mint.toBase58(),
    name: decoded.name,
    ticker: decoded.ticker,
    image: local?.image,
    description: undefined,
    marketCapSol: Number(mcapLamports) / 1e9,
    volumeSol: null,
    changePct: null,
    createdAt: Number(decoded.createdAt) * 1000,
    creator: decoded.creator.toBase58(),
    creatorFeeBps: decoded.creatorFeeBps,
    demo: false,
    graduated: decoded.graduated,
    realSolLamports: Number(raised),
    graduationLamports: Number(decoded.graduationThreshold),
    virtualSol: decoded.virtualSolReserves,
    virtualToken: decoded.virtualTokenReserves,
    poolSol: pool?.solReserves,
    poolToken: pool?.tokenReserves,
    creatorFeesLamports: decoded.creatorFeesAccrued,
  };
}

export async function fetchLiveGrove(connection: Connection): Promise<GroveToken[]> {
  const programId = activeProgramId();
  if (!programId) return [];
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [{ memcmp: { offset: 0, bytes: bs58.encode(Buffer.from(CURVE_DISCRIMINATOR)) } }],
  });
  const curves = accounts
    .map((account) => {
      try {
        if (!hasCurveDiscriminator(account.account.data)) return null;
        return decodeCurve(account.account.data);
      } catch {
        return null;
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const graduated = curves.filter((curve) => curve.graduated);
  const poolInfos = graduated.length
    ? await connection.getMultipleAccountsInfo(graduated.map((curve) => derivePool(programId, curve.mint)))
    : [];
  const pools = new Map<string, ReturnType<typeof decodePool>>();
  graduated.forEach((curve, index) => {
    const info = poolInfos[index];
    if (!info) return;
    try {
      pools.set(curve.mint.toBase58(), decodePool(info.data));
    } catch {
      /* pool not readable yet */
    }
  });

  return curves
    .map((curve) => toRow(curve, pools.get(curve.mint.toBase58()) ?? null))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchToken(connection: Connection, mintAddress: string): Promise<TokenDetail | null> {
  const programId = activeProgramId();
  if (!programId) return null;
  let mint: PublicKey;
  try {
    mint = new PublicKey(mintAddress);
  } catch {
    return null;
  }
  const curvePk = deriveCurve(programId, mint);
  const metaPk = deriveMetadata(programId, mint);
  const poolPk = derivePool(programId, mint);
  const [curveInfo, metaInfo, poolInfo] = await connection.getMultipleAccountsInfo([curvePk, metaPk, poolPk]);
  if (!curveInfo || !hasCurveDiscriminator(curveInfo.data)) return null;
  const curve = decodeCurve(curveInfo.data);
  const meta = metaInfo ? safeMeta(metaInfo.data) : null;
  const pool = poolInfo ? safePool(poolInfo.data) : null;
  const row = toRow(curve, pool);
  return {
    ...row,
    description: meta?.description,
    uri: meta?.uri,
    feeRecipient: curve.feeRecipient.toBase58(),
    creatorFeesLamports: curve.creatorFeesAccrued,
    complete: curve.complete,
    exists: true,
    image: row.image,
  };
}

function safeMeta(data: Buffer) {
  try {
    return decodeMetadata(data);
  } catch {
    return null;
  }
}

function safePool(data: Buffer) {
  try {
    return decodePool(data);
  } catch {
    return null;
  }
}

export async function fetchCreatorCurves(connection: Connection, creator: PublicKey): Promise<GroveToken[]> {
  const live = await fetchLiveGrove(connection);
  return live.filter((row) => row.creator === creator.toBase58());
}
