import * as anchor from "@project-serum/anchor";
import * as spl from "@solana/spl-token-v2";
import {promiseWithTimeout, sleep } from '@switchboard-xyz/common'
import {
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  Callback,
  QueueAccount,
  PermissionAccount,
  VrfAccount,
  SwitchboardProgram,
  TransactionObject
} from "@switchboard-xyz/solana.js";
import { UserState, UserStateJSON } from "./generated/accounts";
import { House } from "./house";
import { loadSwitchboard, loadVrfContext } from "./switchboard";
import {
  convertGameType,
  FlipProgram,
  GameTypeEnum,
  GameTypeValue,
} from "./types";
import { verifyPayerBalance } from "./utils";
import { programWallet } from "../util/wallet";

export interface UserBetPlaced {
  roundId: anchor.BN;
  user: PublicKey;
  gameType: GameTypeEnum;
  betAmount: anchor.BN;
  guess: number;
  slot: number;
  timestamp: anchor.BN;
}

export interface UserBetSettled {
  roundId: anchor.BN;
  user: PublicKey;
  userWon: boolean;
  gameType: GameTypeEnum;
  betAmount: anchor.BN;
  escrowChange: anchor.BN;
  guess: number;
  result: number;
  slot: number;
  timestamp: anchor.BN;
}

export interface PlaceBetParams {
  TOKENMINT: PublicKey;
  gameType: GameTypeValue;
  userGuess: number;
  betAmount: anchor.BN;
  switchboardTokenAccount?: PublicKey;
}

export interface UserJSON extends UserStateJSON {
  publicKey: string;
}

const VRF_REQUEST_AMOUNT = new anchor.BN(2_000_000);

export class User {
  program: FlipProgram;
  publicKey: PublicKey;
  state: UserState;
  private readonly _programEventListeners: number[] = [];

  constructor(program: FlipProgram, publicKey: PublicKey, state: UserState) {
    this.program = program;
    this.publicKey = publicKey;
    this.state = state;
  }

  static async load(program: FlipProgram, authority: PublicKey, TOKENMINT: PublicKey): Promise<User> {
    
    const [houseKey] = House.fromSeeds(program, TOKENMINT);
    const [userKey] = User.fromSeeds(program, houseKey, authority);
    const userState = await UserState.fetch(
      program.provider.connection,
      userKey
    );
    if (!userState) {
      throw new Error(`User account does not exist`);
    }
    return new User(program, userKey, userState);
  }

  // static async getOrCreate(
  //   program: FlipProgram,
  //   authority: PublicKey,
  //   queuePubkey: PublicKey
  // ): Promise<User> {
  //   try {
  //     const user = await User.load(program, authority);
  //     return user;
  //   } catch (error) {}

  //   const [houseKey] = House.fromSeeds(program);
  //   return User.create(program, houseKey);
  // }

  getVrfAccount(switchboardProgram: SwitchboardProgram): VrfAccount {
    const vrfAccount = new VrfAccount(switchboardProgram, this.state.vrf);
    return vrfAccount;
  }

  async getQueueAccount(switchboardProgram: SwitchboardProgram): Promise<QueueAccount> {
    const vrfAccount = this.getVrfAccount(switchboardProgram);
    const vrfState = await vrfAccount.loadData();
    const queueAccount = new QueueAccount(switchboardProgram, vrfState.oracleQueue);
    return queueAccount;
  }

  static fromSeeds(
    program: FlipProgram,
    housePubkey: PublicKey,
    authority: PublicKey
  ): [PublicKey, number] {
    return anchor.utils.publicKey.findProgramAddressSync(
      [
        Buffer.from("USERSTATESEED"),
        housePubkey.toBytes(),
        authority.toBytes(),
      ],
      program.programId
    );
  }

  async reload(): Promise<void> {
    const newState = await UserState.fetch(
      this.program.provider.connection,
      this.publicKey
    );
    if (newState === null) {
      throw new Error(`Failed to fetch the new User account state`);
    }
    this.state = newState;
  }

