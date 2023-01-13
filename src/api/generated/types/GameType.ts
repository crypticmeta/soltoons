import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface NoneJSON {
  kind: "None"
}

export class None {
  static readonly discriminator = 0
  static readonly kind = "None"
  readonly discriminator = 0
  readonly kind = "None"

  toJSON(): NoneJSON {
    return {
      kind: "None",
    }
  }

  toEncodable() {
    return {
      None: {},
    }
  }
}

export interface ClawJSON {
  kind: "Claw"
}

export class Claw {
  static readonly discriminator = 1
  static readonly kind = "Claw"
  readonly discriminator = 1
  readonly kind = "Claw"

  toJSON(): ClawJSON {
    return {
      kind: "Claw",
    }
  }

  toEncodable() {
    return {
      Claw: {},
    }
  }
}

export interface CoinFlipJSON {
  kind: "CoinFlip"
}

export class CoinFlip {
  static readonly discriminator = 2
  static readonly kind = "CoinFlip"
  readonly discriminator = 2
  readonly kind = "CoinFlip"

  toJSON(): CoinFlipJSON {
    return {
      kind: "CoinFlip",
    }
  }

  toEncodable() {
    return {
      CoinFlip: {},
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.GameTypeKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object")
  }

  if ("None" in obj) {
    return new None()
  }
  if ("Claw" in obj) {
    return new Claw()
  }
  if ("CoinFlip" in obj) {
    return new CoinFlip()
  }

  throw new Error("Invalid enum object")
}

export function fromJSON(obj: types.GameTypeJSON): types.GameTypeKind {
  switch (obj.kind) {
    case "None": {
      return new None()
    }
    case "Claw": {
      return new Claw()
    }
    case "CoinFlip": {
      return new CoinFlip()
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct([], "None"),
    borsh.struct([], "Claw"),
    borsh.struct([], "CoinFlip"),
  ])
  if (property !== undefined) {
    return ret.replicate(property)
  }
  return ret
}
