import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CreateEscrowArgs {
  params: types.CreateEscrowParamsFields
}

export interface CreateEscrowAccounts {
  house: PublicKey
  mint: PublicKey
  authority: PublicKey
  escrow: PublicKey
  rewardAddress: PublicKey
  payer: PublicKey
  recentBlockhashes: PublicKey
  systemProgram: PublicKey
  tokenProgram: PublicKey
}

export const layout = borsh.struct([types.CreateEscrowParams.layout("params")])

export function createEscrow(
  args: CreateEscrowArgs,
  accounts: CreateEscrowAccounts
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.house, isSigner: false, isWritable: false },
    { pubkey: accounts.mint, isSigner: false, isWritable: false },
    { pubkey: accounts.authority, isSigner: true, isWritable: true },
    { pubkey: accounts.escrow, isSigner: true, isWritable: true },
    { pubkey: accounts.rewardAddress, isSigner: false, isWritable: false },
    { pubkey: accounts.payer, isSigner: true, isWritable: true },
    { pubkey: accounts.recentBlockhashes, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([253, 215, 165, 116, 36, 108, 68, 80])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      params: types.CreateEscrowParams.toEncodable(args.params),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
