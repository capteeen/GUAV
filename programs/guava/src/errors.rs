use anchor_lang::prelude::*;

#[error_code]
pub enum GuavaError {
    #[msg("Creator fee must be from 0 to 500 bps")]
    CreatorFeeTooHigh,
    #[msg("Name must be 1 to 32 characters")]
    NameInvalid,
    #[msg("Ticker must be 1 to 10 letters or digits")]
    TickerInvalid,
    #[msg("Description must be 280 characters or fewer")]
    DescriptionTooLong,
    #[msg("URI must be 128 characters or fewer")]
    UriTooLong,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage limit missed")]
    SlippageExceeded,
    #[msg("Curve cannot fill that size")]
    InsufficientCurve,
    #[msg("This curve is full")]
    CurveComplete,
    #[msg("Pool is not open yet")]
    NotGraduated,
    #[msg("Graduation threshold must be greater than zero")]
    ThresholdInvalid,
    #[msg("Nothing to claim")]
    NoFees,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Graduated pool has no inventory")]
    EmptyPool,
    #[msg("Fee recipient missing")]
    BadFeeRecipient,
}
