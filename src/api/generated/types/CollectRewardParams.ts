import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface CollectRewardParamsFields {}

export interface CollectRewardParamsJSON {}

export class CollectRewardParams {
  constructor(fields: CollectRewardParamsFields) {}

  static layout(property?: string) {
    return borsh.struct([], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new CollectRewardParams({})
  }

  static toEncodable(fields: CollectRewardParamsFields) {
    return {}
  }

  toJSON(): CollectRewardParamsJSON {
    return {}
  }

  static fromJSON(obj: CollectRewardParamsJSON): CollectRewardParams {
    return new CollectRewardParams({})
  }

  toEncodable() {
    return CollectRewardParams.toEncodable(this)
  }
}