  toJSON(): UserJSON {
    return {
      publicKey: this.publicKey.toString(),
      ...this.state.toJSON(),
    };
  }

  static async getCallback(
    program: FlipProgram,
    house: House,
    user: PublicKey,
    escrow: PublicKey,
    vrf: PublicKey,
    rewardAddress: PublicKey,
    TOKENMINT: PublicKey,
  ): Promise<Callback> {
    const ixnCoder = new anchor.BorshInstructionCoder(program.idl);
    const callback: Callback = {
      programId: program.programId,
      ixData: ixnCoder.encode("userSettle", {}),
      accounts: [
        {
          pubkey: user,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: house.publicKey,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: TOKENMINT,
          isWritable: false,
          isSigner: false
        },
        {
          pubkey: escrow,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: rewardAddress,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: house.state.houseVault,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: vrf,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: spl.TOKEN_PROGRAM_ID,
          isWritable: false,
          isSigner: false,
        },
      ],
    };
    return callback;
  }

  static async create(
    userWallet: anchor.AnchorProvider,
    program: FlipProgram,
    switchboardProgram: SwitchboardProgram,
    TOKENMINT: PublicKey,
  ): Promise<User> {
   
    const [userKey, txns] = await User.createReq(program, switchboardProgram, TOKENMINT, userWallet.wallet.publicKey, false);
    const signatures = await switchboardProgram.signAndSendAll(txns);

    let retryCount = 5;
    while (retryCount) {
      const userState = await UserState.fetch(
        program.provider.connection,
        userKey
      );
      if (userState !== null) {
        return new User(program, userKey, userState);
      }
      await sleep(1000);
      --retryCount;
    }

    throw new Error(`Failed to create new UserAccount`);
  }

