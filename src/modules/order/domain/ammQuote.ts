import { OrderPosition } from "./Order";

export type PoolState = {
  yesPool: number;
  noPool: number;
};

const EPSILON = 1e-9;
const MAX_BINARY_STEPS = 80;

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

function getSidePools(pool: PoolState, position: OrderPosition) {
  if (position === "YES") {
    return { sidePool: pool.yesPool, otherPool: pool.noPool };
  }

  return { sidePool: pool.noPool, otherPool: pool.yesPool };
}

export function calcSharesFromNetAmount(
  pool: PoolState,
  position: OrderPosition,
  netAmount: number,
): number {
  if (netAmount <= 0) {
    throw new Error("netAmount must be greater than 0");
  }

  const { sidePool, otherPool } = getSidePools(pool, position);

  if (sidePool <= 0 || otherPool <= 0) {
    throw new Error("Invalid AMM liquidity state");
  }

  return netAmount + otherPool * Math.log((sidePool + netAmount) / sidePool);
}

function calcSharesFromSellNetAmount(
  pool: PoolState,
  position: OrderPosition,
  netAmount: number,
): number {
  const { sidePool, otherPool } = getSidePools(pool, position);

  if (netAmount <= 0 || netAmount >= sidePool) {
    throw new Error("Invalid sell amount for AMM state");
  }

  return netAmount + otherPool * Math.log(sidePool / (sidePool - netAmount));
}

export function calcSellNetAmountFromShares(
  pool: PoolState,
  position: OrderPosition,
  shares: number,
): number {
  if (shares <= 0) {
    throw new Error("shares must be greater than 0");
  }

  const { sidePool } = getSidePools(pool, position);

  if (sidePool <= 0) {
    throw new Error("Invalid AMM liquidity state");
  }

  let lo = 0;
  let hi = sidePool - EPSILON;

  for (let i = 0; i < MAX_BINARY_STEPS; i += 1) {
    const mid = (lo + hi) / 2;
    const estimatedShares = calcSharesFromSellNetAmount(pool, position, mid);

    if (estimatedShares > shares) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return lo;
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

export function applyNetAmountFromPool(
  pool: PoolState,
  position: OrderPosition,
  netAmount: number,
): PoolState {
  const nextPool = {
    yesPool: position === "YES" ? pool.yesPool - netAmount : pool.yesPool,
    noPool: position === "NO" ? pool.noPool - netAmount : pool.noPool,
  };

  if (nextPool.yesPool <= 0 || nextPool.noPool <= 0) {
    throw new Error("Insufficient AMM liquidity for sell");
  }

  return nextPool;
}

export function calcSlippageBps(beforePrice: number, afterPrice: number): number {
  if (beforePrice <= 0) {
    throw new Error("Invalid quote price");
  }

  return (Math.abs(afterPrice - beforePrice) / beforePrice) * 10_000;
}
