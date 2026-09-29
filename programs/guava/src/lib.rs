use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

pub mod constants;
pub mod errors;
pub mod math;
pub mod state;
pub mod trade;

use crate::constants::*;
use crate::errors::GuavaError;
use crate::state::{Curve, GlobalConfig, GuavaMetadata, Launched};
use crate::trade::TradeIx;

declare_id!("67HiGDKWjYSgGQNq7icz6vPRNNQAMogdzdJvgztYYPmX");

#[program]
pub mod guava {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeConfig>,
        fee_recipient: Pubkey,
        graduation_threshold: u64,
    ) -> Result<()> {
        require!(fee_recipient != Pubkey::default(), GuavaError::BadFeeRecipient);
        require!(graduation_threshold > 0, GuavaError::ThresholdInvalid);
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.fee_recipient = fee_recipient;
        config.platform_fee_bps = PLATFORM_FEE_BPS;
        config.bump = ctx.bumps.config;
        config.graduation_threshold = graduation_threshold;
        config.virtual_sol_reserves = VIRTUAL_SOL_LAMPORTS;
        config.virtual_token_reserves = VIRTUAL_TOKEN_RESERVES;
        config.real_token_reserves = REAL_TOKEN_RESERVES;
        config.token_supply = TOKEN_SUPPLY;
        Ok(())
    }

    pub fn launch(
        ctx: Context<Launch>,
        name: String,
        ticker: String,
        uri: String,
        description: String,
        creator_fee_bps: u16,
        first_buy_lamports: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        require!((1..=32).contains(&name.len()), GuavaError::NameInvalid);
        require!(valid_ticker(&ticker), GuavaError::TickerInvalid);
        require!(description.len() <= 280, GuavaError::DescriptionTooLong);
        require!(uri.len() <= 128, GuavaError::UriTooLong);
        require!(creator_fee_bps <= MAX_CREATOR_FEE_BPS, GuavaError::CreatorFeeTooHigh);

        let clock = Clock::get()?;
        let bump = ctx.bumps.curve;
        let mint_bump = ctx.bumps.mint;
        let vault_bump = ctx.bumps.vault;

        let curve = &mut ctx.accounts.curve;
        curve.creator = ctx.accounts.creator.key();
        curve.mint = ctx.accounts.mint.key();
        curve.fee_recipient = ctx.accounts.config.fee_recipient;
        curve.pool = Pubkey::default();
        curve.virtual_sol_reserves = ctx.accounts.config.virtual_sol_reserves;
        curve.virtual_token_reserves = ctx.accounts.config.virtual_token_reserves;
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = ctx.accounts.config.real_token_reserves;
        curve.token_total_supply = ctx.accounts.config.token_supply;
        curve.creator_fees_accrued = 0;
        curve.sol_raised = 0;
        curve.graduation_threshold = ctx.accounts.config.graduation_threshold;
        curve.created_at = clock.unix_timestamp;
        curve.creator_fee_bps = creator_fee_bps;
        curve.complete = false;
        curve.graduated = false;
        curve.bump = bump;
        curve.vault_bump = vault_bump;
        curve.mint_bump = mint_bump;
        curve.name = name.clone();
        curve.ticker = ticker.clone();

        let meta = &mut ctx.accounts.metadata;
        meta.mint = ctx.accounts.mint.key();
        meta.creator = ctx.accounts.creator.key();
        meta.created_at = clock.unix_timestamp;
        meta.creator_fee_bps = creator_fee_bps;
        meta.bump = ctx.bumps.metadata;
        meta.name = name;
        meta.ticker = ticker;
        meta.uri = uri;
        meta.description = description;

        let mint_key = ctx.accounts.mint.key();
        let signer: &[&[u8]] = &[b"curve", mint_key.as_ref(), &[bump]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.curve.to_account_info(),
                },
                &[signer],
            ),
            ctx.accounts.config.token_supply,
        )?;
        token::set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::SetAuthority {
                    current_authority: ctx.accounts.curve.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
                &[signer],
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            None,
        )?;

        emit!(Launched {
            mint: ctx.accounts.mint.key(),
            creator: ctx.accounts.creator.key(),
            creator_fee_bps,
            ts: clock.unix_timestamp,
        });

        if first_buy_lamports > 0 {
            let ix = trade_ix_from_launch(&ctx)?;
            trade::buy(
                &ctx.accounts.config,
                &mut ctx.accounts.curve,
                &ix,
                first_buy_lamports,
                min_tokens_out,
            )?;
        }
        Ok(())
    }

    pub fn buy(ctx: Context<Trade>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let ix = trade_ix_from_trade(&ctx)?;
        trade::buy(
            &ctx.accounts.config,
            &mut ctx.accounts.curve,
            &ix,
            sol_amount,
            min_tokens_out,
        )
    }

    pub fn sell(ctx: Context<Trade>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let ix = trade_ix_from_trade(&ctx)?;
        trade::sell(
            &ctx.accounts.config,
            &mut ctx.accounts.curve,
            &ix,
            token_amount,
            min_sol_out,
        )
    }

    pub fn claim_creator_fees(ctx: Context<Claim>) -> Result<()> {
        let fees = ctx.accounts.curve.creator_fees_accrued;
        require!(fees > 0, GuavaError::NoFees);
        let rent = Rent::get()?.minimum_balance(ctx.accounts.curve.to_account_info().data_len());
        let reserved = if ctx.accounts.curve.graduated {
            0
        } else {
            ctx.accounts.curve.real_sol_reserves
        };
        let lamports = ctx.accounts.curve.to_account_info().lamports();
        require!(
            lamports >= rent + reserved + fees,
            GuavaError::InsufficientCurve
        );
        ctx.accounts.curve.creator_fees_accrued = 0;
        **ctx.accounts.curve.to_account_info().try_borrow_mut_lamports()? = lamports - fees;
        let creator_bal = ctx.accounts.creator.lamports();
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? = creator_bal + fees;
        Ok(())
    }
}

