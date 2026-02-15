import test from "node:test";
import assert from "node:assert/strict";
import { allocateSellLotsToBuys, BuyLot, SellLot } from "../../../event/application/sellAllocation";

function countStatuses(result: Map<string, { status: "OPEN" | "FILLED" }>) {
  let open = 0;
  let filled = 0;
  for (const value of result.values()) {
    if (value.status === "OPEN") open += 1;
    if (value.status === "FILLED") filled += 1;
  }
  return { open, filled };
}

test("buy/sell sequence keeps active and closed row counts stable and per-row sell metrics aligned", () => {
  const t0 = Date.now();
  const buys: BuyLot[] = [
    { buyOrderId: "b1", createdAt: new Date(t0 + 1), boughtShares: 195.63 },
    { buyOrderId: "b2", createdAt: new Date(t0 + 20), boughtShares: 390.12 },
    { buyOrderId: "b3", createdAt: new Date(t0 + 30), boughtShares: 210.55 },
    { buyOrderId: "b4", createdAt: new Date(t0 + 40), boughtShares: 215.1 },
    { buyOrderId: "b5", createdAt: new Date(t0 + 50), boughtShares: 220.2 },
  ];

  const sells: SellLot[] = [
    { createdAt: new Date(t0 + 10), shares: 195.63, grossAmount: 99, fee: 0.99, netAmount: 98.01 },
    { createdAt: new Date(t0 + 60), shares: 220.2, grossAmount: 111.2, fee: 1.11, netAmount: 110.09 },
    { createdAt: new Date(t0 + 70), shares: 215.1, grossAmount: 108.4, fee: 1.08, netAmount: 107.32 },
    { createdAt: new Date(t0 + 80), shares: 210.55, grossAmount: 106.7, fee: 1.07, netAmount: 105.63 },
    { createdAt: new Date(t0 + 90), shares: 390.12, grossAmount: 197.6, fee: 1.98, netAmount: 195.62 },
  ];

  const step1 = allocateSellLotsToBuys({ buys: buys.slice(0, 1), sells: [], remainingShares: buys[0].boughtShares });
  assert.deepEqual(countStatuses(step1), { open: 1, filled: 0 });

  const step3 = allocateSellLotsToBuys({ buys: buys.slice(0, 1), sells: sells.slice(0, 1), remainingShares: 0 });
  assert.deepEqual(countStatuses(step3), { open: 0, filled: 1 });
  const b1 = step3.get("b1");
  assert.ok(b1);
  assert.equal(b1.soldPrice?.toFixed(4), (99 / 195.63).toFixed(4));
  assert.equal(b1.soldGrossAmount?.toFixed(2), "99.00");
  assert.equal(b1.soldFee?.toFixed(2), "0.99");
  assert.equal(b1.soldNetAmount?.toFixed(2), "98.01");

  const step4 = allocateSellLotsToBuys({ buys: buys.slice(0, 2), sells: sells.slice(0, 1), remainingShares: buys[1].boughtShares });
  assert.deepEqual(countStatuses(step4), { open: 1, filled: 1 });

  const step5 = allocateSellLotsToBuys({ buys: buys.slice(0, 3), sells: sells.slice(0, 1), remainingShares: buys[1].boughtShares + buys[2].boughtShares });
  assert.deepEqual(countStatuses(step5), { open: 2, filled: 1 });

  const step6 = allocateSellLotsToBuys({ buys: buys.slice(0, 4), sells: sells.slice(0, 1), remainingShares: buys[1].boughtShares + buys[2].boughtShares + buys[3].boughtShares });
  assert.deepEqual(countStatuses(step6), { open: 3, filled: 1 });

  const step7 = allocateSellLotsToBuys({ buys, sells: sells.slice(0, 1), remainingShares: buys[1].boughtShares + buys[2].boughtShares + buys[3].boughtShares + buys[4].boughtShares });
  assert.deepEqual(countStatuses(step7), { open: 4, filled: 1 });

  const step8 = allocateSellLotsToBuys({ buys, sells: sells.slice(0, 2), remainingShares: buys[1].boughtShares + buys[2].boughtShares + buys[3].boughtShares });
  assert.deepEqual(countStatuses(step8), { open: 3, filled: 2 });
  assert.equal(step8.get("b5")?.soldNetAmount?.toFixed(2), "110.09");

  const step9 = allocateSellLotsToBuys({ buys, sells: sells.slice(0, 3), remainingShares: buys[1].boughtShares + buys[2].boughtShares });
  assert.deepEqual(countStatuses(step9), { open: 2, filled: 3 });
  assert.equal(step9.get("b4")?.soldNetAmount?.toFixed(2), "107.32");

  const step10 = allocateSellLotsToBuys({ buys, sells: sells.slice(0, 4), remainingShares: buys[1].boughtShares });
  assert.deepEqual(countStatuses(step10), { open: 1, filled: 4 });
  assert.equal(step10.get("b3")?.soldNetAmount?.toFixed(2), "105.63");

  const step11 = allocateSellLotsToBuys({ buys, sells, remainingShares: 0 });
  assert.deepEqual(countStatuses(step11), { open: 0, filled: 5 });
  assert.equal(step11.get("b2")?.soldNetAmount?.toFixed(2), "195.62");
});
