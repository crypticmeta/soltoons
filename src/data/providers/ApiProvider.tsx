import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token-v2';
import { useWallet} from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddress } from '@solana/spl-token-v2';
import { SystemProgram, SYSVAR_RECENT_BLOCKHASHES_PUBKEY} from '@solana/web3.js';
import { LAMPORTS_PER_SOL, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { sleep } from "@switchboard-xyz/common"
import { getVRF } from '../providers/utils';
import _ from 'lodash';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { hooks, Store, thunks } from '..';
import * as api from '../../api';
import { House } from '../../api';
import { ThunkDispatch } from '../../types';
import { Severity } from '../../util/const';
import { GameState } from '../store/gameStateReducer';
import { AnchorWallet, TransactionObject } from '@switchboard-xyz/solana.js';
const truncatedPubkey = (pubkey: string) => {
  return `${pubkey.slice(0, 5)}...${pubkey.slice(-5)}`;
};

/*
 * Denominator for the ribs token
 */
const RIBS_PER_RACK = LAMPORTS_PER_SOL;

type Cluster = 'mainnet-beta';

enum ApiCommands {
  UserAirdrop = 'user airdrop',
  UserCreate = 'user create',
  UserPlay = 'user play',
  Drain = 'drain',
  Vault = 'vault',
  CollectReward = 'collect reward',
  SetMint = 'set mint ',
}

const games: { [type: number]: { type: api.GameTypeEnum; prompt: string; minGuess: number; maxGuess: number } } = {
  [api.GameTypeValue.COIN_FLIP]: {
    type: api.GameTypeEnum.COIN_FLIP,
    prompt: `CoinFlip: Use the command \`${ApiCommands.UserPlay} <1-2> <BET>\` to play.`,
    minGuess: 1,
    maxGuess: 2,
  },
  [api.GameTypeValue.CLAW]: {
    type: api.GameTypeEnum.CLAW,
    prompt: `CLAW: Ready To Play.`,
    minGuess: 1,
    maxGuess: 6,
  },
};

enum ApiErrorType {
  General,
  AnchorError,
  GetFlipProgram,
  UserAccountMissing,
  SendTransactionError,
  WalletSignature,
  UnknownCommand,
  UnknownGameType,
  BadGuess,
  BadBet,
}

class ApiError extends Error {
  static general = (message: string) => new ApiError(ApiErrorType.General, message);
  static getFlipProgram = () => new ApiError(ApiErrorType.GetFlipProgram, `Network Issue.`);
  static userAccountMissing = () =>
    new ApiError(
      ApiErrorType.UserAccountMissing,
      "User hasn't created an account. Please click on Create Account Button."
    );
  static walletSignature = () => new ApiError(ApiErrorType.WalletSignature, `Couldn't retrieve user signature.`);
  static unknownCommand = (command: string) =>
    new ApiError(ApiErrorType.UnknownCommand, `Unknown command '${command}'`);
  static unknownGameType = () => new ApiError(ApiErrorType.UnknownGameType, `Unknown game type.`);
  static anchorError = (error: anchor.AnchorError) =>
    new ApiError(
      ApiErrorType.AnchorError,
      `[ANCHOR ERROR] ${error.error.errorCode.number}: ${error.error.errorMessage}`
    );
  static badGuess = (min: number, max: number) =>
    new ApiError(ApiErrorType.BadGuess, `must be a number between ${min} and ${max}.`);
  static badBet = () =>
    new ApiError(ApiErrorType.BadBet, `Bet must be a number > 0 and less than your wallet balance or 2 SOL.`);
  static sendTransactionError = (message: string) => new ApiError(ApiErrorType.SendTransactionError, message);

  readonly type: ApiErrorType;

  private constructor(type: ApiErrorType, message: string) {
    super(message);
    this.type = type;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

interface ApiInterface {
  /**
   * Handle command input from the user.
   */
  readonly handleCommand: (command: string) => Promise<void>;
}

interface PrivateApiInterface extends ApiInterface {
  readonly dispose: () => Promise<void>;
}

class ApiState implements PrivateApiInterface {
  private readonly dispatch: ThunkDispatch;
  private readonly wallet: AnchorWallet;
  private readonly cluster: Cluster;
  private readonly accountChangeListeners: number[] = [];
  private _program?: api.FlipProgram;
  private _user?: api.User;
  private _gameState?: GameState;
  private _mint?: string;

  constructor(wallet: AnchorWallet, dispatch: ThunkDispatch) {
    this.wallet = wallet;
    this.dispatch = dispatch;
    this.cluster = 'mainnet-beta';

    // Upon instantiation of this object, try to fetch user account and balance asynchronously.
    this.user.catch((e) => this.handleError(e));

    this.log(`Connected as ${truncatedPubkey(wallet.publicKey.toBase58())}`, Severity.Success);
  }

  /**
   * The rpc endpoint to be used.
   */
  get rpc(): string {
    // @TODO make rpc connection configurable.

    //@ts-ignore
    return process.env.REACT_APP_NETWORK === 'devnet' ? 'https://api.devnet.solana.com' : process.env.REACT_APP_RPC;
  }

  /**
   * The currently set game mode.
   */
  get gameMode(): api.GameTypeValue {
    return this._gameState?.gameMode ?? api.GameTypeValue.CLAW;
  }

  /**
   * The currently known balance in the user's wallet.
   */
  get userRibsBalance(): number {
    return this._gameState?.userBalances?.ribs ?? 0;
  }

  get userBalance(): number {
    return this._gameState?.userBalances?.sol ?? 0;
  }

  /**
   * Try to return the cached program, and fallback on retrieving it from the network.
   *
   * If the program cannot be retrieved, an {@linkcode ApiError} will be thrown.
   */
  get program(): Promise<api.FlipProgram> {
    // If the program has already been set, return it.
    if (this._program) return Promise.resolve(this._program);

    // const tempWallet = new AnchorWallet(anchor.web3.Keypair.generate());
    const tempWallet = this?.wallet?.publicKey?this.wallet:new AnchorWallet(anchor.web3.Keypair.generate());
    return api
      .getFlipProgram(this.rpc, tempWallet)
      .then(
        (program) =>
          (this._program ??= (() => {
            // If there is not yet a known program, set it, log it, and return it.
            this.log(`Program retrieved for cluster: ${process.env.REACT_APP_NETWORK}`);
            return program;
          })())
      )
      .catch((e) => {
        console.error(e, 'err loading program');
        this.dispatch(thunks.setLoading(false));
        throw ApiError.getFlipProgram();
      });
  }

  get tokenMint() {
    return new PublicKey(this._mint ? this._mint : 'So11111111111111111111111111111111111111112');
  }
  /**
   * Try to return the cached user accounts, and fallback on retrieving them from the network.
   *
   * If the user does not have accounts set up, an {@linkcode ApiError} will be thrown.
   */
  get user(): Promise<api.User> {
    // If the user has already been set, return it.
    if (this._user) return Promise.resolve(this._user);

    return (async () => {
      const pubkey = this.wallet.publicKey;
      const program = await this.program;
      const TOKENMINT = new PublicKey('So11111111111111111111111111111111111111112');
      return api.User.load(program, pubkey, TOKENMINT)
        .then(
          (user) =>
            (this._user ??= (() => {
              const temp_user = user.state.toJSON();
              temp_user.publicKey = user.publicKey.toBase58();
              this.dispatch(thunks.setUser(temp_user));
              // If there is not yet a known user, set it, log it, and return it.
              this.log(`Accounts retrieved for user: ${truncatedPubkey(pubkey.toBase58())}`);
              this.watchUserAccounts().then(this.playPrompt);

              return user;
            })())
        )
        .catch((e) => {
          this.dispatch(thunks.setLoading(false));
          if (e instanceof ApiError) throw e;
          else throw ApiError.userAccountMissing();
        });
    })();
  }

  /**
   * Update the currently known {@linkcode GameState}.
   */
  public set gameState(gameState: GameState) {
    this._gameState = gameState;
  }
  /**
   * Update the mint {@linkcode GameState}.
   */
  public set setTokenMint(tokenMint: string) {
    this._mint = tokenMint;
  }

  /**
   * Teardown this {@linkcode ApiState} object.
   */
  public dispose = async () => {
    const program = await this.program;
    await (await this.user).unwatch();
    await Promise.allSettled(
      this.accountChangeListeners.map((id) => program.provider.connection.removeAccountChangeListener(id))
    );
  };

  public handleCommand = async (command: string) => {
    try {
      command = command.trim(); // Trim the initial command.
      if (command === ApiCommands.UserCreate) await this.createUserAccounts();
      // else if (command === ApiCommands.UserAirdrop) await this.userAirdrop();
      else if (command.startsWith(ApiCommands.Drain)) await this.Drain();
      else if (command.startsWith(ApiCommands.Vault)) await this.Vault();
      else if (command.startsWith(ApiCommands.CollectReward)) await this.CollectReward();
      else if (command.startsWith(ApiCommands.UserPlay))
        // Split the arguments and try to play the game.
        await this.playGame(command.replace(ApiCommands.UserPlay, '').trim().split(/\s+/));
      else throw ApiError.unknownCommand(command);
    } catch (e) {
      this.dispatch(thunks.setLoading(false));
      this.handleError(e);
    }
  };

  /**
   * Set up a user's VRF accounts (if they're not already set up).
   */
  private createUserAccounts = async () => {
    const user = await this.user.catch(() => undefined);
    const TOKENMINT = this.tokenMint;
    // If there are already known user accounts, do not set up new accounts.
    if (user?.publicKey) {
      this.dispatch(thunks.setLoading(false));
      //@ts-ignore
      return this.log(`User account is already set up.`);
      // .then(() => this.playPrompt());
    }

    this.dispatch(thunks.setLoading(true));
    // Gather necessary programs.
    const program = await this.program;
    const anchorProvider = new anchor.AnchorProvider(program.provider.connection, this.wallet, {});
    const switchboard = await api.loadSwitchboard(anchorProvider);
    // this.log(`Checking if user needs airdrop...`);

    // If there are no known user accounts, begin accounts set up.
    this.log(`Building user accounts...`);
    // const rewardAddress = await spl.getAssociatedTokenAddress(TOKENMINT, this.wallet.publicKey, true);
    // const accountInfo = await spl.getAccount(anchorProvider.connection, rewardAddress).catch((err) => console.error(err));
    // Build out and sign transactions.
    const [userKey, userInitTxns] = await api.User.createReq(
      program,
      TOKENMINT,
      this.wallet.publicKey
    );

    if(userInitTxns)
    await this.packSignAndSubmit(userInitTxns, "userInit")


    let retryCount = 5;
    while (retryCount) {
      const userState = await api.UserState.fetch(program.provider.connection, userKey);
      if (userState !== null) {
        this.log('User Account Created Successfully', Severity.Normal);
        this.dispatch(thunks.setLoading(false));
        return (async () => {
          const pubkey = this.wallet.publicKey;
          const program = await this.program;
          return api.User.load(program, pubkey, TOKENMINT)
            .then(
              (user) =>
                (this._user ??= (() => {
                  // If there is not yet a known user, set it, log it, and return it.
                  // this.log(`Accounts retrieved for user: ${truncatedPubkey(pubkey.toBase58())}`);
                  const temp_user = user.state.toJSON();
                  temp_user.publicKey = user.publicKey.toBase58();
                  this.dispatch(thunks.setUser(temp_user));
                  this.watchUserAccounts();
                  return user;
                })())
            )
            .catch((e) => {
              this.dispatch(thunks.setLoading(false));
              if (e instanceof ApiError) throw e;
              else throw ApiError.userAccountMissing();
            });
        })();
      }
      await sleep(1000);
      --retryCount;
    }
    this.dispatch(thunks.setLoading(false));
    this.log('A transaction failed to confirm.', Severity.Error);
    await this.user;
  };

  /**
   * Attempt to drain vault
   */
  private Drain = async () => {
    const TOKENMINT = this.tokenMint;
    this.dispatch(thunks.setLoading(true));
    this.log('Draining vault...');
    const payerPubkey = this.wallet.publicKey;
    const program = await this.program;
    let ixns: TransactionInstruction[]=[];
    const house = await House.load(program, TOKENMINT);
    const associatedTokenAcc = await getAssociatedTokenAddress(TOKENMINT, payerPubkey);
    const accountInfo = await spl.getAccount(program.provider.connection, associatedTokenAcc).catch((err) => console.error(err));
    ixns = [
      await (await this.program)
      .methods.drain()
      .accounts({
        house: house.publicKey,
        mint: TOKENMINT,
        houseVault: house.state.houseVault,
        payer: payerPubkey,
        payerTokenAccount: associatedTokenAcc,
        systemProgram: SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
        .instruction()
    ]
    if (!accountInfo?.isInitialized) {
      ixns.unshift(
        spl.createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,
          associatedTokenAcc,
          this.wallet.publicKey,
          TOKENMINT
        )
      )
    }
    
    
    const request = new TransactionObject(this.wallet.publicKey, ixns, []);

    await this.packSignAndSubmit(request, "drain");
  };

  // get vault info
  private Vault = async () => {
    const TOKENMINT = this.tokenMint;
    this.dispatch(thunks.setLoading(true));
    this.log('Getting vault info...');
    const program = await this.program;
    const house = await House.load(program, TOKENMINT);
    // const associatedTokenAcc = await getAssociatedTokenAddress(TOKENMINT, payerPubkey);
    const data = await program.provider.connection.getBalance(house.publicKey);
    if (data && data > 0) {
      this.dispatch(thunks.setVaultBalance(data / LAMPORTS_PER_SOL));
      this.log('Vault Balance Loaded');
    }
  };

  /**
   * Attempt to collect user reward
   */
  private CollectReward = async () => {
    const TOKENMINT = this.tokenMint;
    this.dispatch(thunks.setLoading(true));
    this.log('Collecting reward...');
    const payerPubkey = this.wallet.publicKey;
    const program = await this.program;
    const user = await this.user;
    const house = await House.load(program, TOKENMINT);
    const ixns = await (
        await this.program
      ).methods
        .collectReward({})
        .accounts({
          user: user.publicKey,
          house: house.publicKey,
          mint: TOKENMINT,
          authority: payerPubkey,
          recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
        })
        .instruction()

    const request = new TransactionObject(this.wallet.publicKey, [ixns], [])
    if (request) {
      // const pack = TransactionObject.pack([request])
      const program = await this.program;
      const blockhash = await program.provider.connection.getLatestBlockhash();
      const sign = request.sign(blockhash, request.signers);
      const signedTxs = await this.wallet.signAllTransactions([sign]);
      for (const tx of signedTxs) {
        const serialTx = tx.serialize();
        await program.provider.connection
          .sendRawTransaction(serialTx, { skipPreflight: true })
          .then((sig) => {
            console.info(sig, ' tx');            
            this.log('Reward collected Successfully!');
            this.dispatch(thunks.setLoading(false));
            this.dispatch(thunks.log({ message: 'Successfully claimed funds. ', severity: Severity.Success }));
            this.dispatch(thunks.setResult({ status: 'claimed' }));
          })
          .catch((e) => {
            this.dispatch(thunks.setResult({ status: 'error' }));
            this.dispatch(thunks.setLoading(false));
            if (e instanceof anchor.web3.SendTransactionError) {
              const anchorError = e.logs ? anchor.AnchorError.parse(e.logs) : null;
              if (anchorError) {
                console.error(anchorError);
                throw ApiError.anchorError(anchorError);
              } else {
                console.error(e);
                throw ApiError.sendTransactionError(e.message);
              }
            }
          });
      }
      // await this.packSignAndSubmit(request.ixns, request.signers, false);
    }
  };

  /**
   * Play the game.
   */
  private playGame = async (args: string[]) => {
    const TOKENMINT = this.tokenMint;
    this.dispatch(thunks.setLoading(true));
    const game = games[this.gameMode];

    // Gather necessary programs.
    const user = await this.user; // Make sure that user is logged in and has accounts.

    // Validate the guess.
    const guess = _.isFinite(Number(args[0])) ? Number(args[0]) : undefined;
    if (_.isUndefined(guess) || guess < game.minGuess || guess > game.maxGuess) {
      // Guess must be a number within the range (inclusive).
      this.dispatch(thunks.setLoading(false));
      throw ApiError.badGuess(game.minGuess, game.maxGuess);
    }

    // Validate the bet.
    const bet = Number.isFinite(Number(args[1])) ? Number(args[1]) : undefined;
    if (_.isUndefined(bet) || bet <= 0 || bet > 2 || bet > this.userBalance - 0.004) {
      // Bet must be a positive number that's less than the user's balance.
      this.dispatch(thunks.setLoading(false));
      throw ApiError.badBet();
    }

    this.log(`Building bet request...`);
    this.dispatch(thunks.setResult({ status: 'loading' }));

    this.dispatch(thunks.setLoading(true));
    // const vrf: any = await getVRF(this.wallet.publicKey.toBase58());
    //Throw error if no VRF
    // if (!vrf || !vrf.id) {
    //   this.log("No VRF Available")
    //   this.dispatch(thunks.setResult({ status: 'error' }));
    //   return
    // }
    // console.info("VRF used is: ", vrf.id)
    const DEFAULT_STATE_BUMP = process.env.REACT_APP_NETWORK==="devnet"?255:249
    const request = await user
      .placeBetReq(
        {
          TOKENMINT,
          gameType: this.gameMode,
          userGuess: guess,
          betAmount: new anchor.BN(bet * LAMPORTS_PER_SOL),
          switchboardTokenAccount: undefined,
        },
        this.wallet.publicKey,
        new PublicKey(
          // vrf
          //   ? vrf.id
            // :
    process.env.REACT_APP_NETWORK === 'devnet'
            ? '4V4hFcswusaQ9tC5CJekc5YqraNQw4QxBDiSbPLDF4k5'
            : '8fGps8aCBrkNguLHt9SKHwNvtg7UeTH6MvVQ5y8dDySs'
        ),
        // vrf?.permission_bump ||
        255,
        // vrf?.state_bump ||
        DEFAULT_STATE_BUMP,
        this.userRibsBalance
      )
      .catch((err) => {
        this.dispatch(thunks.setResult({ status: 'error' }));
        console.error(err, 'err creating bet req');
      });
    // const program = await this.program
    // if (request?.ixns.length && program?.provider?.sendAndConfirm) {
    //   const status = await program.provider.sendAndConfirm(new Transaction().add(...request.ixns), [...request.signers]);
    //   console.log(status, 'STATUS')
    // }
    if(request)
      await this.packSignAndSubmit(request, "userBet")
    else {
      this.dispatch(thunks.setResult({ status: 'error' }));
    }
  };

  private packSignAndSubmit = async (
    request: TransactionObject,
    id?: string,
  ) => {
    const program = await this.program;
    const blockhash = await program.provider.connection.getLatestBlockhash();
    const sign = request.sign(blockhash, request.signers);
    const signedTxs = await this.wallet.signAllTransactions([sign]).catch(e => {
      this.dispatch(thunks.setResult({ status: 'error' }));
      this.log("User Rejected to sign Tx", Severity.Error)
      this.dispatch(thunks.setLoading(false));
      if (e instanceof anchor.web3.SendTransactionError) {
        const anchorError = e.logs ? anchor.AnchorError.parse(e.logs) : null;
        if (anchorError) {
          console.error(anchorError);
          throw ApiError.anchorError(anchorError);
        } else {
          console.error(e);
          throw ApiError.general('An error occurred while sending transaction.');
          // throw ApiError.sendTransactionError(e.message);
        }
      }
    });
    if(signedTxs)
    {
      if (id === "userBet") {
      this.dispatch(thunks.setResult({ status: 'waiting' }));
      }
      for (const tx of signedTxs) {
      const serialTx = tx.serialize();
      await program.provider.connection
        .sendRawTransaction(serialTx, { skipPreflight: false })
        .then((sig) => {
          console.info(sig, ' tx');
          if (id === "userBet")            
          this.dispatch(thunks.log({ message: 'Waiting for Tx confirmation... ', severity: Severity.Success }));
            else
          {
            this.dispatch(thunks.log({ message: 'Tx sent successfully. ', severity: Severity.Success }));
            
            this.dispatch(thunks.setLoading(false));
          }
        })
        .catch((e) => {
          this.dispatch(thunks.setResult({ status: 'error' }));
          this.dispatch(thunks.setLoading(false));
          if (e instanceof anchor.web3.SendTransactionError) {
            const anchorError = e.logs ? anchor.AnchorError.parse(e.logs) : null;
            if (anchorError) {
              console.error(anchorError);
              throw ApiError.anchorError(anchorError);
            } else {
              console.error(e);
              throw ApiError.general('An error occurred while sending transaction.');
              // throw ApiError.sendTransactionError(e.message);
            }
          }
        });
      }
    }
  }

  /**
   * Fetches the user's current SOL balance.
   */
  private watchUserAccounts = async () => {
    const onSolAccountChange = (account: anchor.web3.AccountInfo<Buffer> | null) => {
      this.dispatch(thunks.setUserBalance({ sol: account ? account.lamports / LAMPORTS_PER_SOL : undefined }));
    };
    const onUserVaultAccountChange = (account: anchor.web3.AccountInfo<Buffer> | null) => {
      this.dispatch(thunks.setUserVaultBalance(account ? account.lamports / LAMPORTS_PER_SOL : undefined));
    };
    const onRibsAccountChange = (account: anchor.web3.AccountInfo<Buffer> | null) => {
      if (!account) {
        this.dispatch(
          thunks.setUserBalance({
            ribs: undefined,
          })
        );
        return;
      } else if (account?.data?.length === 0) {
        this.dispatch(
          thunks.setUserBalance({
            ribs: undefined,
          })
        );
        return;
      }
      const rawAccount = spl.AccountLayout.decode(account.data);
      if (Number(rawAccount?.amount?.toString()) > 0)
        this.dispatch(
          thunks.setUserBalance({
            ribs: rawAccount.amount ? Number(rawAccount.amount) / RIBS_PER_RACK : undefined,
          })
        );
    };

    // Grab initial values.
    const program = await this.program;
    const user = await this.user;
    // const rewardAddress =
    await program.provider.connection.getAccountInfo(this.wallet.publicKey).then(onSolAccountChange);
    // await program.provider.connection.getAccountInfo(user.state.rewardAddress).then(onRibsAccountChange);
    await program.provider.connection.getAccountInfo(user.publicKey).then(onUserVaultAccountChange);

    // Listen for account changes.
    this.accountChangeListeners.push(
      ...[
        program.provider.connection.onAccountChange(this.wallet.publicKey, onSolAccountChange),
        // program.provider.connection.onAccountChange(user.state.rewardAddress, onRibsAccountChange),
        program.provider.connection.onAccountChange(user.publicKey, onUserVaultAccountChange),
      ]
    );

    // Watch user object
    await user.watch(
      /* betPlaced= */ async (event) => {
        const bet = event.betAmount.div(new anchor.BN(RIBS_PER_RACK));
        await this.log(`BetPlaced: User bet ${bet} on number ${event.guess}`);
        await this.log(`Awaiting result from vrf...`);
      },
      /* betSettled= */ async (event) => {
        let multiplier = [
          1.0, 0.3, 1.0, 0.3, 0.3, 1.0, 0.3, 1.0, 0.5, 1.0, 1.0, 0.0, 0.8, 0.3, 2.0, 0.3, 1.0, 0.3, 0.5, 0.8, 2.0, 1.0,
          0.5, 2.0, 1.0, 1.0, 0.5, 0.3, 0.8, 0.3, 0.3, 0.0, 0.8, 0.3, 0.5, 0.0, 0.5, 1.0, 0.0, 0.5, 1.0, 0.3, 0.0, 0.3,
          0.0, 1.0, 0.3, 0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 1.0, 0.3, 1.0, 0.3, 0.3, 1.0, 1.0, 0.3, 0.3, 1.0,
          0.3, 1.0, 2.0, 0.5, 1.0, 0.0, 0.0, 1.0, 0.3, 1.0, 0.3, 1.0, 0.3, 0.3, 0.8, 0.3, 0.3, 0.3, 1.0, 8.0, 0.3, 1.0,
          0.3, 0.8, 0.3, 1.0, 0.8, 0.8, 1.0, 0.0, 0.3, 0.3, 1.0, 1.0, 1.0, 0.0, 0.0, 0.3, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0,
          1.0, 0.3, 0.3, 0.8, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.3, 0.3, 1.0, 0.3, 1.0, 0.3, 0.3,
          0.8, 0.3, 2.0, 2.0, 0.3, 0.3, 0.3, 1.0, 2.0, 0.3, 1.0, 1.0, 1.0, 0.3, 1.0, 0.3, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0,
          1.0, 1.0, 0.3, 0.5, 1.0, 1.0, 0.8, 0.3, 0.3, 1.0, 0.0, 1.0, 0.5, 1.0, 0.0, 1.0, 8.0, 1.0, 0.3, 0.3, 0.3, 1.0,
          0.0, 8.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.3, 0.0, 0.0, 0.3, 0.3, 1.0, 0.3, 0.0, 0.3, 0.3, 1.0, 0.5, 1.0, 1.0, 1.0,
          1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 0.3, 0.3, 1.0, 0.3, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.3, 0.3, 0.3, 1.0, 0.3, 1.0,
          0.0, 0.0, 1.0, 1.0, 0.3, 1.0, 1.0, 1.0, 0.8, 0.0, 1.0, 0.8, 1.0, 0.3, 0.3, 0.3, 1.0, 0.5, 1.0, 0.5, 0.8, 1.0,
          1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.8, 0.3, 0.3, 0.8, 1.0, 0.3, 1.0, 1.0, 1.0, 0.5,
          0.8, 0.8, 0.0, 1.0, 1.0, 2.0, 1.0, 0.3, 8.0, 1.0, 0.3, 1.0, 1.0, 0.3, 0.3, 1.0, 0.3, 0.3, 0.0, 0.0, 0.3, 1.0,
          1.0, 0.3, 1.0, 1.0, 0.3, 1.0, 1.0, 0.3, 8.0, 1.0, 1.0, 0.3, 1.0, 1.0, 2.0, 0.3, 1.0, 0.3, 1.0, 1.0, 1.0, 0.8,
          0.5, 0.0, 0.5, 0.8, 0.3, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.3, 1.0, 0.3, 0.3, 0.0, 1.0, 0.3, 0.3, 1.0, 1.0, 1.0,
          0.8, 1.0, 0.8, 0.3, 0.3, 1.0, 0.3, 1.0, 0.0, 1.0, 0.5, 0.8, 0.3, 1.0, 0.3, 1.0, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0,
          0.3, 1.0, 1.0, 1.0, 1.0, 0.3, 0.3, 0.3, 1.0, 0.0, 0.3, 1.0, 1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 1.0, 0.3, 0.3, 0.0,
          1.0, 1.0, 1.0, 1.0, 1.0, 0.3, 0.3, 1.0, 1.0, 0.5, 0.3, 0.3, 0.3, 0.3, 1.0, 0.3, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,
          0.0, 0.0, 1.0, 1.0, 1.0, 0.8, 1.0, 1.0, 0.8, 1.0, 1.0, 1.0, 0.3, 0.0, 1.0, 1.0, 0.0, 2.0, 1.0, 1.0, 0.3, 1.0,
          0.8, 1.0, 0.5, 1.0, 0.3, 0.3, 0.3, 1.0, 1.0, 0.3, 1.0, 0.3, 2.0, 0.3, 0.8, 0.3, 0.8, 1.0, 1.0, 0.0, 0.3, 1.0,
          1.0, 2.0, 1.0, 1.0, 0.0, 0.3, 1.0, 1.0, 0.5, 1.0, 0.3, 0.3, 0.8, 1.0, 1.0, 0.3, 1.0, 1.0, 0.3, 0.8, 0.5, 0.8,
          0.3, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.3, 1.0, 1.0, 0.0, 5.0, 1.0, 1.0, 1.0, 1.0, 0.3, 1.0, 1.0, 0.3,
          0.3, 0.3, 1.0, 0.3, 0.3, 0.5, 8.0, 0.0, 0.3, 0.5, 1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 1.0, 0.3, 1.0, 0.0, 1.0, 1.0,
          0.3, 1.0, 0.3, 0.5, 1.0, 0.3, 0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 2.0, 0.8, 1.0, 0.3, 1.0, 0.3, 2.0, 0.8, 1.0,
          0.3, 0.3, 0.0, 0.3, 0.3, 0.3, 0.5, 1.0, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 1.0, 1.0, 1.0, 0.3, 0.5, 0.3, 1.0, 1.0,
          1.0, 0.3, 0.8, 1.0, 1.0, 0.3, 1.0, 8.0, 1.0, 0.3, 0.3, 0.3, 1.0, 1.0, 0.3, 0.0, 1.0, 0.3, 1.0, 0.3, 0.3, 0.3,
          0.3, 1.0, 0.5, 0.3, 0.3, 1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.3, 0.3, 8.0, 0.8, 0.3, 1.0, 0.0,
          1.0, 1.0, 2.0, 0.3, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.3, 0.3, 0.3, 0.0, 0.3, 0.5, 8.0, 1.0, 0.3, 1.0, 1.0, 1.0,
          1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.3, 0.3, 1.0, 1.0, 0.5, 1.0, 0.5, 1.0, 1.0, 0.3, 1.0, 0.3, 0.3, 1.0, 0.5, 0.3,
          0.0, 1.0, 1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.3, 1.0, 1.0, 1.0, 2.0, 1.0, 2.0, 0.3, 1.0, 1.0, 0.8,
          1.0, 0.3, 0.3, 1.0, 1.0, 1.0, 2.0, 0.5, 0.3, 1.0, 1.0, 0.3, 1.0, 0.3, 0.3, 1.0, 1.0, 0.8, 1.0, 0.3, 0.3, 1.0,
          1.0, 1.0, 1.0, 1.0, 1.0, 0.3, 1.0, 0.3, 0.3, 1.0, 0.5, 1.0, 0.3, 0.3, 1.0, 1.0, 0.3, 1.0, 0.3, 1.0, 1.0, 1.0,
          0.3, 1.0, 0.8, 0.3, 1.0, 0.3, 0.3, 1.0, 0.3, 0.8, 1.0, 0.0, 0.3, 2.0, 0.0, 0.5, 1.0, 1.0, 0.8, 1.0, 0.8, 1.0,
          1.0, 1.0, 1.0, 0.3, 1.0, 1.0, 0.0, 0.3, 1.0, 0.5, 0.0, 0.0, 1.0, 1.0, 1.0, 0.3, 1.0, 0.0, 0.3, 0.3, 1.0, 0.3,
          1.0, 1.0, 2.0, 0.3, 0.8, 0.3, 0.5, 0.8, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 1.0, 0.0, 0.8, 1.0, 1.0, 1.0, 1.0, 0.3,
          1.0, 2.0, 1.0, 0.5, 0.5, 0.3, 0.3, 1.0, 0.3, 1.0, 0.3, 1.0, 1.0, 0.5, 0.3, 1.0, 1.0, 0.3, 0.3, 0.3, 1.0, 0.8,
          0.3, 1.0, 0.3, 0.8, 1.0, 0.8, 2.0, 1.0, 1.0, 1.0, 0.3, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 0.3, 1.0, 0.5,
          0.3, 1.0, 2.0, 0.5, 0.3, 1.0, 0.3, 0.8, 0.8, 1.0, 1.0, 0.3, 0.5, 1.0, 0.3, 0.8, 0.3, 1.0, 0.8, 0.3, 0.3, 0.3,
          0.3, 1.0, 0.3, 0.3, 0.3, 1.0, 0.3, 1.0, 0.0, 0.0, 1.0, 1.0, 0.3, 1.0, 1.0, 0.5, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,
          1.0, 0.3, 1.0, 1.0, 1.0, 0.3, 1.0, 8.0, 1.0, 0.8, 0.3, 5.0, 0.3, 0.3, 0.0, 1.0, 1.0, 0.8, 1.0, 0.5, 0.3, 0.3,
          0.3, 0.3, 1.0, 1.0, 0.3, 1.0, 0.5, 1.0, 10.0, 0.3, 2.0, 0.3, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0, 8.0, 0.3, 0.5, 0.8,
          1.0, 1.0, 0.3, 1.0, 1.0, 0.3, 0.3, 1.0, 1.0, 0.0, 1.0, 0.3, 1.0, 0.3, 0.8, 1.0, 0.8, 0.3, 0.3, 0.3, 1.0, 1.0,
          1.0, 0.3, 0.3, 1.0, 0.3, 1.0, 1.0, 0.3, 1.0, 0.3, 0.0, 0.3, 1.0, 0.3, 0.8, 1.0, 1.0, 0.0, 0.3, 1.0, 0.3, 1.0,
          1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 0.3, 0.8, 0.3, 0.3, 1.0, 2.0, 0.8, 1.0, 1.0, 0.3, 2.0, 1.0, 1.0, 0.0, 0.5,
          0.3, 1.0, 1.0, 1.0, 1.0, 1.0, 0.3, 0.8, 0.8, 2.0, 0.3, 1.0, 0.3, 0.3, 1.0, 0.8, 0.3, 0.8, 0.3, 1.0, 0.3, 1.0,
          0.0, 0.3, 1.0, 0.8, 1.0, 0.0, 0.3, 1.0, 2.0, 0.0,
        ];
        this.log('Received Result.', Severity.Normal);

        if (multiplier[Number(event.result.toString())] > 0) {
          event.userWon = true;
        } else event.userWon = false;
        !event.userWon && this.log(`You missed the plushie, please try again`, Severity.Error);

        this.dispatch(
          thunks.setResult({
            status: 'success',
            result: event.result.toString(),
            change: event.escrowChange.toString(),
            multiplier: multiplier[Number(event.result.toString())].toFixed(1),
            userWon: event.userWon,
          })
        );

        this.dispatch(thunks.setLoading(false));
        // await this.playPrompt();
      },
      await this.user
    );
    return user;
  };

  /**
   * Handles errors that are thrown.
   */
  private handleError = (e: any) => {
    this.dispatch(thunks.setLoading(false));
    if (e instanceof ApiError) {
      this.log(e.message, Severity.Error);
    } else console.error('ApiProvider[handleError] Error occurred:\n', e);
  };

  /**
   * Log to DisplayLogger.
   */
  private log = (message: string, severity: Severity = Severity.Normal) => {
    if (severity == 'error') {
      this.dispatch(thunks.setLoading(false));
    }
    this.dispatch(thunks.log({ message, severity }));
  };

  /**
   * Prompts the user to play the game.
   */
  private playPrompt = async () => {
    try {
      if (this.userBalance < 0.1) {
        // If user balance is under 0.1
        return this.log('Looks like your SOL balance is low');
      }

      // Check for valid game mode and prompt user.
      const game = games[this.gameMode];
      if (game) {
        if (game) this.log(game.prompt);
      } else throw ApiError.unknownGameType();
    } catch (e) {
      this.handleError(e);
    }
  };
}

/**
 * The variant of {@linkcode ApiInterface} that is provided when no user is logged in.
 */
class NoUserApiState implements PrivateApiInterface {
  private readonly dispatch?: ThunkDispatch;

  constructor(dispatch?: ThunkDispatch) {
    this.dispatch = dispatch;
    this.log();
    if (this.dispatch) this.dispatch(thunks.setUserBalance());
  }

  public handleCommand = async () => this.log();

  public dispose = async () => {};

  /**
   * Log to DisplayLogger.
   */
  private log = () => {
    if (this.dispatch) this.dispatch(thunks.log({ message: 'No wallet is connected.' }));
  };
}

const ApiContext = React.createContext<ApiInterface>(new NoUserApiState());
const useApi = () => React.useContext(ApiContext);

/**
 * Exposes the API functionality to other parts of the applications.
 *
 * Will provide {@linkcode ApiContext} to any child components by calling `const api = useApi();`
 */
export const ApiProvider: React.FC<React.PropsWithChildren> = (props) => {
  const dispatch = hooks.useThunkDispatch();
  const wallet = useWallet();
  const gameState = useSelector((store: Store) => store.gameState);
  const tokenmint = useSelector((store: Store) => store.gameState.tokenmint);
  const [stateWallet, setStateWallet] = useState(wallet);

  // The api is rebuilt only when the connected pubkey changes
  const api = React.useMemo(
  //@ts-ignore
    () => (stateWallet && stateWallet?.connected && stateWallet.publicKey ? new ApiState(stateWallet, dispatch) : new NoUserApiState(dispatch)),
    [stateWallet, dispatch]
  );

  // If a new wallet has been set, dispose of the old api object and set the new wallet state.
  React.useEffect(() => {
    if (wallet !== stateWallet) api.dispose().then(() => setStateWallet(wallet));
  }, [api, wallet, stateWallet]);

  React.useEffect(() => {
    if (api instanceof ApiState) {
      api.gameState = gameState;
      api.setTokenMint = tokenmint;
    }
  }, [api, gameState, tokenmint]);

  return <ApiContext.Provider value={api} children={props.children} />;
};

/**
 * Expose {@linkcode ApiContext} to the children
 */
export default useApi;
