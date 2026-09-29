use crate::constants::TOKEN_DECIMALS;
use crate::errors::GuavaError;
use crate::math::{self, isqrt};
use crate::state::{Curve, GlobalConfig, Graduated, Pool, Traded};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction};
use anchor_spl::token::{self, spl_token, Mint, TokenAccount};

pub struct TradeIx<'info> {
    pub trader: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub curve_ai: AccountInfo<'info>,
    pub mint_ai: AccountInfo<'info>,
    pub vault_ai: AccountInfo<'info>,
    pub trader_ata: AccountInfo<'info>,
    pub fee_recipient: AccountInfo<'info>,
    pub pool: AccountInfo<'info>,
    pub lp_mint: AccountInfo<'info>,
    pub lp_lock: AccountInfo<'info>,
    pub lock_auth: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub pool_bump: u8,
    pub lp_mint_bump: u8,
    pub lp_lock_bump: u8,
}

pub fn buy<'info>(
    config: &GlobalConfig,
    curve: &mut Curve,
    ix: &TradeIx<'info>,
    sol_amount: u64,
    min_tokens_out: u64,
) -> Result<()> {
    require!(sol_amount > 0, GuavaError::ZeroAmount);
    if curve.graduated {
        return pool_buy(config, curve, ix, sol_amount, min_tokens_out);
    }
    require!(!curve.complete, GuavaError::CurveComplete);

    let (platform, creator_fee, net) =
        math::split_fee(sol_amount, config.platform_fee_bps, curve.creator_fee_bps)?;
    require!(net > 0, GuavaError::ZeroAmount);

    let tokens_out = math::tokens_for_sol(curve.virtual_sol_reserves, curve.virtual_token_reserves, net)?;
    require!(tokens_out > 0, GuavaError::InsufficientCurve);
    require!(tokens_out <= curve.real_token_reserves, GuavaError::InsufficientCurve);
    require!(tokens_out >= min_tokens_out, GuavaError::SlippageExceeded);

    transfer_sol(&ix.trader, &ix.fee_recipient, &ix.system_program, platform)?;
    transfer_sol(&ix.trader, &ix.curve_ai, &ix.system_program, creator_fee)?;
    transfer_sol(&ix.trader, &ix.curve_ai, &ix.system_program, net)?;
    transfer_tokens_signed(curve, ix, &ix.vault_ai, &ix.trader_ata, tokens_out)?;

    curve.virtual_sol_reserves = curve
        .virtual_sol_reserves
        .checked_add(net)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.virtual_token_reserves = curve
        .virtual_token_reserves
        .checked_sub(tokens_out)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.real_sol_reserves = curve
        .real_sol_reserves
        .checked_add(net)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.real_token_reserves = curve
        .real_token_reserves
        .checked_sub(tokens_out)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.creator_fees_accrued = curve
        .creator_fees_accrued
        .checked_add(creator_fee)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.sol_raised = curve.real_sol_reserves;

    emit!(Traded {
        mint: curve.mint,
        is_buy: true,
        sol_amount: net,
        token_amount: tokens_out,
        real_sol_reserves: curve.real_sol_reserves,
        graduated: false,
    });

    if curve.real_sol_reserves >= curve.graduation_threshold {
        graduate(config, curve, ix)?;
    }
    Ok(())
}

