export type BuyLot = {
  buyOrderId: string;
  createdAt: Date;
  boughtShares: number;
};

export type SellLot = {
  createdAt: Date;
  shares: number;
  grossAmount: number;
  fee: number;
  netAmount: number;
};

export type BuyLotView = {
  buyOrderId: string;
  openShares: number;
  status: "OPEN" | "FILLED";
  soldShares?: number;
  soldGrossAmount?: number;
  soldFee?: number;
  soldNetAmount?: number;
  soldPrice?: number;
};

const EPSILON = 1e-9;

export function allocateSellLotsToBuys(input: {
  buys: BuyLot[];
  sells: SellLot[];
  remainingShares: number;
}): Map<string, BuyLotView> {
  const buysDesc = [...input.buys].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const state = new Map<
    string,
    {
      buyOrderId: string;
      openShares: number;
      soldShares: number;
      soldGrossAmount: number;
      soldFee: number;
      soldNetAmount: number;
    }
  >();

  for (const buy of buysDesc) {
    state.set(buy.buyOrderId, {
      buyOrderId: buy.buyOrderId,
      openShares: buy.boughtShares,
      soldShares: 0,
      soldGrossAmount: 0,
      soldFee: 0,
      soldNetAmount: 0,
    });
  }

  const sellLotsDesc = [...input.sells]
    .filter((sell) => sell.shares > EPSILON)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((sell) => ({ ...sell, remainingShares: sell.shares }));

  for (const lot of sellLotsDesc) {
    for (const buy of buysDesc) {
      const current = state.get(buy.buyOrderId);
      if (buy.createdAt > lot.createdAt || !current || current.openShares <= EPSILON || lot.remainingShares <= EPSILON) {
        continue;
      }

      const takenShares = Math.min(current.openShares, lot.remainingShares);
      const ratio = takenShares / lot.shares;

      current.openShares -= takenShares;
      current.soldShares += takenShares;
      current.soldGrossAmount += lot.grossAmount * ratio;
      current.soldFee += lot.fee * ratio;
      current.soldNetAmount += lot.netAmount * ratio;

      lot.remainingShares -= takenShares;

      if (lot.remainingShares <= EPSILON) {
        break;
      }
    }
  }

  const result = new Map<string, BuyLotView>();
  let calculatedOpenShares = 0;
  for (const buy of buysDesc) {
    const current = state.get(buy.buyOrderId)!;
    calculatedOpenShares += current.openShares;

    const isFilled = current.openShares <= EPSILON;
    const soldPrice =
      current.soldShares > EPSILON
        ? current.soldGrossAmount / current.soldShares
        : undefined;

    result.set(buy.buyOrderId, {
      buyOrderId: buy.buyOrderId,
      openShares: isFilled ? buy.boughtShares : current.openShares,
      status: isFilled ? "FILLED" : "OPEN",
      soldShares: current.soldShares > EPSILON ? current.soldShares : undefined,
      soldGrossAmount:
        current.soldShares > EPSILON ? current.soldGrossAmount : undefined,
      soldFee: current.soldShares > EPSILON ? current.soldFee : undefined,
      soldNetAmount:
        current.soldShares > EPSILON ? current.soldNetAmount : undefined,
      soldPrice,
    });
  }

  // fallback to position-based remaining shares when sell history is incomplete
  if (Math.abs(calculatedOpenShares - input.remainingShares) > 1e-4) {
    const buysAsc = [...input.buys].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    let remainingShares = input.remainingShares;
    for (const buy of buysAsc) {
      const openShares = Math.min(Math.max(remainingShares, 0), buy.boughtShares);
      remainingShares = Math.max(0, remainingShares - openShares);
      const view = result.get(buy.buyOrderId);
      if (!view) continue;
      view.status = openShares > EPSILON ? "OPEN" : "FILLED";
      view.openShares = openShares > EPSILON ? openShares : buy.boughtShares;
    }
  }

  return result;
}
