import { PublicKey } from "@solana/web3.js";
import { CURVE_DISCRIMINATOR } from "./constants";

export type DecodedCurve = {
  creator: PublicKey;
  mint: PublicKey;
  feeRecipient: PublicKey;
  pool: PublicKey;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  tokenTotalSupply: bigint;
  creatorFeesAccrued: bigint;
  solRaised: bigint;
  graduationThreshold: bigint;
  createdAt: bigint;
  creatorFeeBps: number;
  complete: boolean;
  graduated: boolean;
  name: string;
  ticker: string;
};

export type DecodedMetadata = {
  mint: PublicKey;
  creator: PublicKey;
  createdAt: bigint;
  creatorFeeBps: number;
  name: string;
  ticker: string;
  uri: string;
  description: string;
};

export type DecodedPool = {
  mint: PublicKey;
  curve: PublicKey;
  lpMint: PublicKey;
  lpLock: PublicKey;
  lockAuthority: PublicKey;
  solReserves: bigint;
  tokenReserves: bigint;
  lpSupply: bigint;
  graduatedAt: bigint;
};

class Reader {
  private offset = 0;
  constructor(private data: Uint8Array) {}

  bytes(n: number): Uint8Array {
    const slice = this.data.subarray(this.offset, this.offset + n);
    this.offset += n;
    return slice;
  }

  pubkey(): PublicKey {
    return new PublicKey(this.bytes(32));
  }

  u64(): bigint {
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 8);
    const value = view.getBigUint64(0, true);
    this.offset += 8;
    return value;
  }

  i64(): bigint {
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 8);
    const value = view.getBigInt64(0, true);
    this.offset += 8;
    return value;
  }

  u16(): number {
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 2);
    const value = view.getUint16(0, true);
    this.offset += 2;
    return value;
  }

  u8(): number {
    const value = this.data[this.offset] ?? 0;
    this.offset += 1;
    return value;
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  string(): string {
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 4);
    const len = view.getUint32(0, true);
    this.offset += 4;
    const raw = this.bytes(len);
    return new TextDecoder().decode(raw);
  }
}

export function hasCurveDiscriminator(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i += 1) {
    if (data[i] !== CURVE_DISCRIMINATOR[i]) return false;
  }
  return true;
}

export function decodeCurve(data: Uint8Array): DecodedCurve {
  const reader = new Reader(data);
  reader.bytes(8);
  return {
    creator: reader.pubkey(),
    mint: reader.pubkey(),
    feeRecipient: reader.pubkey(),
    pool: reader.pubkey(),
    virtualSolReserves: reader.u64(),
    virtualTokenReserves: reader.u64(),
    realSolReserves: reader.u64(),
    realTokenReserves: reader.u64(),
    tokenTotalSupply: reader.u64(),
    creatorFeesAccrued: reader.u64(),
    solRaised: reader.u64(),
    graduationThreshold: reader.u64(),
    createdAt: reader.i64(),
    creatorFeeBps: reader.u16(),
    complete: reader.bool(),
    graduated: reader.bool(),
    name: readAfterBumps(reader),
    ticker: reader.string(),
  };
}

function readAfterBumps(reader: Reader): string {
  reader.u8();
  reader.u8();
  reader.u8();
  return reader.string();
}

export type DecodedConfig = {
  authority: PublicKey;
  feeRecipient: PublicKey;
  platformFeeBps: number;
  graduationThreshold: bigint;
};

export function decodeConfig(data: Uint8Array): DecodedConfig {
  const reader = new Reader(data);
  reader.bytes(8);
  const authority = reader.pubkey();
  const feeRecipient = reader.pubkey();
  const platformFeeBps = reader.u16();
  reader.u8();
  return {
    authority,
    feeRecipient,
    platformFeeBps,
    graduationThreshold: reader.u64(),
  };
}

export function decodeMetadata(data: Uint8Array): DecodedMetadata {
  const reader = new Reader(data);
  reader.bytes(8);
  const mint = reader.pubkey();
  const creator = reader.pubkey();
  const createdAt = reader.i64();
  const creatorFeeBps = reader.u16();
  reader.u8();
  return {
    mint,
    creator,
    createdAt,
    creatorFeeBps,
    name: reader.string(),
    ticker: reader.string(),
    uri: reader.string(),
    description: reader.string(),
  };
}

export function decodePool(data: Uint8Array): DecodedPool {
  const reader = new Reader(data);
  reader.bytes(8);
  return {
    mint: reader.pubkey(),
    curve: reader.pubkey(),
    lpMint: reader.pubkey(),
    lpLock: reader.pubkey(),
    lockAuthority: reader.pubkey(),
    solReserves: reader.u64(),
    tokenReserves: reader.u64(),
    lpSupply: reader.u64(),
    graduatedAt: reader.i64(),
  };
}