pub fn sell<'info>(
    config: &GlobalConfig,
    curve: &mut Curve,
    ix: &TradeIx<'info>,
    token_amount: u64,
    min_sol_out: u64,
) -> Result<()> {
    require!(token_amount > 0, GuavaError::ZeroAmount);
    if curve.graduated {
        return pool_sell(config, curve, ix, token_amount, min_sol_out);
    }
    require!(!curve.complete, GuavaError::CurveComplete);

    let sol_gross =
        math::sol_for_tokens(curve.virtual_sol_reserves, curve.virtual_token_reserves, token_amount)?;
    require!(sol_gross > 0, GuavaError::InsufficientCurve);
    require!(sol_gross <= curve.real_sol_reserves, GuavaError::InsufficientCurve);

    let (platform, creator_fee, net) =
        math::split_fee(sol_gross, config.platform_fee_bps, curve.creator_fee_bps)?;
    require!(net >= min_sol_out, GuavaError::SlippageExceeded);

    transfer_tokens_user(&ix.trader, &ix.trader_ata, &ix.vault_ai, &ix.token_program, token_amount)?;
    debit(&ix.curve_ai, &ix.trader, net)?;
    debit(&ix.curve_ai, &ix.fee_recipient, platform)?;

    curve.virtual_token_reserves = curve
        .virtual_token_reserves
        .checked_add(token_amount)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.virtual_sol_reserves = curve
        .virtual_sol_reserves
        .checked_sub(sol_gross)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.real_token_reserves = curve
        .real_token_reserves
        .checked_add(token_amount)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.real_sol_reserves = curve
        .real_sol_reserves
        .checked_sub(sol_gross)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.creator_fees_accrued = curve
        .creator_fees_accrued
        .checked_add(creator_fee)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.sol_raised = curve.real_sol_reserves;

    emit!(Traded {
        mint: curve.mint,
        is_buy: false,
        sol_amount: net,
        token_amount,
        real_sol_reserves: curve.real_sol_reserves,
        graduated: false,
    });
    Ok(())
}

fn pool_buy<'info>(
    config: &GlobalConfig,
    curve: &mut Curve,
    ix: &TradeIx<'info>,
    sol_amount: u64,
    min_tokens_out: u64,
) -> Result<()> {
    let mut pool = read_pool(&ix.pool)?;
    let (platform, creator_fee, net) =
        math::split_fee(sol_amount, config.platform_fee_bps, curve.creator_fee_bps)?;
    require!(net > 0, GuavaError::ZeroAmount);
    let tokens_out = math::pool_tokens_for_sol(pool.sol_reserves, pool.token_reserves, net)?;
    require!(tokens_out > 0, GuavaError::InsufficientCurve);
    require!(tokens_out < pool.token_reserves, GuavaError::InsufficientCurve);
    require!(tokens_out >= min_tokens_out, GuavaError::SlippageExceeded);

    transfer_sol(&ix.trader, &ix.fee_recipient, &ix.system_program, platform)?;
    transfer_sol(&ix.trader, &ix.curve_ai, &ix.system_program, creator_fee)?;
    transfer_sol(&ix.trader, &ix.pool, &ix.system_program, net)?;
    transfer_tokens_signed(curve, ix, &ix.vault_ai, &ix.trader_ata, tokens_out)?;

    pool.sol_reserves = pool
        .sol_reserves
        .checked_add(net)
        .ok_or(error!(GuavaError::MathOverflow))?;
    pool.token_reserves = pool
        .token_reserves
        .checked_sub(tokens_out)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.creator_fees_accrued = curve
        .creator_fees_accrued
        .checked_add(creator_fee)
        .ok_or(error!(GuavaError::MathOverflow))?;
    write_pool(&ix.pool, &pool)?;

    emit!(Traded {
        mint: curve.mint,
        is_buy: true,
        sol_amount: net,
        token_amount: tokens_out,
        real_sol_reserves: pool.sol_reserves,
        graduated: true,
    });
    Ok(())
}

