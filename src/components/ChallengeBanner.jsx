import { useState, useEffect } from 'react'
import { levelFor, DEADLINES, LEVELS } from '../lib/faith'
import { getNativeBalance } from '../lib/alchemy'
import { shortAddr } from '../lib/format'

// Shown when someone opens a challenge link (?c=…&by=…&lvl=…[&from=0x…]).
// If the sender opted in with their address, the level is re-checked
// on-chain; otherwise the level in the link is shown as unverified.
export function ChallengeBanner({ challenge, onAccept, onDismiss }) {
  const [challengerMon, setChallengerMon] = useState(null)

  useEffect(() => {
    if (!challenge.from) return
    let cancelled = false
    Promise.all([
      getNativeBalance(challenge.from),
      import('../lib/staking').then((m) => m.getStaking(challenge.from)).catch(() => null),
    ])
      .then(([native, staking]) => {
        const t = staking?.totals
        const staked = t ? t.active + t.pending + t.rewards : 0
        if (!cancelled) setChallengerMon(native + staked)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [challenge.from])

  const verifiedLevel = challengerMon != null ? levelFor(challengerMon) : null
  const claimedLevel = challenge.levelIndex != null ? LEVELS[challenge.levelIndex] : null
  const level = challenge.from ? verifiedLevel : claimedLevel

  return (
    <div className="relative rounded-[18px] p-4 mb-3.5 border border-monad-berry/60 bg-[linear-gradient(120deg,rgba(255,142,228,.18),rgba(110,84,255,.14))] animate-fade">
      <button onClick={onDismiss} className="absolute top-2.5 right-3 text-monad-sub hover:text-white" aria-label="Dismiss">
        ✕
      </button>
      <div className="text-[10px] uppercase tracking-[1.5px] text-[#ff8dc0] font-bold">⚔️ You've been challenged</div>
      <div className="mt-1.5 text-[14px] leading-snug pr-4">
        <b>{challenge.from ? shortAddr(challenge.from) : 'A Monad Maxi'}</b>
        {level && (
          <>
            {' '}
            · {level.emoji} <b>{level.name}</b>
            {challenge.from ? (
              <span className="text-monad-green text-[11px] font-bold"> ✓ verified</span>
            ) : (
              <span className="text-monad-sub text-[11px]"> (not verified)</span>
            )}
          </>
        )}{' '}
        believes MON hits <b className="text-monad-green">${challenge.target}</b> by {DEADLINES[challenge.deadlineIndex]}.
      </div>
      <div className="text-[12px] text-monad-sub mt-1">Do you believe harder? Show your faith level.</div>
      <button
        onClick={onAccept}
        className="mt-3 w-full py-2.5 rounded-xl bg-monad-berry hover:brightness-105 text-monad-navy font-bold text-sm"
      >
        Accept the challenge
      </button>
    </div>
  )
}