  static async createReq(
    program: FlipProgram,
    switchboardProgram: SwitchboardProgram,
    TOKENMINT: PublicKey,
    payerPubkey = programWallet(program as any).publicKey,
    rewardAddressInitialized: boolean
  ): Promise<[PublicKey, Array<TransactionObject>]> {


    const house = await House.load(program, TOKENMINT);
    const flipMint = await house.loadMint();

    const switchboardQueue = house.getQueueAccount(switchboardProgram);

    const escrowKeypair = anchor.web3.Keypair.generate();
    const vrfSecret = anchor.web3.Keypair.generate();
    const vrf = process.env.REACT_APP_NETWORK === "devnet" ? new PublicKey("3r9hCdNhQPqh1ZcWTjgNkTRhHHBmgUScKKaWZt1zjzKn") : new PublicKey("BbhoscM2Za4zNNLohLvSMkdNTDkfQwPgiWN8MAsbr36o")
    console.log("using static vrf = ",vrf.toBase58())

    const [userKey, userBump] = User.fromSeeds(
      program,
      house.publicKey,
      payerPubkey
    );
    // console.log(userKey.toBase58(), 'userKey', payerPubkey.toBase58(), 'payer')
    const rewardAddress = await spl.getAssociatedTokenAddress(
      flipMint.address,
      payerPubkey,
      true
    );
    
    // console.log(rewardAddress.toBase58(), 'reward address')


    // used to create new callback
    // const callback = await User.getCallback(      
    //   program,
    //   house,
    //   userKey,
    //   escrowKeypair.publicKey,
    //   testing!=="true" ? vrfSecret.publicKey:vrf,
    //   rewardAddress,
    //   TOKENMINT,
    // );

    const queue = await switchboardQueue.loadData();

    //used to create new vrf
    // const [vrfAccount, vrfInitTxn] = await switchboardQueue.createVrfInstructions(payerPubkey, {
    //   vrfKeypair: vrfSecret,
    //   callback: callback,
    //   authority: userKey,
    // });

    const [permissionAccount, permissionBump] = PermissionAccount.fromSeed(
      switchboardProgram,
      queue.authority,
      switchboardQueue.publicKey,
      vrf
    );


    
    const userInitIxn = await program.methods
      .userInit({
        switchboardStateBump: switchboardProgram.programState.bump,
        vrfPermissionBump: permissionBump,
      })
      .accounts({
        user: userKey,
        house: house.publicKey,
        mint: TOKENMINT,
        authority: payerPubkey,
        escrow: escrowKeypair.publicKey,
        rewardAddress: rewardAddress,
        vrf: vrf,
        payer: payerPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction()
   

    const userInitTxn = new TransactionObject(
      payerPubkey,
      !rewardAddressInitialized
        ? [spl.createAssociatedTokenAccountInstruction(payerPubkey, rewardAddress, payerPubkey, TOKENMINT), userInitIxn]
        : [userInitIxn],
      []
    );

    return [userKey, TransactionObject.pack([userInitTxn])];
  }

  async placeBet(params: PlaceBetParams,vrf:PublicKey, bump:number, state_bump:number, payerPubkey = programWallet(this.program as any).publicKey): Promise<string> {
    const switchboard = await loadSwitchboard(this.program.provider as anchor.AnchorProvider);
    const betTxn = await this.placeBetReq(params, payerPubkey, vrf, bump, state_bump);
    const signature = await switchboard.signAndSend(betTxn);
    return signature;
  }

  async placeBetReq(
    params: PlaceBetParams,
    payerPubkey = programWallet(this.program as any).publicKey,
    vrf: PublicKey,
    bump: number,
    state_bump: number,
    balance = 0
  ): Promise<TransactionObject> {
    try {
      await verifyPayerBalance(this.program.provider.connection, payerPubkey);
    } catch { }
    

    const house = await House.load(this.program, params.TOKENMINT);

    const switchboard = await loadSwitchboard(
      this.program.provider as anchor.AnchorProvider
    );

    const vrfContext = await loadVrfContext(switchboard, vrf);
    const vrfEscrowBalance = await switchboard.mint.fetchBalance(vrfContext.publicKeys.vrfEscrow);
    if (!vrfEscrowBalance && vrfEscrowBalance!==0) {
      throw new Error(`Failed to fetch VRF Escrow account`);
    }

    const wrapAmount = vrfEscrowBalance >= 0.002 ? 0 : 0.002 - vrfEscrowBalance;
  
    const [payerWrappedSolAccount, wrapTxn] = params.switchboardTokenAccount
      ? await (async function (): Promise<[PublicKey, TransactionObject | undefined]> {
        const balance = await switchboard.mint.fetchBalance(params.switchboardTokenAccount!);
        if (balance && balance >= wrapAmount) {
          return [params.switchboardTokenAccount!, undefined];
        }
        const wrapTxn = await switchboard.mint.wrapInstructions(payerPubkey, {
          fundUpTo: 0.002,
        });
        return [params.switchboardTokenAccount!, wrapTxn];
      })()
      : await switchboard.mint.getOrCreateWrappedUserInstructions(payerPubkey, {
        fundUpTo: wrapAmount,
      });
    

    const userBetIxn = await this.program.methods
      .userBet({
        gameType: params.gameType,
        userGuess: params.userGuess,
        betAmount: params.betAmount,
        switchboardStateBump: state_bump,
        vrfPermissionBump: bump,
      })
      .accounts({
        user: this.publicKey,
        house: this.state.house,
        mint: params.TOKENMINT,
        houseVault: house.state.houseVault,
        authority: this.state.authority,
        escrow: this.state.escrow,
        vrfPayer: payerWrappedSolAccount,
        ...vrfContext.publicKeys,
        payer: payerPubkey,
        flipPayer: this.state.rewardAddress,
        recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .instruction()
    
    if (wrapTxn) {
      return wrapTxn.add(userBetIxn);
    }
    return new TransactionObject(payerPubkey, [userBetIxn], [])
  }

  // async awaitFlip(
  //   expectedCounter: anchor.BN,
  //   timeout = 30
  // ): Promise<UserState> {
  //   let accountWs: number;
  //   const awaitUpdatePromise = new Promise(
  //     (resolve: (value: UserState) => void) => {
  //       // console.log('resolving...')
  //       console.log('monitoring... ', this?.publicKey.toBase58())
  //       accountWs = this.program.provider.connection.onAccountChange(
  //         this?.publicKey ?? PublicKey.default,
  //         async (accountInfo) => {
  //           // console.log(accountInfo, 'accountInfo')
  //           const user = UserState.decode(accountInfo.data);
  //           // console.log(user.escrow.toBase58(), 'user')
  //           // console.log(user.currentRound.result, 'result')
  //           if (!expectedCounter.eq(user.currentRound.roundId)) {
  //             // console.log('returning null')
  //             return;
  //           }
  //           if (user.currentRound.result === 0) {
  //             // console.log('returning null 2')
  //             return;
  //           }
  //           resolve(user);
  //         }
  //       );
  //       // console.log(accountWs, 'accountWs')
  //     }
  //   );

  //   console.log('getting result...')

  //   const result = await promiseWithTimeout(
  //     timeout * 1000,
  //     awaitUpdatePromise,
  //     new Error(`flip user failed to update in ${timeout} seconds`)
  //   ).finally(() => {
  //     if (accountWs) {
  //       this.program.provider.connection.removeAccountChangeListener(accountWs);
  //     }
  //   });

  //   if (!result) {
  //     throw new Error(`failed to update flip user`);
  //   }

  //   return result;
  // }

  // async placeBetAndAwaitFlip(
  //   user:User,
  //   TOKENMINT:PublicKey,
  //   gameType: GameTypeValue,
  //   userGuess: number,
  //   betAmount: anchor.BN,
  //   switchboardTokenAccount?: PublicKey,
  //   timeout = 30
  // ): Promise<UserState> {
  //   await this.reload();
  //   const currentCounter = this.state.currentRound.roundId;
  //   // console.log(currentCounter, 'current Counter')

  //   try {
  //     const placeBetTxn = await this.placeBet(
  //       user,
  //       TOKENMINT,
  //       gameType,
  //       userGuess,
  //       betAmount,
  //       switchboardTokenAccount
  //     );
  //     console.log(placeBetTxn, 'tx')
  //   } catch (error) {
  //     console.error(error);
  //     throw error;
  //   }

  //   try {
  //     const userState = await this.awaitFlip(
  //       currentCounter.add(new anchor.BN(1)),
  //       timeout
  //     );
  //     // console.log(userState, 'userState')
  //     return userState;
  //   } catch (error) {
  //     console.error(error);
  //     throw error;
  //   }
  // }

  isWinner(userState?: UserState): boolean {
    const state = userState ?? this.state;
    if (state.currentRound.result === 0) {
      return false;
    }
    return state.currentRound.guess === state.currentRound.result;
  }
  watch(
    betPlaced: (event: UserBetPlaced) => Promise<void> | void,
    betSettled: (event: UserBetSettled) => Promise<void> | void, user:any
  ) {
    this._programEventListeners.push(
      this.program.addEventListener(
        "UserBetPlaced",
        async (event: UserBetPlaced, slot: number, signature: string) => {
          if (!this.publicKey.equals(event.user)) {
            return;
          }
          // const gameType = GameTypeValue.TWENTY_SIDED_DICE_ROLL;
          await betPlaced({
            ...event,
            gameType: convertGameType(event.gameType),
          });
        }
      )
    );

    this._programEventListeners.push(
      this.program.addEventListener(
        "UserBetSettled",
        async (event: UserBetSettled, slot: number, signature: string) => {
          if (!this.publicKey.equals(event.user)) {
            return;
          }
          console.log(signature, ' bet settled tx')
          await betSettled({
            ...event,
            gameType: convertGameType(event.gameType),
          });
        }
      )
    );
  }

  async unwatch() {
    while (this._programEventListeners.length) {
      const id = this._programEventListeners.pop();
      if (id && Number.isFinite(id)) await this.program.removeEventListener(id);
    }
  }
}