fn pool_sell<'info>(
    config: &GlobalConfig,
    curve: &mut Curve,
    ix: &TradeIx<'info>,
    token_amount: u64,
    min_sol_out: u64,
) -> Result<()> {
    let mut pool = read_pool(&ix.pool)?;
    let sol_gross = math::pool_sol_for_tokens(pool.sol_reserves, pool.token_reserves, token_amount)?;
    require!(sol_gross > 0, GuavaError::InsufficientCurve);
    require!(sol_gross < pool.sol_reserves, GuavaError::InsufficientCurve);
    let (platform, creator_fee, net) =
        math::split_fee(sol_gross, config.platform_fee_bps, curve.creator_fee_bps)?;
    require!(net >= min_sol_out, GuavaError::SlippageExceeded);

    transfer_tokens_user(&ix.trader, &ix.trader_ata, &ix.vault_ai, &ix.token_program, token_amount)?;
    debit(&ix.pool, &ix.trader, net)?;
    debit(&ix.pool, &ix.fee_recipient, platform)?;
    debit(&ix.pool, &ix.curve_ai, creator_fee)?;

    pool.token_reserves = pool
        .token_reserves
        .checked_add(token_amount)
        .ok_or(error!(GuavaError::MathOverflow))?;
    pool.sol_reserves = pool
        .sol_reserves
        .checked_sub(sol_gross)
        .ok_or(error!(GuavaError::MathOverflow))?;
    curve.creator_fees_accrued = curve
        .creator_fees_accrued
        .checked_add(creator_fee)
        .ok_or(error!(GuavaError::MathOverflow))?;
    write_pool(&ix.pool, &pool)?;

    emit!(Traded {
        mint: curve.mint,
        is_buy: false,
        sol_amount: net,
        token_amount,
        real_sol_reserves: pool.sol_reserves,
        graduated: true,
    });
    Ok(())
}

fn graduate<'info>(config: &GlobalConfig, curve: &mut Curve, ix: &TradeIx<'info>) -> Result<()> {
    require!(!curve.graduated, GuavaError::CurveComplete);
    let sol_reserves = curve.real_sol_reserves;
    let token_reserves = token::accessor::amount(&ix.vault_ai)?;
    require!(sol_reserves > 0 && token_reserves > 0, GuavaError::EmptyPool);

    let lp_supply_u128 = isqrt((sol_reserves as u128).saturating_mul(token_reserves as u128));
    let lp_supply = u64::try_from(lp_supply_u128).map_err(|_| error!(GuavaError::MathOverflow))?;
    require!(lp_supply > 0, GuavaError::EmptyPool);

    create_pda(
        &ix.payer,
        &ix.pool,
        8 + Pool::INIT_SPACE,
        &crate::ID,
        &ix.system_program,
        &[b"pool", curve.mint.as_ref(), &[ix.pool_bump]],
    )?;
    create_pda(
        &ix.payer,
        &ix.lp_mint,
        Mint::LEN,
        &anchor_spl::token::ID,
        &ix.system_program,
        &[b"lp-mint", curve.mint.as_ref(), &[ix.lp_mint_bump]],
    )?;
    token::initialize_mint2(
        CpiContext::new(
            ix.token_program.clone(),
            token::InitializeMint2 { mint: ix.lp_mint.clone() },
        ),
        0,
        &ix.curve_ai.key(),
        None,
    )?;
    create_pda(
        &ix.payer,
        &ix.lp_lock,
        TokenAccount::LEN,
        &anchor_spl::token::ID,
        &ix.system_program,
        &[b"lp-lock", curve.mint.as_ref(), &[ix.lp_lock_bump]],
    )?;
    token::initialize_account3(
        CpiContext::new(
            ix.token_program.clone(),
            token::InitializeAccount3 {
                account: ix.lp_lock.clone(),
                mint: ix.lp_mint.clone(),
                authority: ix.lock_auth.clone(),
            },
        ),
    )?;

    let bump = curve.bump;
    let mint = curve.mint;
    let signer: &[&[u8]] = &[b"curve", mint.as_ref(), &[bump]];
    token::mint_to(
        CpiContext::new_with_signer(
            ix.token_program.clone(),
            token::MintTo {
                mint: ix.lp_mint.clone(),
                to: ix.lp_lock.clone(),
                authority: ix.curve_ai.clone(),
            },
            &[signer],
        ),
        lp_supply,
    )?;
    token::set_authority(
        CpiContext::new_with_signer(
            ix.token_program.clone(),
            token::SetAuthority {
                current_authority: ix.curve_ai.clone(),
                account_or_mint: ix.lp_mint.clone(),
            },
            &[signer],
        ),
        spl_token::instruction::AuthorityType::MintTokens,
        None,
    )?;

    debit(&ix.curve_ai, &ix.pool, sol_reserves)?;

    let pool = Pool {
        mint: curve.mint,
        curve: ix.curve_ai.key(),
        lp_mint: ix.lp_mint.key(),
        lp_lock: ix.lp_lock.key(),
        lock_authority: ix.lock_auth.key(),
        sol_reserves,
        token_reserves,
        lp_supply,
        graduated_at: Clock::get()?.unix_timestamp,
        bump: ix.pool_bump,
    };
    write_pool(&ix.pool, &pool)?;

    curve.pool = ix.pool.key();
    curve.sol_raised = sol_reserves;
    curve.real_sol_reserves = 0;
    curve.real_token_reserves = 0;
    curve.complete = true;
    curve.graduated = true;

    emit!(Graduated {
        mint: curve.mint,
        sol_reserves,
        token_reserves,
        lp_supply,
    });
    let _ = config;
    let _ = TOKEN_DECIMALS;
    Ok(())
}

