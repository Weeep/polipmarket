import { OrderPosition } from "./Order";

export type PoolState = {
  yesPool: number;
  noPool: number;
};

export function calcFee(amount: number, feeBps: number): number {
  return amount * (feeBps / 10_000);
}

export function calcExecutionPrice(pool: PoolState, position: OrderPosition): number {
  const total = pool.yesPool + pool.noPool;

  if (total <= 0) {
    throw new Error("Invalid AMM liquidity state");
  }

  const yesProbability = pool.yesPool / total;
  return position === "YES" ? yesProbability : 1 - yesProbability;
}

export function applyNetAmountToPool(
  pool: PoolState,
  position: OrderPosition,
  netAmount: number,
): PoolState {
  return {
    yesPool: position === "YES" ? pool.yesPool + netAmount : pool.yesPool,
    noPool: position === "NO" ? pool.noPool + netAmount : pool.noPool,
  };
}

export function calcSlippageBps(beforePrice: number, afterPrice: number): number {
  if (beforePrice <= 0) {
    throw new Error("Invalid quote price");
  }

  return (Math.abs(afterPrice - beforePrice) / beforePrice) * 10_000;
}
