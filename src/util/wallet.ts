import { AnchorProvider, Program } from '@project-serum/anchor';
import { Keypair } from '@solana/web3.js';
import { AnchorWallet } from '@switchboard-xyz/solana.js';

export function programWallet(program: Program): Keypair {
  return ((program.provider as AnchorProvider).wallet as AnchorWallet).payer;
}
