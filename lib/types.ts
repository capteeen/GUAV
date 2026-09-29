export type GroveToken = {
  address: string;
  name: string;
  ticker: string;
  image?: string;
  description?: string;
  marketCapSol: number | null;
  marketCapUsd?: number | null;
  volumeSol: number | null;
  changePct: number | null;
  createdAt: number;
  creator: string;
  creatorFeeBps: number;
  demo: boolean;
  graduated: boolean;
  realSolLamports: number;
  graduationLamports: number;
  virtualSol?: bigint;
  virtualToken?: bigint;
  poolSol?: bigint;
  poolToken?: bigint;
  creatorFeesLamports?: bigint;
  creatorFeesSol?: number;
  walletTokens?: number;
};

export type TokenDetail = GroveToken & {
  uri?: string;
  feeRecipient?: string;
  creatorFeesLamports?: bigint;
  complete?: boolean;
  exists: boolean;
};
