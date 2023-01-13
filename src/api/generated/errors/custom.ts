export type CustomError =
  | InvalidDrainAccount
  | InvalidInitialVrfCounter
  | InvalidVrfAuthority
  | InvalidSwitchboardAccount
  | IncorrectVrfCounter
  | InvalidGameType
  | CurrentRoundStillActive
  | CurrentRoundAlreadyClosed
  | InvalidBet
  | OracleQueueRequiresPermissions
  | OracleQueueMismatch
  | AirdropRequestedTooSoon
  | UserTokenBalanceHealthy
  | MaxBetAmountExceeded
  | InsufficientFunds
  | InsufficientFundsToDrain
  | FlipRequestedTooSoon
  | RewardNotCollected
  | NoRewardToCollect

export class InvalidDrainAccount extends Error {
  static readonly code = 6000
  readonly code = 6000
  readonly name = "InvalidDrainAccount"
  readonly msg = "Only Admin Can Drain Account"

  constructor(readonly logs?: string[]) {
    super("6000: Only Admin Can Drain Account")
  }
}

export class InvalidInitialVrfCounter extends Error {
  static readonly code = 6001
  readonly code = 6001
  readonly name = "InvalidInitialVrfCounter"
  readonly msg = "VRF Account counter should be 0 for a new lottery"

  constructor(readonly logs?: string[]) {
    super("6001: VRF Account counter should be 0 for a new lottery")
  }
}

export class InvalidVrfAuthority extends Error {
  static readonly code = 6002
  readonly code = 6002
  readonly name = "InvalidVrfAuthority"
  readonly msg = "VRF Account authority should be the lottery Pubkey"

  constructor(readonly logs?: string[]) {
    super("6002: VRF Account authority should be the lottery Pubkey")
  }
}

export class InvalidSwitchboardAccount extends Error {
  static readonly code = 6003
  readonly code = 6003
  readonly name = "InvalidSwitchboardAccount"
  readonly msg = "Provided account is not owned by the switchboard program"

  constructor(readonly logs?: string[]) {
    super("6003: Provided account is not owned by the switchboard program")
  }
}

export class IncorrectVrfCounter extends Error {
  static readonly code = 6004
  readonly code = 6004
  readonly name = "IncorrectVrfCounter"
  readonly msg = "VRF counter does not match the expected round id"

  constructor(readonly logs?: string[]) {
    super("6004: VRF counter does not match the expected round id")
  }
}

export class InvalidGameType extends Error {
  static readonly code = 6005
  readonly code = 6005
  readonly name = "InvalidGameType"
  readonly msg = "Failed to match the game type"

  constructor(readonly logs?: string[]) {
    super("6005: Failed to match the game type")
  }
}

export class CurrentRoundStillActive extends Error {
  static readonly code = 6006
  readonly code = 6006
  readonly name = "CurrentRoundStillActive"
  readonly msg = "Current round is still active"

  constructor(readonly logs?: string[]) {
    super("6006: Current round is still active")
  }
}

export class CurrentRoundAlreadyClosed extends Error {
  static readonly code = 6007
  readonly code = 6007
  readonly name = "CurrentRoundAlreadyClosed"
  readonly msg = "Current round has already settled"

  constructor(readonly logs?: string[]) {
    super("6007: Current round has already settled")
  }
}

export class InvalidBet extends Error {
  static readonly code = 6008
  readonly code = 6008
  readonly name = "InvalidBet"
  readonly msg = "Invalid bet"

  constructor(readonly logs?: string[]) {
    super("6008: Invalid bet")
  }
}

export class OracleQueueRequiresPermissions extends Error {
  static readonly code = 6009
  readonly code = 6009
  readonly name = "OracleQueueRequiresPermissions"
  readonly msg =
    "Switchboard queue requires VRF permissions to request randomness"

  constructor(readonly logs?: string[]) {
    super(
      "6009: Switchboard queue requires VRF permissions to request randomness"
    )
  }
}

