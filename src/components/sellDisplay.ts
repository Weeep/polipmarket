export type SellDisplayMetrics = {
  shares: number;
  executionPrice: number;
  grossAmount: number;
  fee: number;
  netAmount: number;
};

export function getSellDisplayMetricsFromQuote(input: SellDisplayMetrics): SellDisplayMetrics {
  return {
    shares: input.shares,
    executionPrice: input.executionPrice,
    grossAmount: input.grossAmount,
    fee: input.fee,
    netAmount: input.netAmount,
  };
}

export function getSellDisplayMetricsFromBet(input: {
  shares: number;
  soldPrice?: number;
  soldShares?: number;
  soldGrossAmount?: number;
  soldFee?: number;
  soldNetAmount?: number;
  soldAmount?: number;
  amount: number;
}) {
  const executionPrice = input.soldPrice ?? 0;
  const grossAmount = input.soldGrossAmount ?? input.soldAmount ?? input.amount;
  const fee = input.soldFee ?? 0;
  const netAmount = input.soldNetAmount ?? input.soldAmount ?? input.amount;
  const shares = input.soldShares ?? (executionPrice > 0 ? grossAmount / executionPrice : input.shares);

  return {
    shares,
    executionPrice,
    grossAmount,
    fee,
    netAmount,
  };
}
