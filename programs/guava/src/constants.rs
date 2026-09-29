/// Fixed supply: 1_000_000_000 tokens at 6 decimals.
pub const TOKEN_DECIMALS: u8 = 6;
pub const TOKEN_SUPPLY: u64 = 1_000_000_000_000_000;

/// Constant-product virtual depth. Spot price is virtual SOL / virtual tokens.
pub const VIRTUAL_SOL_LAMPORTS: u64 = 30_000_000_000;
/// 1_073_000_000 tokens at 6 decimals.
pub const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000_000_000;
/// Tokens that can trade on the curve. The remainder stays in the vault
/// and seeds the graduated pool.
pub const REAL_TOKEN_RESERVES: u64 = 800_000_000_000_000;

pub const PLATFORM_FEE_BPS: u16 = 100;
pub const MAX_CREATOR_FEE_BPS: u16 = 500;
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Devnet initialize script passes this value. It is not a mainnet deployment.
pub const DEVNET_GRADUATION_LAMPORTS: u64 = 2_000_000_000;
/// Config shape for a later mainnet initialize. Not deployed and not a live claim.
pub const MAINNET_SHAPED_GRADUATION_LAMPORTS: u64 = 85_000_000_000;

pub const RESERVED_FOR_POOL: u64 = TOKEN_SUPPLY - REAL_TOKEN_RESERVES;
