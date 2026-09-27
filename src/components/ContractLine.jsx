import { STAKING_ADDRESS } from '../lib/stakingAbi'

// Tells the user exactly what their wallet is about to show, so they can
// match it: the Monad staking precompile, one specific function, and no
// token approvals. If a wallet prompt ever shows anything else — reject it.
export function ContractLine({ fn }) {
  return (
    <p className="text-[10px] text-monad-sub/70 mt-2 leading-snug">
      🔒 Your wallet will show a call to the <b className="text-monad-sub">Monad staking contract</b>{' '}
      <code className="text-monad-sub">
        {STAKING_ADDRESS.slice(0, 6)}…{STAKING_ADDRESS.slice(-4)}
      </code>{' '}
      (<code className="text-monad-sub">{fn}</code>), network <b className="text-monad-sub">Monad</b>. No token approvals, no
      other contracts. Some wallets label this address "BSC: Validator Set" — it's the same address on another chain;
      what matters is that the network says Monad. If you see anything else, reject it.
    </p>
  )
}
