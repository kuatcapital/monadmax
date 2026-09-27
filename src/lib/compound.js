// src/lib/compound.js
//
// When is compounding worth it? Unclaimed rewards earn nothing, and every
// compound costs a fixed network fee. Balancing the two:
//
//   lost yield per year  ≈ r² · S · T / 2      (rewards idle on average T/2)
//   fees per year        ≈ F / T
//   minimum at T* = √(2F / (r² S))  ⇒  rewards at that point  R* = √(2 F S)
//
// So: compound once unclaimed rewards reach √(2 × fee × stake).
// S = active stake (MON), r = APR (fraction), F = compound fee (MON).

export function compoundPlan({ stake, aprPct, rewards, fee }) {
  if (!(stake > 0) || !(aprPct > 0) || !(fee > 0)) return null
  const r = aprPct / 100
  const perDay = (stake * r) / 365
  const threshold = Math.sqrt(2 * fee * stake)
  const intervalDays = threshold / perDay
  return {
    threshold,
    perDay,
    progress: Math.min(1, rewards / threshold),
    ready: rewards >= threshold,
    daysLeft: Math.max(0, (threshold - rewards) / perDay),
    intervalDays,
    // Optimum more than a year away → at this size compounding never pays
    notWorthIt: intervalDays > 365,
    // Claim: how much of the rewards the fee would eat
    claimFeePct: (fee / Math.max(rewards, 1e-18)) * 100,
  }
}
