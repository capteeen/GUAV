use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub platform_fee_bps: u16,
    pub bump: u8,
    pub graduation_threshold: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_token_reserves: u64,
    pub token_supply: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Curve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub fee_recipient: Pubkey,
    pub pool: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub token_total_supply: u64,
    pub creator_fees_accrued: u64,
    /// Final curve SOL captured at graduation. While the curve is open this matches real SOL.
    pub sol_raised: u64,
    pub graduation_threshold: u64,
    pub created_at: i64,
    pub creator_fee_bps: u16,
    pub complete: bool,
    pub graduated: bool,
    pub bump: u8,
    pub vault_bump: u8,
    pub mint_bump: u8,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub ticker: String,
}

#[account]
#[derive(InitSpace)]
pub struct GuavaMetadata {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub created_at: i64,
    pub creator_fee_bps: u16,
    pub bump: u8,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub ticker: String,
    #[max_len(128)]
    pub uri: String,
    #[max_len(280)]
    pub description: String,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub mint: Pubkey,
    pub curve: Pubkey,
    pub lp_mint: Pubkey,
    pub lp_lock: Pubkey,
    pub lock_authority: Pubkey,
    pub sol_reserves: u64,
    pub token_reserves: u64,
    pub lp_supply: u64,
    pub graduated_at: i64,
    pub bump: u8,
}

#[event]
pub struct Launched {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub creator_fee_bps: u16,
    pub ts: i64,
}

#[event]
pub struct Traded {
    pub mint: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub real_sol_reserves: u64,
    pub graduated: bool,
}

#[event]
pub struct Graduated {
    pub mint: Pubkey,
    pub sol_reserves: u64,
    pub token_reserves: u64,
    pub lp_supply: u64,
}
