import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token-v2';
import { PublicKey, Signer, Transaction, TransactionInstruction } from '@solana/web3.js';
import { sleep } from '@switchboard-xyz/common';
import { QueueAccount, SwitchboardProgram } from '@switchboard-xyz/solana.js';
import { HouseState, HouseStateJSON } from './generated/accounts';
import { FlipProgram } from './types';
import { programWallet } from '../util/wallet';

import { Buffer } from 'buffer';

export class HouseAccountDoesNotExist extends Error {
  readonly name = 'HouseAccountDoesNotExist';
  readonly msg = 'Failed to fetch the HouseState account.';

  constructor() {
    super("HouseAccountDoesNotExist: Failed to fetch the HouseState account.");
  }
}

export interface HouseJSON extends HouseStateJSON {
  publicKey: string;
}

export class House {
  program: FlipProgram;
  publicKey: PublicKey;
  state: HouseState;

  constructor(program: FlipProgram, publicKey: PublicKey, state: HouseState) {
    this.program = program;
    this.publicKey = publicKey;
    this.state = state;
  }

  static fromSeeds(program: FlipProgram, TOKENMINT:PublicKey): [PublicKey, number] {
    return anchor.utils.publicKey.findProgramAddressSync(
      [Buffer.from("HOUSESTATESEED"), TOKENMINT.toBytes()],
      program.programId
    );
  }

  async reload(): Promise<void> {
    const newState = await HouseState.fetch(
      this.program.provider.connection,
      this.publicKey
    );
    if (newState === null) {
      throw new Error(`Failed to fetch the new House account state`);
    }
    this.state = newState;
  }

  toJSON(): HouseJSON {
    return {
      publicKey: this.publicKey.toString(),
      ...this.state.toJSON(),
    };
  }

  getQueueAccount(switchboardProgram: SwitchboardProgram): QueueAccount {
    const queueAccount = new QueueAccount(
      switchboardProgram,
      this.state.switchboardQueue,
    );
    return queueAccount;
  }

  static async create(
    program: FlipProgram,
    switchboardQueue: QueueAccount,
    TOKENMINT: PublicKey,
    mintKeypair = anchor.web3.Keypair.generate(),
  ): Promise<House> {
    const req = await House.createReq(program, switchboardQueue, mintKeypair, TOKENMINT);

    const signature = await program.provider.sendAndConfirm!(
      new Transaction().add(...req.ixns),
      req.signers
    ).catch(err=>console.error(err, 'err creating house'));

    let retryCount = 5;
    while (retryCount) {
      const houseState = await HouseState.fetch(
        program.provider.connection,
        req.account
      );
      if (houseState !== null) {
        return new House(program, req.account, houseState);
      }
      await sleep(1000);
      --retryCount;
    }

    throw new Error(`Failed to create new HouseAccount`);
  }

  static async createReq(
    program: FlipProgram,
    switchboardQueue: QueueAccount,
    mintKeypair = anchor.web3.Keypair.generate(),
    TOKENMINT:PublicKey
  ): Promise<{
    ixns: TransactionInstruction[];
    signers: Signer[];
    account: PublicKey;
  }> {
    const payer = switchboardQueue.program.walletPubkey;
    const [houseKey, houseBump] = House.fromSeeds(program, TOKENMINT);

    const tokenVault = await spl.getAssociatedTokenAddress(
      TOKENMINT,
      houseKey,
      true
    );

    const txnIxns: TransactionInstruction[] = [
      await program.methods
        .houseInit({})
        .accounts({
          house: houseKey,
          authority: payer,
          switchboardMint: switchboardQueue.program.mint.address,
          switchboardQueue: switchboardQueue.publicKey,
          mint: TOKENMINT,
          houseVault: tokenVault,
          payer: payer,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .instruction(),
    ];

    return {
      ixns: txnIxns,
      signers: [],
      account: houseKey,
    };
  }

  static async load(program: FlipProgram, TOKENMINT:PublicKey): Promise<House> {
    const connection = program.provider.connection;
    const [houseKey, houseBump] = House.fromSeeds(program, TOKENMINT);
    const payer = programWallet(program as any);

    let houseState = await HouseState.fetch(connection, houseKey);
    if (houseState !== null) {
      return new House(program, houseKey, houseState);
    }

    throw new Error(`House account has not been created yet`);
  }

  static async getOrCreate(
    program: FlipProgram,
    switchboardQueue: QueueAccount,
    TOKENMINT:PublicKey
  ): Promise<House> {
    try {
      
      const house = await House.load(program, TOKENMINT);
      return house;
    } catch (error: any) {
      if (
        !error.toString().includes("House account has not been created yet")
      ) {
        throw error;
      }
    }

    console.error('no active house key found')
    return House.create(program, switchboardQueue, TOKENMINT);
  }

  async loadMint(): Promise<spl.Mint> {
    const mint = await spl.getMint(
      this.program.provider.connection,
      this.state.mint
    );
    return mint;
  }
}
