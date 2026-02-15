import { describe, expect, it } from "vitest";
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
} from "@/modules/order/domain/ammQuote";

describe("ammQuote domain calculations", () => {
  describe("fee helpers", () => {
    it("calculates fee from amount and bps", () => {
      expect(calcFee(1000, 250)).toBe(25);
    });

    it("accepts valid fee bps values", () => {
      expect(() => validateFeeBps(0)).not.toThrow();
      expect(() => validateFeeBps(500)).not.toThrow();
      expect(() => validateFeeBps(9999)).not.toThrow();
    });

    it("rejects invalid fee bps values", () => {
      expect(() => validateFeeBps(-1)).toThrow("Invalid AMM fee configuration");
      expect(() => validateFeeBps(10_000)).toThrow("Invalid AMM fee configuration");
      expect(() => validateFeeBps(Number.NaN)).toThrow("Invalid AMM fee configuration");
      expect(() => validateFeeBps(Number.POSITIVE_INFINITY)).toThrow(
        "Invalid AMM fee configuration",
      );
    });

    it("converts net amount to gross amount", () => {
      expect(calcGrossFromNetAfterFee(975, 250)).toBeCloseTo(1000, 10);
    });
  });

  describe("price and pool movement", () => {
    const pool = { yesPool: 5000, noPool: 5000 };

    it("returns expected execution price for YES and NO", () => {
      expect(calcExecutionPrice(pool, "YES")).toBeCloseTo(0.5, 10);
      expect(calcExecutionPrice(pool, "NO")).toBeCloseTo(0.5, 10);

      const asymmetricPool = { yesPool: 7000, noPool: 3000 };
      expect(calcExecutionPrice(asymmetricPool, "YES")).toBeCloseTo(0.7, 10);
      expect(calcExecutionPrice(asymmetricPool, "NO")).toBeCloseTo(0.3, 10);
    });

    it("rejects invalid execution price pool", () => {
      expect(() => calcExecutionPrice({ yesPool: 0, noPool: 0 }, "YES")).toThrow(
        "Invalid AMM liquidity state",
      );
    });

    it("adds net amount only to the selected side", () => {
      expect(applyNetAmountToPool(pool, "YES", 200)).toEqual({ yesPool: 5200, noPool: 5000 });
      expect(applyNetAmountToPool(pool, "NO", 200)).toEqual({ yesPool: 5000, noPool: 5200 });
    });

    it("removes net amount from selected side and blocks full depletion", () => {
      expect(applyNetAmountFromPool(pool, "YES", 200)).toEqual({ yesPool: 4800, noPool: 5000 });
      expect(() => applyNetAmountFromPool({ yesPool: 100, noPool: 100 }, "YES", 100)).toThrow(
        "Insufficient AMM liquidity for sell",
      );
    });

    it("calculates slippage in bps", () => {
      expect(calcSlippageBps(0.5, 0.55)).toBeCloseTo(1000, 10);
      expect(calcSlippageBps(0.5, 0.45)).toBeCloseTo(1000, 10);
      expect(() => calcSlippageBps(0, 0.5)).toThrow("Invalid quote price");
    });
  });

  describe("share/net conversions", () => {
    const pool = { yesPool: 8000, noPool: 8000 };

    it("calculates shares bought for a valid net amount", () => {
      const shares = calcSharesForBuyNetAmount(pool, "YES", 250);
      expect(shares).toBeGreaterThan(250);
      expect(shares).toBeCloseTo(496.173, 3);
    });

    it("rejects non-positive net amounts for buy share calculation", () => {
      expect(() => calcSharesForBuyNetAmount(pool, "YES", 0)).toThrow(
        "Net amount must be greater than 0",
      );
      expect(() => calcSharesForBuyNetAmount(pool, "YES", -1)).toThrow(
        "Net amount must be greater than 0",
      );
    });

    it("calculates sell net amount from shares and keeps it below active pool", () => {
      const soldNet = calcNetAmountForSellShares(pool, "YES", 400);
      expect(soldNet).toBeGreaterThan(0);
      expect(soldNet).toBeLessThan(pool.yesPool);
      expect(soldNet).toBeCloseTo(198.745, 3);
    });

    it("rejects non-positive shares for sell net amount calculation", () => {
      expect(() => calcNetAmountForSellShares(pool, "YES", 0)).toThrow(
        "Shares must be greater than 0",
      );
      expect(() => calcNetAmountForSellShares(pool, "NO", -10)).toThrow(
        "Shares must be greater than 0",
      );
    });
  });
});
