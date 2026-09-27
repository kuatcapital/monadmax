// src/lib/stakingAbi.js
//
// Monad staking precompile: address + ABI. Shared by the browser code
// (reads + wallet transactions) and the server (validator list).
// Docs: https://docs.monad.xyz/reference/staking/api

import { parseAbi } from 'viem'

export const STAKING_ADDRESS = '0x0000000000000000000000000000000000001000'
export const ACC_DENOMINATOR = 10n ** 36n // reward accumulator precision
export const MAX_WITHDRAW_IDS = 256 // withdrawId is a uint8

export const stakingAbi = parseAbi([
  // reads
  'function getEpoch() returns (uint64 epoch, bool inEpochDelayPeriod)',
  'function getDelegations(address delegator, uint64 startValId) returns (bool isDone, uint64 nextValId, uint64[] valIds)',
  'function getDelegator(uint64 validatorId, address delegator) returns (uint256 stake, uint256 accRewardPerToken, uint256 unclaimedRewards, uint256 deltaStake, uint256 nextDeltaStake, uint64 deltaEpoch, uint64 nextDeltaEpoch)',
  'function getValidator(uint64 validatorId) returns (address authAddress, uint64 flags, uint256 stake, uint256 accRewardPerToken, uint256 commission, uint256 unclaimedRewards, uint256 consensusStake, uint256 consensusCommission, uint256 snapshotStake, uint256 snapshotCommission, bytes secpPubkey, bytes blsPubkey)',
  'function getWithdrawalRequest(uint64 validatorId, address delegator, uint8 withdrawId) returns (uint256 withdrawalAmount, uint256 accRewardPerToken, uint64 withdrawEpoch)',
  'function getExecutionValidatorSet(uint32 startIndex) returns (bool isDone, uint32 nextIndex, uint64[] valIds)',
  // writes (delegator actions)
  'function delegate(uint64 validatorId) payable returns (bool success)',
  'function undelegate(uint64 validatorId, uint256 amount, uint8 withdrawId) returns (bool success)',
  'function withdraw(uint64 validatorId, uint8 withdrawId) returns (bool success)',
  'function compound(uint64 validatorId) returns (bool success)',
  'function claimRewards(uint64 validatorId) returns (bool success)',
])

// Official validator registry: one JSON per validator, named by SECP key
export const REGISTRY_URL = 'https://raw.githubusercontent.com/monad-developers/validator-info/main/mainnet'
