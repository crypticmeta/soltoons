import * as anchor from "@project-serum/anchor";
import * as spl from "@solana/spl-token-v2";
import {sleep } from '@switchboard-xyz/common'
import {
  PublicKey,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
} from "@solana/web3.js";
import {
  Callback,
  QueueAccount,
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
import { programWallet } from "../util/wallet";

import { Buffer } from 'buffer';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import { GameState } from "../data/store/gameStateReducer";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
    
    const [userKey] = User.fromSeeds(program, authority);
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
    authority: PublicKey
  ): [PublicKey, number] {
    return anchor.utils.publicKey.findProgramAddressSync(
      [
        Buffer.from("USERSTATESEED"),
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
   
    const [userKey, txns] = await User.createReq(program,TOKENMINT, userWallet.wallet.publicKey);
    // const signatures = await switchboardProgram.signAndSendAll(txns);

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
    TOKENMINT: PublicKey,
    payerPubkey:PublicKey
  ): Promise<[PublicKey, TransactionObject]> {


    const house = await House.load(program, TOKENMINT);
    const [userKey] = User.fromSeeds(
      program,
      payerPubkey
    );

    const userInitIxn = await program.methods
      .userInit({})
      .accounts({
        user: userKey,
        house: house.publicKey,
        mint: TOKENMINT,
        authority: payerPubkey,
        payer: payerPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction()

    const userInitTxn = new TransactionObject(
      payerPubkey,
      [userInitIxn],
      []
    );
    return [userKey, userInitTxn];
  }

  // async placeBet(params: PlaceBetParams,vrf:PublicKey, bump:number, state_bump:number, payerPubkey = programWallet(this.program as any).publicKey): Promise<string|undefined> {
  //   const switchboard = await loadSwitchboard(this.program.provider as anchor.AnchorProvider);
  //   const betTxn = await this.placeBetReq(params, payerPubkey, vrf, bump, state_bump);
  //   if(betTxn)
  //   {const signature = await switchboard.signAndSend(betTxn);
  //   return signature;}
  // }

  async placeBetReq(
    params: PlaceBetParams,
    payerPubkey = programWallet(this.program as any).publicKey,
    vrf: PublicKey,
    bump: number,
    state_bump: number,
    gameState: GameState|null,
  ): Promise<TransactionObject | null> {
    const house = await House.load(this.program, params.TOKENMINT);
    const admin = new PublicKey("B7BGXMtcfHbgqRsEyCLeQUjKS5TxHbxSjpsGWA7JyudU");
    const backupNft = new PublicKey("97GTa4vY1CmYCJCjTvKrH1Fh9ewYNs27hhev7p5w2eYK");
    const wallet = this.program.provider.publicKey;
    const vrf_mint = new PublicKey("So11111111111111111111111111111111111111112");
    const vrf_house = await House.load(this.program, vrf_mint);

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
      
    let escrow = null;
    let flip_payer = null;
    let flip_payer_is_initialized = true;
    if (params.TOKENMINT.toBase58() === "So11111111111111111111111111111111111111112") {

      

      const tokenAccounts = await this.program.provider.connection.getParsedTokenAccountsByOwner(admin, {
        programId: TOKEN_PROGRAM_ID
      });

      tokenAccounts.value.map(item => {
        escrow = item.pubkey
        flip_payer = item.pubkey
      })

    }
    else if(this.program.provider.publicKey){
       flip_payer = await spl.getAssociatedTokenAddress(params.TOKENMINT, this.program.provider.publicKey, true);
      const accountInfo = await spl.getAccount(this.program.provider.connection, flip_payer).catch((err) => console.error(err));
      flip_payer_is_initialized = accountInfo?.isInitialized || false;
      const [escrowKey] = anchor.utils.publicKey.findProgramAddressSync(
        [Buffer.from('ESCROWSTATESEED'), this.program.provider.publicKey.toBytes(), params.TOKENMINT.toBytes()],
        this.program.programId
      );
      escrow = escrowKey;

    }

    // ******************* NFT Accounts ***************************

    console.log("getting nft accounts")
    let nftATA = null;

    const discount_mint = gameState?.discount?.mint || null;
    if (discount_mint && wallet) {
      console.log(discount_mint, 'discount mint')
      const [associatedTokenAcc] = PublicKey.findProgramAddressSync(
        [
          wallet.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(discount_mint).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      if (associatedTokenAcc) {
        nftATA = associatedTokenAcc
      }
    }
    console.log("got associatedTokenAcc ", nftATA)
    const METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

    const [metadata_account_pda, _] = await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM.toBytes(),
        new PublicKey(discount_mint || backupNft).toBytes(),
      ],
      METADATA_PROGRAM
    );
    console.log("got nft accounts")
    // ******************* Instructions ***************************
    let userBetIxn;
    let ixns;
    if (!flip_payer_is_initialized&&flip_payer) {
      ixns = spl.createAssociatedTokenAccountInstruction(
        payerPubkey,
        flip_payer,
        payerPubkey,
        params.TOKENMINT
      )
    }
    if(escrow && flip_payer)
    {
      userBetIxn = await this.program.methods
      .userBet({
        gameType: params.gameType,
        userGuess: params.userGuess,
        betAmount: params.betAmount,
        switchboardStateBump: state_bump,
        vrfPermissionBump: bump,
      })
      .accounts({
        user: this.publicKey,
        flipPayer:flip_payer,
        house: house.publicKey,
        vrfHouse: vrf_house.publicKey,
        vrfHouseMint: vrf_mint,
        mint: params.TOKENMINT,
        houseVault: house.state.houseVault,
        authority: this.state.authority,
        escrow,
        ...vrfContext.publicKeys,
        vrfPayer: payerWrappedSolAccount,
        payer: payerPubkey,
        nftMint: discount_mint || backupNft,
        nftTokenAccount: nftATA || flip_payer,
        nftMetadataAccount: metadata_account_pda,
        tokenMetadataProgram: METADATA_PROGRAM,
        recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
        .instruction()
    }
    
    if (wrapTxn && userBetIxn) {
      return wrapTxn.add(ixns ? [ixns, userBetIxn] : [userBetIxn]);
    }
    if (userBetIxn)
      return new TransactionObject(payerPubkey,ixns?[ixns, userBetIxn]: [userBetIxn], [])
    else {
      return null
    }
  }

  // async awaitFlip(
  //   expectedCounter: anchor.BN,
  //   timeout = 30
  // ): Promise<UserState> {
  //   let accountWs: number;
  //   const awaitUpdatePromise = new Promise(
  //     (resolve: (value: UserState) => void) => {
  //       accountWs = this.program.provider.connection.onAccountChange(
  //         this?.publicKey ?? PublicKey.default,
  //         async (accountInfo) => {
  //           const user = UserState.decode(accountInfo.data);
  //           if (!expectedCounter.eq(user.currentRound.roundId)) {
  //             return;
  //           }
  //           if (user.currentRound.result === 0) {
  //             return;
  //           }
  //           resolve(user);
  //         }
  //       );
  //     }
  //   );


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

  //   try {
  //     const placeBetTxn = await this.placeBet(
  //       user,
  //       TOKENMINT,
  //       gameType,
  //       userGuess,
  //       betAmount,
  //       switchboardTokenAccount
  //     );
  //   } catch (error) {
  //     console.error(error);
  //     throw error;
  //   }

  //   try {
  //     const userState = await this.awaitFlip(
  //       currentCounter.add(new anchor.BN(1)),
  //       timeout
  //     );
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
          // console.log(event, 'user bet placed')
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
          // console.log(event, 'signature bet settled ', signature)
          if (!this.publicKey.equals(event.user)) {
            return;
          }
          console.info(signature, ' bet settled tx')
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
