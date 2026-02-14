# SELL rollout: minimal implementation order and edge-case checklist

## 8) Minimal implementation order (start tomorrow)

1. **Data model & migrations**
   - Keep `Position` model migration applied in every environment.
   - Ensure Prisma client is regenerated in CI/CD.

2. **Quote + execution backend**
   - `quoteSell` remains the source of truth for SELL execution price/slippage.
   - `placeOrder` BUY/SELL flow remains transactionally atomic.

3. **Accounting invariants**
   - BUY: lock stake and add shares to `Position`.
   - SELL: remove shares, release matching locked cost, credit proceeds.
   - RESOLVE: settle from remaining `Position` rows only.

4. **UI wiring**
   - Sell buttons submit `POST /api/orders` with `side: "SELL"` and `shares`.
   - Keep market-state-driven visibility (`OPEN` => sell enabled).

5. **Operational checks**
   - Run: `npx prisma generate && npm run build` before merge.
   - Smoke test in staging with one BUY -> partial SELL -> resolve flow.

## 9) Edge-case checklist

- [ ] **Market closed/resolved:** SELL blocked after `bettingCloseAt` / non-OPEN status.
- [ ] **Insufficient shares:** user cannot SELL more than current `Position.shares`.
- [ ] **Insufficient AMM liquidity:** sell path rejects pool underflow.
- [ ] **High slippage:** enforce `maxSlippageBps` guard.
- [ ] **Tiny trade size:** fee cannot reduce net amounts to <= 0.
- [ ] **Double actions/races:** concurrent SELL requests should remain transaction-safe.
- [ ] **Resolve after partial exits:** payout only for remaining shares in `Position`.
- [ ] **Wallet lock mismatch:** resolve clamps release to available locked balance.
- [ ] **UI stale state:** after SELL, refresh user data and remove sold entry from list.
- [ ] **Cancelled records:** cancelled orders never participate in settlement.

## Out of scope for now

- Automated regression test suite for BUY/SELL/RESOLVE paths.
- Advanced tax-lot accounting (FIFO/LIFO) beyond average-cost basis.
- Partial-fill orderbook semantics (current model is AMM market execution).
