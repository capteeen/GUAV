use crate::errors::GuavaError;
use anchor_lang::prelude::*;

pub fn split_fee(amount: u64, platform_bps: u16, creator_bps: u16) -> Result<(u64, u64, u64)> {
    let amount = amount as u128;
    let platform = amount * platform_bps as u128 / 10_000u128;
    let creator = amount * creator_bps as u128 / 10_000u128;
    let net = amount
        .checked_sub(platform)
        .and_then(|v| v.checked_sub(creator))
        .ok_or(error!(GuavaError::MathOverflow))?;
    Ok((platform as u64, creator as u64, net as u64))
}

/// Constant-product buy against virtual reserves. Fees are taken before this call.
pub fn tokens_for_sol(virtual_sol: u64, virtual_token: u64, sol_in: u64) -> Result<u64> {
    if sol_in == 0 {
        return Ok(0);
    }
    let virtual_sol = virtual_sol as u128;
    let virtual_token = virtual_token as u128;
    let sol_in = sol_in as u128;
    let k = virtual_sol
        .checked_mul(virtual_token)
        .ok_or(error!(GuavaError::MathOverflow))?;
    let new_virtual_sol = virtual_sol
        .checked_add(sol_in)
        .ok_or(error!(GuavaError::MathOverflow))?;
    let new_virtual_token = k / new_virtual_sol;
    let out = virtual_token
        .checked_sub(new_virtual_token)
        .ok_or(error!(GuavaError::MathOverflow))?;
    u64::try_from(out).map_err(|_| error!(GuavaError::MathOverflow))
}

/// Constant-product sell. Returns gross SOL out before fees.
pub fn sol_for_tokens(virtual_sol: u64, virtual_token: u64, tokens_in: u64) -> Result<u64> {
    if tokens_in == 0 {
        return Ok(0);
    }
    let virtual_sol = virtual_sol as u128;
    let virtual_token = virtual_token as u128;
    let tokens_in = tokens_in as u128;
    let k = virtual_sol
        .checked_mul(virtual_token)
        .ok_or(error!(GuavaError::MathOverflow))?;
    let new_virtual_token = virtual_token
        .checked_add(tokens_in)
        .ok_or(error!(GuavaError::MathOverflow))?;
    let new_virtual_sol = k / new_virtual_token;
    let out = virtual_sol
        .checked_sub(new_virtual_sol)
        .ok_or(error!(GuavaError::MathOverflow))?;
    u64::try_from(out).map_err(|_| error!(GuavaError::MathOverflow))
}

pub fn pool_tokens_for_sol(sol_reserve: u64, token_reserve: u64, sol_in: u64) -> Result<u64> {
    tokens_for_sol(sol_reserve, token_reserve, sol_in)
}

pub fn pool_sol_for_tokens(sol_reserve: u64, token_reserve: u64, tokens_in: u64) -> Result<u64> {
    sol_for_tokens(sol_reserve, token_reserve, tokens_in)
}

pub fn isqrt(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn worked_buy_example() {
        let amount = 1_000_000_000u64;
        let (platform, creator, net) = split_fee(amount, 100, 200).unwrap();
        assert_eq!(platform, 10_000_000);
        assert_eq!(creator, 20_000_000);
        assert_eq!(net, 970_000_000);
        let out = tokens_for_sol(30_000_000_000, 1_073_000_000_000_000, net).unwrap();
        assert_eq!(out, 33_607_039_070_068);
    }

    #[test]
    fn rejects_inverted_sell_math() {
        let out = sol_for_tokens(30_000_000_000, 1_073_000_000_000_000, 33_607_039_070_068).unwrap();
        assert!(out > 0);
        assert!(out <= 970_000_000);
    }
}
