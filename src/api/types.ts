import * as anchor from "@project-serum/anchor";
// import { SwitchboardVrfFlip } from "../target/types/switchboard_vrf_flip";
// export * from "../target/types/switchboard_vrf_flip";

export type FlipProgram = anchor.Program;
// | anchor.Program<SwitchboardVrfFlip>;

/**
 * An enum representing all known permission types for Switchboard.
 */
export enum GameTypeEnum {
  NONE = "none",
  COIN_FLIP = "coinFlip",
  CLAW = "claw"
}
export enum GameTypeValue {
  NONE = 0,
  CLAW = 1,
  COIN_FLIP = 2,
}

export const convertGameType = (gameType: any): GameTypeEnum => {
  if ("kind" in gameType) {
    switch (gameType.kind) {
      case "None":
        return GameTypeEnum.NONE;
      case "CoinFlip":
        return GameTypeEnum.COIN_FLIP;
      case "Claw":
        return GameTypeEnum.CLAW;
    }
  }
  if ("none" in gameType) {
    return GameTypeEnum.NONE;
  }
  if ("coinFlip" in gameType) {
    return GameTypeEnum.COIN_FLIP;
  }
  if ("claw" in gameType) {
    return GameTypeEnum.CLAW;
  }

  throw new Error(`Failed to match game type enum`);
};