fn transfer_sol<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    invoke(
        &system_instruction::transfer(from.key, to.key, amount),
        &[from.clone(), to.clone(), system_program.clone()],
    )?;
    Ok(())
}

fn debit<'info>(from: &AccountInfo<'info>, to: &AccountInfo<'info>, amount: u64) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let from_bal = from.lamports();
    let to_bal = to.lamports();
    **from.try_borrow_mut_lamports()? = from_bal
        .checked_sub(amount)
        .ok_or(error!(GuavaError::InsufficientCurve))?;
    **to.try_borrow_mut_lamports()? = to_bal
        .checked_add(amount)
        .ok_or(error!(GuavaError::MathOverflow))?;
    Ok(())
}

fn transfer_tokens_signed<'info>(
    curve: &Curve,
    ix: &TradeIx<'info>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let bump = curve.bump;
    let mint = curve.mint;
    let signer: &[&[u8]] = &[b"curve", mint.as_ref(), &[bump]];
    token::transfer_checked(
        CpiContext::new_with_signer(
            ix.token_program.clone(),
            token::TransferChecked {
                from: from.clone(),
                mint: ix.mint_ai.clone(),
                to: to.clone(),
                authority: ix.curve_ai.clone(),
            },
            &[signer],
        ),
        amount,
        TOKEN_DECIMALS,
    )?;
    Ok(())
}

fn transfer_tokens_user<'info>(
    authority: &AccountInfo<'info>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new(
            token_program.clone(),
            token::Transfer {
                from: from.clone(),
                to: to.clone(),
                authority: authority.clone(),
            },
        ),
        amount,
    )?;
    Ok(())
}

fn create_pda<'info>(
    payer: &AccountInfo<'info>,
    new_account: &AccountInfo<'info>,
    space: usize,
    owner: &Pubkey,
    system_program: &AccountInfo<'info>,
    seeds: &[&[u8]],
) -> Result<()> {
    let lamports = Rent::get()?.minimum_balance(space);
    let ix = system_instruction::create_account(
        payer.key,
        new_account.key,
        lamports,
        space as u64,
        owner,
    );
    invoke_signed(
        &ix,
        &[payer.clone(), new_account.clone(), system_program.clone()],
        &[seeds],
    )?;
    Ok(())
}

fn read_pool(account: &AccountInfo) -> Result<Pool> {
    let data = account.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    Pool::try_deserialize(&mut slice)
}

fn write_pool(account: &AccountInfo, pool: &Pool) -> Result<()> {
    let mut data = account.try_borrow_mut_data()?;
    pool.try_serialize(&mut &mut data[..])?;
    Ok(())
}