export class OracleQueueMismatch extends Error {
  static readonly code = 6010
  readonly code = 6010
  readonly name = "OracleQueueMismatch"
  readonly msg = "VRF account belongs to the incorrect oracle queue"

  constructor(readonly logs?: string[]) {
    super("6010: VRF account belongs to the incorrect oracle queue")
  }
}

export class AirdropRequestedTooSoon extends Error {
  static readonly code = 6011
  readonly code = 6011
  readonly name = "AirdropRequestedTooSoon"
  readonly msg = "User requested an airdrop too soon"

  constructor(readonly logs?: string[]) {
    super("6011: User requested an airdrop too soon")
  }
}

export class UserTokenBalanceHealthy extends Error {
  static readonly code = 6012
  readonly code = 6012
  readonly name = "UserTokenBalanceHealthy"
  readonly msg = "User has enough funds and does not require an airdrop"

  constructor(readonly logs?: string[]) {
    super("6012: User has enough funds and does not require an airdrop")
  }
}

export class MaxBetAmountExceeded extends Error {
  static readonly code = 6013
  readonly code = 6013
  readonly name = "MaxBetAmountExceeded"
  readonly msg = "Max bet exceeded"

  constructor(readonly logs?: string[]) {
    super("6013: Max bet exceeded")
  }
}

export class InsufficientFunds extends Error {
  static readonly code = 6014
  readonly code = 6014
  readonly name = "InsufficientFunds"
  readonly msg = "Insufficient funds to request randomness"

  constructor(readonly logs?: string[]) {
    super("6014: Insufficient funds to request randomness")
  }
}

export class InsufficientFundsToDrain extends Error {
  static readonly code = 6015
  readonly code = 6015
  readonly name = "InsufficientFundsToDrain"
  readonly msg = "Insuffcicient funds to drain"

  constructor(readonly logs?: string[]) {
    super("6015: Insuffcicient funds to drain")
  }
}

export class FlipRequestedTooSoon extends Error {
  static readonly code = 6016
  readonly code = 6016
  readonly name = "FlipRequestedTooSoon"
  readonly msg = "User can flip once every 10 seconds"

  constructor(readonly logs?: string[]) {
    super("6016: User can flip once every 10 seconds")
  }
}

export class RewardNotCollected extends Error {
  static readonly code = 6017
  readonly code = 6017
  readonly name = "RewardNotCollected"
  readonly msg = "Reward Not Collected"

  constructor(readonly logs?: string[]) {
    super("6017: Reward Not Collected")
  }
}

export class NoRewardToCollect extends Error {
  static readonly code = 6018
  readonly code = 6018
  readonly name = "NoRewardToCollect"
  readonly msg = "No Reward available to collect"

  constructor(readonly logs?: string[]) {
    super("6018: No Reward available to collect")
  }
}

export function fromCode(code: number, logs?: string[]): CustomError | null {
  switch (code) {
    case 6000:
      return new InvalidDrainAccount(logs)
    case 6001:
      return new InvalidInitialVrfCounter(logs)
    case 6002:
      return new InvalidVrfAuthority(logs)
    case 6003:
      return new InvalidSwitchboardAccount(logs)
    case 6004:
      return new IncorrectVrfCounter(logs)
    case 6005:
      return new InvalidGameType(logs)
    case 6006:
      return new CurrentRoundStillActive(logs)
    case 6007:
      return new CurrentRoundAlreadyClosed(logs)
    case 6008:
      return new InvalidBet(logs)
    case 6009:
      return new OracleQueueRequiresPermissions(logs)
    case 6010:
      return new OracleQueueMismatch(logs)
    case 6011:
      return new AirdropRequestedTooSoon(logs)
    case 6012:
      return new UserTokenBalanceHealthy(logs)
    case 6013:
      return new MaxBetAmountExceeded(logs)
    case 6014:
      return new InsufficientFunds(logs)
    case 6015:
      return new InsufficientFundsToDrain(logs)
    case 6016:
      return new FlipRequestedTooSoon(logs)
    case 6017:
      return new RewardNotCollected(logs)
    case 6018:
      return new NoRewardToCollect(logs)
  }

  return null
}
