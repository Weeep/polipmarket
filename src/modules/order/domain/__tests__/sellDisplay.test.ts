import test from "node:test";
import assert from "node:assert/strict";
import {
  getSellDisplayMetricsFromBet,
  getSellDisplayMetricsFromQuote,
} from "../../../../components/sellDisplay";

test("closed sold bet metrics match the previously shown sell popup quote", () => {
  const popup = getSellDisplayMetricsFromQuote({
    shares: 195.63,
    executionPrice: 0.5061,
    grossAmount: 99,
    fee: 0.99,
    netAmount: 98.01,
  });

  const closed = getSellDisplayMetricsFromBet({
    shares: 195.63,
    soldPrice: 0.5061,
    soldShares: 195.63,
    soldGrossAmount: 99,
    soldFee: 0.99,
    soldNetAmount: 98.01,
    amount: 100,
  });

  assert.equal(closed.executionPrice.toFixed(4), popup.executionPrice.toFixed(4));
  assert.equal(closed.grossAmount.toFixed(2), popup.grossAmount.toFixed(2));
  assert.equal(closed.fee.toFixed(2), popup.fee.toFixed(2));
  assert.equal(closed.netAmount.toFixed(2), popup.netAmount.toFixed(2));
  assert.equal(closed.shares.toFixed(2), popup.shares.toFixed(2));
});
