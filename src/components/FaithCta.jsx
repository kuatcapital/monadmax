import { levelFor } from '../lib/faith'

// Entry point on the dashboard: shows your current faith level and opens
// the card builder. Without a wallet the level comes from the calculator
// amount, so it's labeled as unverified.
export function FaithCta({ monAmount, verified, maxiCount = null, onOpen }) {
  const level = levelFor(monAmount)

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left relative overflow-hidden rounded-[18px] p-4 mb-3.5 border border-monad-purple/30 bg-[linear-gradient(120deg,rgba(110,84,255,.22),rgba(255,142,228,.12))] hover:border-monad-purple"
    >
      <div className="flex items-center gap-3">
        <div className="text-[34px] leading-none">{level.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[1.5px] text-monad-purple2 font-bold">
            <img src="/monad.svg" alt="" className="w-3.5 h-3.5 rounded-full" />
            {verified ? 'Your faith level' : "What's your faith level?"}
          </div>
          <div className="font-extrabold text-[17px]">{level.name}</div>
          <div className="text-[12px] text-monad-sub truncate">
            {!verified
              ? `With ${Math.round(monAmount).toLocaleString('en-US')} MON · connect your wallet to prove it`
              : level.next
                ? `${Math.ceil(level.toNext).toLocaleString('en-US')} MON to ${level.next.emoji} ${level.next.name}`
                : 'Top level reached 👑'}
          </div>
        </div>
        <span className="shrink-0 bg-monad-purple group-hover:bg-monad-purple2 group-hover:text-black text-white text-xs font-bold rounded-full px-3 py-2">
          I'm a Maxi 💜
        </span>
      </div>
      {maxiCount > 0 && (
        <div className="mt-2.5 pt-2 border-t border-white/[.07] text-[11px] text-monad-sub flex items-center gap-1.5">
          <span>💜</span>
          <span>
            <b className="text-monad-txt">{maxiCount.toLocaleString('en-US')}</b> verified Monad Maxi
            {maxiCount === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </button>
  )
}
