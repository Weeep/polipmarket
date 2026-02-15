import test from "node:test";
import assert from "node:assert/strict";

import {
  applyNetAmountFromPool,
  applyNetAmountToPool,
  calcExecutionPrice,
  calcFee,
  calcGrossFromNetAfterFee,
  calcNetAmountForSellShares,
  calcSharesForBuyNetAmount,
  calcSlippageBps,
  validateFeeBps,
} from "../ammQuote";

function assertThrowsMessage(fn: () => unknown, message: string): void {
  assert.throws(fn, (error: unknown) => {
    return error instanceof Error && error.message === message;
  });
}

test("calculates fee from amount and bps", () => {
  assert.equal(calcFee(1000, 250), 25);
});

test("accepts valid fee bps values", () => {
  assert.doesNotThrow(() => validateFeeBps(0));
  assert.doesNotThrow(() => validateFeeBps(500));
  assert.doesNotThrow(() => validateFeeBps(9999));
});

test("rejects invalid fee bps values", () => {
  assertThrowsMessage(() => validateFeeBps(-1), "Invalid AMM fee configuration");
  assertThrowsMessage(() => validateFeeBps(10_000), "Invalid AMM fee configuration");
  assertThrowsMessage(() => validateFeeBps(Number.NaN), "Invalid AMM fee configuration");
  assertThrowsMessage(() => validateFeeBps(Number.POSITIVE_INFINITY), "Invalid AMM fee configuration");
});

test("converts net amount to gross amount", () => {
  assert.ok(Math.abs(calcGrossFromNetAfterFee(975, 250) - 1000) < 1e-10);
});

test("returns expected execution price for YES and NO", () => {
  const pool = { yesPool: 5000, noPool: 5000 };

  assert.ok(Math.abs(calcExecutionPrice(pool, "YES") - 0.5) < 1e-10);
  assert.ok(Math.abs(calcExecutionPrice(pool, "NO") - 0.5) < 1e-10);

  const asymmetricPool = { yesPool: 7000, noPool: 3000 };
  assert.ok(Math.abs(calcExecutionPrice(asymmetricPool, "YES") - 0.7) < 1e-10);
  assert.ok(Math.abs(calcExecutionPrice(asymmetricPool, "NO") - 0.3) < 1e-10);
});

test("rejects invalid execution price pool", () => {
  assertThrowsMessage(
    () => calcExecutionPrice({ yesPool: 0, noPool: 0 }, "YES"),
    "Invalid AMM liquidity state",
  );
});

test("adds net amount only to the selected side", () => {
  const pool = { yesPool: 5000, noPool: 5000 };

  assert.deepEqual(applyNetAmountToPool(pool, "YES", 200), { yesPool: 5200, noPool: 5000 });
  assert.deepEqual(applyNetAmountToPool(pool, "NO", 200), { yesPool: 5000, noPool: 5200 });
});

test("removes net amount from selected side and blocks full depletion", () => {
  const pool = { yesPool: 5000, noPool: 5000 };

  assert.deepEqual(applyNetAmountFromPool(pool, "YES", 200), { yesPool: 4800, noPool: 5000 });
  assertThrowsMessage(
    () => applyNetAmountFromPool({ yesPool: 100, noPool: 100 }, "YES", 100),
    "Insufficient AMM liquidity for sell",
  );
});

test("calculates slippage in bps", () => {
  assert.ok(Math.abs(calcSlippageBps(0.5, 0.55) - 1000) < 1e-10);
  assert.ok(Math.abs(calcSlippageBps(0.5, 0.45) - 1000) < 1e-10);
  assertThrowsMessage(() => calcSlippageBps(0, 0.5), "Invalid quote price");
});

test("calculates shares bought for a valid net amount", () => {
  const pool = { yesPool: 8000, noPool: 8000 };
  const shares = calcSharesForBuyNetAmount(pool, "YES", 250);

  assert.ok(shares > 250);
  assert.ok(Math.abs(shares - 496.173) < 1e-3);
});

test("rejects non-positive net amounts for buy share calculation", () => {
  const pool = { yesPool: 8000, noPool: 8000 };

  assertThrowsMessage(() => calcSharesForBuyNetAmount(pool, "YES", 0), "Net amount must be greater than 0");
  assertThrowsMessage(() => calcSharesForBuyNetAmount(pool, "YES", -1), "Net amount must be greater than 0");
});

test("calculates sell net amount from shares and keeps it below active pool", () => {
  const pool = { yesPool: 8000, noPool: 8000 };
  const soldNet = calcNetAmountForSellShares(pool, "YES", 400);

  assert.ok(soldNet > 0);
  assert.ok(soldNet < pool.yesPool);
  assert.ok(Math.abs(soldNet - 198.745) < 1e-3);
});

test("rejects non-positive shares for sell net amount calculation", () => {
  const pool = { yesPool: 8000, noPool: 8000 };

  assertThrowsMessage(() => calcNetAmountForSellShares(pool, "YES", 0), "Shares must be greater than 0");
  assertThrowsMessage(() => calcNetAmountForSellShares(pool, "NO", -10), "Shares must be greater than 0");
});
