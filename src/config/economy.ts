// === AMM / MARKET ECONOMY CONFIG ===

// Default liquidity per outcome side (play money)
export const DEFAULT_OUTCOME_POOL = 2000;

// Max allowed slippage (basis points)
// 2000 bps = 20%
export const DEFAULT_MAX_SLIPPAGE_BPS = 2000;

// Default AMM fee in basis points
// 100 bps = 1%
export const DEFAULT_AMM_FEE_BPS = 5000;

// === Possible improvement later
// export const ECONOMY = {
//   default: {
//     outcomePool: 2000,
//     maxSlippageBps: 2000,
//   },
//   fast: {
//     outcomePool: 500,
//     maxSlippageBps: 4000,
//   },
// };
