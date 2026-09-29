import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, getAccount, getMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { Guava } from "../target/types/guava";
import { splitFee, tokensForSol, WORKED_BUY_TOKENS_OUT } from "../lib/curve-math";
import { hasCurveDiscriminator } from "../lib/layout";
import { deriveConfig, deriveCurve, deriveLockAuth, deriveLpLock, deriveLpMint, deriveMetadata, deriveMint, derivePool, deriveVault } from "../lib/pdas";

const TOKEN_SUPPLY = 1_000_000_000_000_000n;

describe("guava", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.guava as Program<Guava>;
  const creator = provider.wallet.publicKey;
  const feeRecipient = Keypair.generate();
  const threshold = new anchor.BN(2_000_000_000);

  before(async () => {
    const balance = await provider.connection.getBalance(creator);
    if (balance < 20 * LAMPORTS_PER_SOL) {
      const sig = await provider.connection.requestAirdrop(creator, 40 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, "confirmed");
    }
    const config = deriveConfig(program.programId);
    const existing = await provider.connection.getAccountInfo(config);
    if (!existing) {
      await program.methods
        .initialize(feeRecipient.publicKey, threshold)
        .accounts({
          authority: creator,
          config,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }
  });

  it("matches the documented fee example", () => {
    const amount = 1_000_000_000n;
    const parts = splitFee(amount, 100, 200);
    assert.equal(parts.platform, 10_000_000n);
    assert.equal(parts.creator, 20_000_000n);
    assert.equal(parts.net, 970_000_000n);
    assert.equal(tokensForSol(30_000_000_000n, 1_073_000_000_000_000n, parts.net), WORKED_BUY_TOKENS_OUT);
  });

  it("rejects a creator fee above 500 bps", async () => {
    try {
      await launch(program, creator, feeRecipient.publicKey, "Badfee", "BADFEE", 501, new anchor.BN(0), new anchor.BN(0));
      assert.fail("fee of 501 should revert");
    } catch (error) {
      const text = String(error);
      assert.match(text, /CreatorFeeTooHigh|6000|creator fee/i);
    }
  });

  it("launch creates a mint and curve; buy then sell updates balances and fees", async () => {
    const ticker = "NECTR";
    const mint = await launch(program, creator, feeRecipient.publicKey, "Nectar", ticker, 250, new anchor.BN(0), new anchor.BN(0));
    const connection = provider.connection;
    const mintAccount = await getMint(connection, mint);
    assert.equal(mintAccount.supply, TOKEN_SUPPLY);
    assert.equal(mintAccount.mintAuthority, null);

    const curvePk = deriveCurve(program.programId, mint);
    const curveInfo = await connection.getAccountInfo(curvePk);
    assert.ok(curveInfo);
    assert.ok(hasCurveDiscriminator(new Uint8Array(curveInfo!.data)));
    const curveBefore = await program.account.curve.fetch(curvePk);
    assert.equal(curveBefore.ticker, ticker);
    assert.equal(curveBefore.creatorFeeBps, 250);
    assert.equal(curveBefore.graduated, false);
    assert.equal(curveBefore.realSolReserves.toString(), "0");

    const poolInfo = await connection.getAccountInfo(derivePool(program.programId, mint));
    assert.equal(poolInfo, null);

    const buyLamports = new anchor.BN(200_000_000);
    const feesBefore = await connection.getBalance(feeRecipient.publicKey);
    await trade(program, creator, feeRecipient.publicKey, mint, "buy", buyLamports, new anchor.BN(1));

    const ata = getAssociatedTokenAddressSync(mint, creator);
    const afterBuyTokens = (await getAccount(connection, ata)).amount;
    assert.ok(afterBuyTokens > 0n);
    const curveBuy = await program.account.curve.fetch(curvePk);
    assert.ok(curveBuy.realSolReserves.toNumber() > 0);
    assert.ok(curveBuy.creatorFeesAccrued.toNumber() > 0);
    const platform = 200_000_000 * 100 / 10_000;
    const creatorFee = 200_000_000 * 250 / 10_000;
    assert.equal((await connection.getBalance(feeRecipient.publicKey)) - feesBefore, platform);
    assert.equal(curveBuy.creatorFeesAccrued.toNumber(), creatorFee);

    const sellAmount = new anchor.BN((afterBuyTokens / 2n).toString());
    await trade(program, creator, feeRecipient.publicKey, mint, "sell", sellAmount, new anchor.BN(0));
    const afterSellTokens = (await getAccount(connection, ata)).amount;
    assert.ok(afterSellTokens < afterBuyTokens);
    const curveSell = await program.account.curve.fetch(curvePk);
    assert.ok(curveSell.realSolReserves.toNumber() < curveBuy.realSolReserves.toNumber());

    const claimed = curveSell.creatorFeesAccrued.toNumber();
    assert.ok(claimed > 0);
    await program.methods
      .claimCreatorFees()
      .accounts({
        creator,
        curve: curvePk,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const curveClaimed = await program.account.curve.fetch(curvePk);
    assert.equal(curveClaimed.creatorFeesAccrued.toNumber(), 0);
  });

  it("optional first buy lands tokens in the same transaction", async () => {
    const first = new anchor.BN(50_000_000);
    const mint = await launch(program, creator, feeRecipient.publicKey, "Softcut", "SOFT", 100, first, new anchor.BN(1));
    const ata = getAssociatedTokenAddressSync(mint, creator);
    const balance = (await getAccount(provider.connection, ata)).amount;
    assert.ok(balance > 0n);
    const curve = await program.account.curve.fetch(deriveCurve(program.programId, mint));
    assert.ok(curve.realSolReserves.toNumber() > 0);
    assert.equal(curve.graduated, false);
  });

  it("graduates at the threshold and locks LP", async () => {
    const mint = await launch(program, creator, feeRecipient.publicKey, "Dewstone", "DEW", 0, new anchor.BN(0), new anchor.BN(0));
    await trade(program, creator, feeRecipient.publicKey, mint, "buy", new anchor.BN(2_100_000_000), new anchor.BN(1));
    const curve = await program.account.curve.fetch(deriveCurve(program.programId, mint));
    assert.equal(curve.complete, true);
    assert.equal(curve.graduated, true);
    assert.equal(curve.realSolReserves.toNumber(), 0);
    assert.ok(curve.solRaised.toNumber() >= 2_000_000_000);

    const pool = await program.account.pool.fetch(derivePool(program.programId, mint));
    assert.ok(pool.solReserves.toNumber() >= 2_000_000_000);
    assert.ok(pool.tokenReserves.toNumber() > 0);
    assert.ok(pool.lpSupply.toNumber() > 0);

    const lpMint = deriveLpMint(program.programId, mint);
    const lpAccount = await getMint(provider.connection, lpMint);
    assert.equal(lpAccount.mintAuthority, null);
    assert.equal(lpAccount.supply, BigInt(pool.lpSupply.toString()));

    const lock = await getAccount(provider.connection, deriveLpLock(program.programId, mint));
    assert.equal(lock.amount, lpAccount.supply);
    assert.ok(lock.owner.equals(deriveLockAuth(program.programId, mint)));

    const creatorAta = getAssociatedTokenAddressSync(lpMint, creator, false, TOKEN_PROGRAM_ID);
    const creatorLp = await provider.connection.getAccountInfo(creatorAta);
    assert.equal(creatorLp, null);

    const ix = createTransferInstruction(lock.address, creatorAta, lock.owner, 1);
    const tx = new anchor.web3.Transaction().add(ix);
    tx.feePayer = creator;
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    const sim = await provider.connection.simulateTransaction(tx);
    assert.ok(sim.value.err);

    const solBefore = pool.solReserves.toNumber();
    await trade(program, creator, feeRecipient.publicKey, mint, "buy", new anchor.BN(50_000_000), new anchor.BN(1));
    const poolAfter = await program.account.pool.fetch(derivePool(program.programId, mint));
    assert.ok(poolAfter.solReserves.toNumber() > solBefore);

    const ata = getAssociatedTokenAddressSync(mint, creator);
    const tokens = (await getAccount(provider.connection, ata)).amount;
    const sell = tokens / 10n;
    await trade(program, creator, feeRecipient.publicKey, mint, "sell", new anchor.BN(sell.toString()), new anchor.BN(0));
    const poolSold = await program.account.pool.fetch(derivePool(program.programId, mint));
    assert.ok(poolSold.solReserves.toNumber() < poolAfter.solReserves.toNumber());
  });
});

async function launch(
  program: Program<Guava>,
  creator: PublicKey,
  feeRecipient: PublicKey,
  name: string,
  ticker: string,
  feeBps: number,
  firstBuy: anchor.BN,
  minOut: anchor.BN,
) {
  const mint = deriveMint(program.programId, creator, ticker);
  const ata = getAssociatedTokenAddressSync(mint, creator);
  await program.methods
    .launch(name, ticker, "guava:local", `${name} test`, feeBps, firstBuy, minOut)
    .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 })])
    .accounts({
      creator,
      config: deriveConfig(program.programId),
      mint,
      curve: deriveCurve(program.programId, mint),
      metadata: deriveMetadata(program.programId, mint),
      vault: deriveVault(program.programId, mint),
      creatorAta: ata,
      feeRecipient,
      pool: derivePool(program.programId, mint),
      lpMint: deriveLpMint(program.programId, mint),
      lpLock: deriveLpLock(program.programId, mint),
      lockAuth: deriveLockAuth(program.programId, mint),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  return mint;
}

async function trade(
  program: Program<Guava>,
  trader: PublicKey,
  feeRecipient: PublicKey,
  mint: PublicKey,
  side: "buy" | "sell",
  amount: anchor.BN,
  minOut: anchor.BN,
) {
  const ata = getAssociatedTokenAddressSync(mint, trader);
  const builder = side === "buy" ? program.methods.buy(amount, minOut) : program.methods.sell(amount, minOut);
  await builder
    .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 })])
    .accounts({
      trader,
      config: deriveConfig(program.programId),
      curve: deriveCurve(program.programId, mint),
      mint,
      vault: deriveVault(program.programId, mint),
      traderAta: ata,
      feeRecipient,
      pool: derivePool(program.programId, mint),
      lpMint: deriveLpMint(program.programId, mint),
      lpLock: deriveLpLock(program.programId, mint),
      lockAuth: deriveLockAuth(program.programId, mint),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