fn valid_ticker(ticker: &str) -> bool {
    let bytes = ticker.as_bytes();
    (1..=10).contains(&bytes.len())
        && bytes
            .iter()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
}

fn trade_ix_from_launch<'info>(ctx: &Context<Launch<'info>>) -> Result<TradeIx<'info>> {
    Ok(TradeIx {
        trader: ctx.accounts.creator.to_account_info(),
        payer: ctx.accounts.creator.to_account_info(),
        curve_ai: ctx.accounts.curve.to_account_info(),
        mint_ai: ctx.accounts.mint.to_account_info(),
        vault_ai: ctx.accounts.vault.to_account_info(),
        trader_ata: ctx.accounts.creator_ata.to_account_info(),
        fee_recipient: ctx.accounts.fee_recipient.to_account_info(),
        pool: ctx.accounts.pool.to_account_info(),
        lp_mint: ctx.accounts.lp_mint.to_account_info(),
        lp_lock: ctx.accounts.lp_lock.to_account_info(),
        lock_auth: ctx.accounts.lock_auth.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        pool_bump: ctx.bumps.pool,
        lp_mint_bump: ctx.bumps.lp_mint,
        lp_lock_bump: ctx.bumps.lp_lock,
    })
}

fn trade_ix_from_trade<'info>(ctx: &Context<Trade<'info>>) -> Result<TradeIx<'info>> {
    Ok(TradeIx {
        trader: ctx.accounts.trader.to_account_info(),
        payer: ctx.accounts.trader.to_account_info(),
        curve_ai: ctx.accounts.curve.to_account_info(),
        mint_ai: ctx.accounts.mint.to_account_info(),
        vault_ai: ctx.accounts.vault.to_account_info(),
        trader_ata: ctx.accounts.trader_ata.to_account_info(),
        fee_recipient: ctx.accounts.fee_recipient.to_account_info(),
        pool: ctx.accounts.pool.to_account_info(),
        lp_mint: ctx.accounts.lp_mint.to_account_info(),
        lp_lock: ctx.accounts.lp_lock.to_account_info(),
        lock_auth: ctx.accounts.lock_auth.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        pool_bump: ctx.bumps.pool,
        lp_mint_bump: ctx.bumps.lp_mint,
        lp_lock_bump: ctx.bumps.lp_lock,
    })
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, ticker: String)]
pub struct Launch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,
    #[account(
        init,
        payer = creator,
        seeds = [b"mint", creator.key().as_ref(), ticker.as_bytes()],
        bump,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = curve,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        space = 8 + Curve::INIT_SPACE,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve: Account<'info, Curve>,
    #[account(
        init,
        payer = creator,
        space = 8 + GuavaMetadata::INIT_SPACE,
        seeds = [b"metadata", mint.key().as_ref()],
        bump
    )]
    pub metadata: Account<'info, GuavaMetadata>,
    #[account(
        init,
        payer = creator,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = curve,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_ata: Account<'info, TokenAccount>,
    /// CHECK: receives the platform fee in lamports.
    #[account(mut, address = config.fee_recipient)]
    pub fee_recipient: UncheckedAccount<'info>,
    /// CHECK: pool PDA, created only when a buy finishes the curve.
    #[account(mut, seeds = [b"pool", mint.key().as_ref()], bump)]
    pub pool: UncheckedAccount<'info>,
    /// CHECK: LP mint PDA, created at graduation.
    #[account(mut, seeds = [b"lp-mint", mint.key().as_ref()], bump)]
    pub lp_mint: UncheckedAccount<'info>,
    /// CHECK: token account that holds every LP token.
    #[account(mut, seeds = [b"lp-lock", mint.key().as_ref()], bump)]
    pub lp_lock: UncheckedAccount<'info>,
    /// CHECK: PDA that owns the lock account. No instruction signs it.
    #[account(seeds = [b"lock-auth", mint.key().as_ref()], bump)]
    pub lock_auth: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = curve.bump)]
    pub curve: Account<'info, Curve>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump = curve.vault_bump,
        token::mint = mint,
        token::authority = curve,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = trader,
        associated_token::mint = mint,
        associated_token::authority = trader,
    )]
    pub trader_ata: Account<'info, TokenAccount>,
    /// CHECK: receives the platform fee in lamports.
    #[account(mut, address = config.fee_recipient)]
    pub fee_recipient: UncheckedAccount<'info>,
    /// CHECK: pool PDA, created only when a buy finishes the curve.
    #[account(mut, seeds = [b"pool", mint.key().as_ref()], bump)]
    pub pool: UncheckedAccount<'info>,
    /// CHECK: LP mint PDA, created at graduation.
    #[account(mut, seeds = [b"lp-mint", mint.key().as_ref()], bump)]
    pub lp_mint: UncheckedAccount<'info>,
    /// CHECK: token account that holds every LP token.
    #[account(mut, seeds = [b"lp-lock", mint.key().as_ref()], bump)]
    pub lp_lock: UncheckedAccount<'info>,
    /// CHECK: PDA that owns the lock account. No instruction signs it.
    #[account(seeds = [b"lock-auth", mint.key().as_ref()], bump)]
    pub lock_auth: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [b"curve", curve.mint.as_ref()],
        bump = curve.bump,
        has_one = creator,
    )]
    pub curve: Account<'info, Curve>,
    pub system_program: Program<'info, System>,
}
