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

function getPositionPools(pool: PoolState, position: OrderPosition): {
  activePool: number;
  oppositePool: number;
} {
  return position === "YES"
    ? { activePool: pool.yesPool, oppositePool: pool.noPool }
    : { activePool: pool.noPool, oppositePool: pool.yesPool };
}

export function calcSharesForBuyNetAmount(
  pool: PoolState,
  position: OrderPosition,
  netAmount: number,
): number {
  if (netAmount <= 0) {
    throw new Error("Net amount must be greater than 0");
  }

  const { activePool, oppositePool } = getPositionPools(pool, position);

  return (
    netAmount +
    oppositePool * Math.log((activePool + netAmount) / activePool)
  );
}

function calcSharesForPoolDecrease(
  activePool: number,
  oppositePool: number,
  poolDecrease: number,
): number {
  if (poolDecrease <= 0 || poolDecrease >= activePool) {
    throw new Error("Invalid pool decrease amount");
  }

  return (
    poolDecrease +
    oppositePool * Math.log(activePool / (activePool - poolDecrease))
  );
}

export function calcNetAmountForSellShares(
  pool: PoolState,
  position: OrderPosition,
  shares: number,
): number {
  if (shares <= 0) {
    throw new Error("Shares must be greater than 0");
  }

  const { activePool, oppositePool } = getPositionPools(pool, position);

  let low = 0;
  let high = activePool - Number.EPSILON;

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const midShares = calcSharesForPoolDecrease(activePool, oppositePool, mid);

    if (midShares > shares) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const poolDecrease = low;
  return poolDecrease;
}
