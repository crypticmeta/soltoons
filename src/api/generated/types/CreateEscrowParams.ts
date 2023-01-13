import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface CreateEscrowParamsFields {}

export interface CreateEscrowParamsJSON {}

export class CreateEscrowParams {
  constructor(fields: CreateEscrowParamsFields) {}

  static layout(property?: string) {
    return borsh.struct([], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new CreateEscrowParams({})
  }

  static toEncodable(fields: CreateEscrowParamsFields) {
    return {}
  }

  toJSON(): CreateEscrowParamsJSON {
    return {}
  }

  static fromJSON(obj: CreateEscrowParamsJSON): CreateEscrowParams {
    return new CreateEscrowParams({})
  }

  toEncodable() {
    return CreateEscrowParams.toEncodable(this)
  }
}
