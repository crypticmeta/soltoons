import { useConnectedWallet } from '@gokiprotocol/walletkit';
import * as anchor from '@project-serum/anchor';
import { ConnectedWallet } from '@saberhq/use-solana';
import * as spl from '@solana/spl-token-v2';
import { createSyncNativeInstruction, getAssociatedTokenAddress } from '@solana/spl-token-v2';
import { SystemProgram } from '@solana/web3.js';
import { LAMPORTS_PER_SOL, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { sleep } from '@switchboard-xyz/common';
import * as sbv2 from '@switchboard-xyz/solana.js';
import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { hooks, Store, thunks } from '..';
import * as api from '../../api';
import { House } from '../../api';
import { ThunkDispatch } from '../../types';
import { Severity } from '../../util/const';
import { GameState } from '../store/gameStateReducer';

const truncatedPubkey = (pubkey: string) => {
  return `${pubkey.slice(0, 5)}...${pubkey.slice(-5)}`;
};

const TOKENMINT = new PublicKey('So11111111111111111111111111111111111111112');

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
}

const games: { [type: number]: { type: api.GameTypeEnum; prompt: string; minGuess: number; maxGuess: number } } = {
  [api.GameTypeValue.COIN_FLIP]: {
    type: api.GameTypeEnum.COIN_FLIP,
    prompt: `CoinFlip: Use the command \`${ApiCommands.UserPlay} <1-2> <BET>\` to play.`,
    minGuess: 1,
    maxGuess: 2,
  },
  [api.GameTypeValue.SIX_SIDED_DICE_ROLL]: {
    type: api.GameTypeEnum.SIX_SIDED_DICE_ROLL,
    prompt: `SixSidedDice: Use the command \`${ApiCommands.UserPlay} <1-6> <BET>\` to play.`,
    minGuess: 1,
    maxGuess: 6,
  },
  [api.GameTypeValue.TWENTY_SIDED_DICE_ROLL]: {
    type: api.GameTypeEnum.TWENTY_SIDED_DICE_ROLL,
    prompt: `Ready to play.`,
    minGuess: 0,
    maxGuess: 20,
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
  private readonly wallet: ConnectedWallet;
  private readonly cluster: Cluster;
  private readonly accountChangeListeners: number[] = [];
  private _program?: api.FlipProgram;
  private _user?: api.User;
  private _gameState?: GameState;

  constructor(wallet: ConnectedWallet, dispatch: ThunkDispatch) {
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
    return process.env.REACT_APP_NETWORK === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://warmhearted-greatest-emerald.solana-mainnet.quiknode.pro/2b6bcf328ed2611d4d293c2aaa027f3139acb0af/';
  }

  /**
   * The currently set game mode.
   */
  get gameMode(): api.GameTypeValue {
    return this._gameState?.gameMode ?? api.GameTypeValue.TWENTY_SIDED_DICE_ROLL;
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
    // console.log(this._program, 'pro');
    // console.log(this.cluster, 'cluster')
    // If the program has already been set, return it.
    if (this._program) return Promise.resolve(this._program);

    return api
      .getFlipProgram(this.rpc)
      .then(
        (program) =>
          (this._program ??= (() => {
            // If there is not yet a known program, set it, log it, and return it.
            this.log(`Program retrieved for cluster: ${this.cluster}`);
            return program;
          })())
      )
      .catch((e) => {
        console.log(e, 'err loading program');
        this.dispatch(thunks.setLoading(false));
        throw ApiError.getFlipProgram();
      });
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
      return api.User.load(program, pubkey, TOKENMINT)
        .then(
          (user) =>
            (this._user ??= (() => {
              this.dispatch(thunks.setUser(user.state.toJSON()));
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
    // If there are already known user accounts, do not set up new accounts.
    if (user?.publicKey) {
      this.dispatch(thunks.setLoading(false));
      //@ts-ignore
      return this.log(`User account is already set up.`);
      // .then(() => this.playPrompt());
    }

    this.dispatch(thunks.setLoading(true));
    // console.log('here')

    // Gather necessary programs.
    const program = await this.program;
    const anchorProvider = new anchor.AnchorProvider(program.provider.connection, this.wallet, {});
    const switchboard = await api.loadSwitchboard(anchorProvider);
    // console.log(switchboard, 'swb')

    // this.log(`Checking if user needs airdrop...`);
    // api.verifyPayerBalance(program.provider.connection, anchorProvider.publicKey);

    // If there are no known user accounts, begin accounts set up.
    this.log(`Building user accounts...`);
    const rewardAddress = await spl.getAssociatedTokenAddress(TOKENMINT, anchorProvider.publicKey, true);
    const accountInfo = await spl.getAccount(anchorProvider.connection, rewardAddress).catch((err) => console.log(err));

    const [userKey, userInitTxns] = await api.User.createReq(
      program,
      switchboard,
      TOKENMINT,
      anchorProvider.publicKey,
      accountInfo?.isInitialized || false
    );

    const blockhash = await program.provider.connection.getLatestBlockhash();
    const packed = userInitTxns.map((txn) => txn.toTxn(blockhash));
    const signedTxs = await this.wallet.signAllTransactions(packed);

    const sigs: string[] = [];
    // await this.packSignAndSubmit(request.ixns, request.signers);

    // Try to load the new user accounts.

    for (let k = 0; k < packed.length; k += 1) {
      // console.log('executing tx no. ', k);
      // console.log(signedTxs[k]?.instructions.length, ' instruction length for k = ',k)
      // console.log(signedTxs[k]?.instructions[1]?.programId?.toBase58(), ' tx ', k)
      // if (k == 1)
      //   signedTxs[k].instructions.map((item, idx) => {
      //     console.log('keys for instruction ', idx, ' of k=', k);
      //     if (idx == 1)
      //       item.keys.map((key, i) => {
      //         if (i == 0) console.log('user key');
      //         if (i == 1) console.log('house key');
      //         if (i == 2) console.log('mint key');
      //         if (i == 3) console.log('authority key');
      //         if (i == 4) console.log('escrow key');
      //         if (i == 5) console.log('reward_address key');
      //         if (i == 6) console.log('vrf key');
      //         if (i == 7) console.log('payer key');
      //         console.log(key.pubkey.toBase58(), ' key ', i, ' of ', item.keys.length);
      //       });
      //   });
      const sig = await program.provider.connection
        .sendRawTransaction(
          signedTxs[k].serialize(),
          // req.signers,
          {
            skipPreflight: false,
            maxRetries: 10,
          }
        )
        .catch((e) => {
          console.log(e, 'error signing instruction');
          if (e instanceof ApiError) throw e;
        });
      // console.log(sig, 'signed tx ', k);
      if (sig)
        await program.provider.connection.confirmTransaction(sig).catch((e) => {
          console.log(e, 'error confirming transaction');
          if (e instanceof ApiError) throw e;
        });
      if (sig) sigs.push(sig);
      // console.log('sleeping for a sec');
      await sleep(500);
    }

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
                  this.dispatch(thunks.setUser(user.state.toJSON()));
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
    this.dispatch(thunks.setLoading(true));
    this.log('Draining vault...');
    const payerPubkey = this.wallet.publicKey;
    const program = await this.program;
    const ixns: TransactionInstruction[] = [];
    const house = await House.load(program, TOKENMINT);
    const associatedTokenAcc = await getAssociatedTokenAddress(TOKENMINT, payerPubkey);
    ixns.push(
      SystemProgram.transfer({
        fromPubkey: payerPubkey,
        toPubkey: associatedTokenAcc,
        lamports: 0.002 * LAMPORTS_PER_SOL,
      })
    );
    ixns.push(createSyncNativeInstruction(associatedTokenAcc, spl.TOKEN_PROGRAM_ID));
    ixns.push(
      await (
        await this.program
      ).methods
        .drain()
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
    );

    await this.packSignAndSubmit(ixns, []);
  };

  // get vault info
  private Vault = async () => {
    this.dispatch(thunks.setLoading(true));
    this.log('Getting vault info...');
    const program = await this.program;
    const house = await House.load(program, TOKENMINT);
    // const associatedTokenAcc = await getAssociatedTokenAddress(TOKENMINT, payerPubkey);
    const data = await program.provider.connection
      .getParsedAccountInfo(house.state.houseVault)
      .catch((err) => console.log(err, 'error getting token acc info'));
    // console.log(data?.value?.data?.parsed?.info?.tokenAmount?.uiAmount, 'data')
    //@ts-ignore
    const vault_amount = data?.value?.data?.parsed?.info?.tokenAmount?.uiAmount;
    if (vault_amount > 0) {
      this.dispatch(thunks.setVaultBalance(vault_amount));
      this.log('Vault Balance Loaded');
    }
  };

  /**
   * Play the game.
   */
  private playGame = async (args: string[]) => {
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
    console.log(bet, this.userBalance, 'comparing');
    if (_.isUndefined(bet) || bet <= 0 || bet > 2 || bet > this.userBalance - 0.004) {
      // Bet must be a positive number that's less than the user's balance.
      this.dispatch(thunks.setLoading(false));
      throw ApiError.badBet();
    }

    this.log(`Building bet request...`);
    this.log(`Bet Amount: ${bet}`);

    this.dispatch(thunks.setResult({ status: 'waiting' }));
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
        this.userRibsBalance
      )
      .catch((err) => {
        this.dispatch(thunks.setResult({ status: 'error' }));
        console.log(err, 'err creating bet req');
      });
    // console.log(request.ixns, 'ixns')
    // request.ixns.map((item, idx) => {
    //   item.keys.map((key, i) => {
    //     console.log(key.pubkey.toBase58(), ' req key ',i)
    //   })
    // })

    if (request) await this.packSignAndSubmit(request.ixns, request.signers);
    // this.dispatch(thunks.setLoading(false));
  };

  private packSignAndSubmit = async (ixns: anchor.web3.TransactionInstruction[], signers: anchor.web3.Signer[]) => {
    this.dispatch(thunks.setLoading(true));
    const program = await this.program;
    const packed = await sbv2.packTransactions(
      program.provider.connection,
      [new anchor.web3.Transaction().add(...ixns)],
      signers as anchor.web3.Keypair[],
      this.wallet.publicKey
    );

    // console.log(packed[0].instructions, 'packed')
    // packed[0].instructions.map((item, idx) => {
    //   item.keys.map((key, i) => {
    //     console.log(key.pubkey.toBase58(), ' key ',i)
    //   })
    // })

    // Sign transactions.
    this.log(`Requesting user signature...`);
    const signed = await this.wallet
      .signAllTransactions(packed)
      .then((signed) => {
        this.log(`Awaiting network confirmation...`);
        console.log(signed, 'signed');
        return signed;
      })
      .catch((e) => {
        this.dispatch(thunks.setResult({ status: 'error' }));
        this.dispatch(thunks.setLoading(false));
        console.error(e);
        this.dispatch(thunks.setLoading(false));
        throw ApiError.walletSignature();
      });

    // Submit transactions and await confirmation
    for (const tx of signed) {
      await program.provider.connection
        .sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 20 })
        .then((sig) => {
          // this.dispatch(thunks.setLoading(false));
          console.log(sig, '    signature tx');
          program.provider.connection.confirmTransaction(sig);
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
          } else {
            console.error(e);
            this.dispatch(thunks.setLoading(false));
            throw ApiError.general('An error occurred while sending transaction.');
          }
        });
    }
  };

  /**
   * Fetches the user's current SOL balance.
   */
  private watchUserAccounts = async () => {
    const onSolAccountChange = (account: anchor.web3.AccountInfo<Buffer> | null) => {
      this.dispatch(thunks.setUserBalance({ sol: account ? account.lamports / LAMPORTS_PER_SOL : undefined }));
    };
    const onRibsAccountChange = (account: anchor.web3.AccountInfo<Buffer> | null) => {
      // console.log(account, 'acc')
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
      // console.log(
      //   rawAccount,
      //   'rawAccount',
      //   rawAccount.mint.toBase58(),
      //   'mint',
      //   Number(rawAccount.amount) / RIBS_PER_RACK,
      //   'amount'
      // );
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
    // console.log(user.state.rewardAddress.toBase58(), 'reward adress');
    await program.provider.connection.getAccountInfo(this.wallet.publicKey).then(onSolAccountChange);
    await program.provider.connection.getAccountInfo(user.state.rewardAddress).then(onRibsAccountChange);

    // Listen for account changes.
    this.accountChangeListeners.push(
      ...[
        program.provider.connection.onAccountChange(this.wallet.publicKey, onSolAccountChange),
        program.provider.connection.onAccountChange(user.state.rewardAddress, onRibsAccountChange),
      ]
    );

    // Watch user object
    await user.watch(
      /* betPlaced= */ async (event) => {
        const bet = event.betAmount.div(new anchor.BN(RIBS_PER_RACK));
        await this.log(`BetPlaced: User bet ${bet} on number ${event.guess}`);
        await this.log(`Awaiting result from vrf... [ ${user.state.vrf.toBase58()} ]`);
      },
      /* betSettled= */ async (event) => {
        let multiplier = [
          0.0, 0.8, 0.8, 0.0, 2.0, 0.8, 0.8, 0.3, 0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.8, 8.0, 1.0, 0.0, 0.0, 0.3, 0.0, 0.3,
          1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.3, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 1.0, 0.0, 0.0, 0.3, 1.0, 0.8,
          1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0, 10.0, 0.3, 5.0, 0.8, 0.8, 0.8, 0.0, 1.0, 0.8,
          0.0, 2.0, 0.0, 0.8, 0.0, 0.8, 0.0, 0.0, 0.8, 0.8, 0.0, 0.8, 0.8, 1.0, 0.0, 0.8, 0.0, 0.8, 2.0, 10.0, 0.8, 0.0,
          1.0, 0.8, 0.0, 0.0, 1.0, 0.3, 0.0, 2.0, 1.0, 5.0, 2.0, 0.8, 0.0, 1.0, 0.0, 0.8, 0.8, 1.0, 2.0, 0.3, 8.0, 0.8,
          0.3, 0.8, 10.0, 0.0, 1.0, 0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.8, 2.0, 0.8, 0.0,
          1.0, 0.8, 0.0, 8.0, 5.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.3, 0.0, 0.8, 0.0, 0.0, 10.0, 1.0, 0.8, 0.0, 0.8,
          0.0, 0.0, 0.8, 2.0, 2.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.8, 0.8, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.8, 0.0,
          0.0, 0.3, 0.3, 0.8, 0.0, 0.0, 10.0, 2.0, 0.0, 0.0, 1.0, 1.0, 2.0, 5.0, 0.0, 0.0, 0.8, 0.0, 0.8, 2.0, 1.0, 0.8,
          0.0, 0.3, 0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.0,
          0.0, 0.0, 5.0, 0.0, 0.0, 0.8, 0.3, 0.0, 0.8, 0.0, 0.8, 0.0, 0.8, 2.0, 0.3, 0.8, 0.8, 0.8, 0.0, 0.0, 0.0, 0.0,
          1.0, 1.0, 0.8, 2.0, 0.0, 0.8, 0.0, 0.0, 0.0, 1.0, 0.3, 0.8, 1.0, 0.0, 0.0, 10.0, 0.0, 0.3, 0.3, 0.8, 2.0, 0.3,
          0.0, 1.0, 0.8, 0.8, 0.3, 2.0, 0.8, 0.8, 1.0, 0.0, 0.8, 0.3, 0.8, 0.0, 0.3, 2.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 1.0, 0.8, 0.0, 1.0, 0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0, 5.0, 0.8, 0.8, 0.0, 1.0, 0.0, 0.8, 1.0, 1.0,
          2.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.8, 1.0, 1.0, 0.0, 1.0, 0.3, 0.0, 10.0, 0.8, 0.0, 0.8, 0.8, 0.0, 2.0, 1.0, 0.0,
          0.0, 0.8, 2.0, 0.0, 0.8, 0.0, 1.0, 0.3, 0.0, 0.0, 0.8, 0.8, 0.8, 0.0, 2.0, 0.8, 5.0, 0.8, 0.8, 0.3, 0.0, 0.0,
          0.3, 0.0, 0.8, 0.0, 2.0, 0.0, 0.8, 0.0, 0.8, 0.3, 5.0, 0.8, 1.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.8, 0.8, 0.0,
          0.0, 0.8, 0.8, 0.8, 0.3, 0.0, 0.3, 0.0, 0.0, 0.8, 8.0, 0.0, 1.0, 0.0, 0.0, 5.0, 0.3, 0.0, 0.8, 5.0, 0.3, 5.0,
          1.0, 0.0, 0.0, 0.3, 1.0, 0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 1.0, 0.8, 1.0,
          0.0, 0.0, 2.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.8, 0.8, 0.0, 0.0, 0.0, 0.3, 1.0, 2.0, 0.0, 0.8, 0.0, 2.0, 0.0, 0.0,
          1.0, 0.8, 0.0, 0.8, 50.0, 0.0, 1.0, 0.8, 0.8, 0.0, 0.3, 10.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.8, 1.0, 0.0,
          5.0, 0.0, 0.0, 0.8, 2.0, 0.3, 0.3, 0.3, 0.0, 0.0, 1.0, 0.8, 0.0, 0.8, 0.8, 0.0, 0.3, 0.8, 0.3, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 8.0, 0.0, 0.0, 0.0, 0.8, 0.8, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0,
          0.3, 0.0, 0.0, 0.8, 0.0, 0.8, 2.0, 1.0, 0.3, 0.3, 1.0, 1.0, 0.0, 0.8, 2.0, 0.8, 0.8, 10.0, 0.8, 0.3, 1.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 8.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 2.0, 1.0, 0.0, 0.8, 0.0, 2.0, 8.0, 0.8,
          0.8, 1.0, 0.0, 0.3, 0.0, 0.0, 0.8, 5.0, 0.0, 0.3, 0.0, 1.0, 0.3, 0.3, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.8,
          1.0, 0.0, 5.0, 0.8, 0.3, 0.3, 0.8, 0.8, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 2.0, 1.0, 0.8, 1.0, 0.0, 2.0, 0.0, 0.3,
          0.3, 0.3, 0.3, 0.0, 2.0, 0.0, 0.3, 0.0, 0.0, 0.3, 0.0, 10.0, 0.8, 0.3, 0.0, 0.0, 0.3, 0.0, 0.8, 0.8, 0.0, 0.8,
          25.0, 0.0, 0.0, 5.0, 0.8, 0.8, 1.0, 0.8, 0.3, 0.0, 0.3, 0.0, 0.8, 0.8, 0.3, 0.8, 0.0, 0.3, 0.0, 0.0, 0.0, 0.3,
          0.0, 0.8, 0.3, 0.3, 0.8, 0.0, 0.8, 0.0, 0.0, 1.0, 0.8, 0.0, 0.0, 0.8, 0.0, 0.0, 0.8, 0.0, 10.0, 0.0, 0.0, 0.0,
          0.8, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 0.8, 0.8, 0.0, 0.3, 0.0, 0.0, 0.0, 0.3, 1.0, 0.8, 0.0, 0.0, 0.8, 0.0,
          0.0, 0.0, 1.0, 0.8, 0.0, 0.0, 2.0, 2.0, 0.0, 2.0, 0.8, 0.0, 0.0, 0.0, 0.8, 0.3, 0.3, 1.0, 0.3, 0.0, 0.0, 0.0,
          0.8, 0.3, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.3, 0.3, 0.0, 0.8, 0.8, 2.0, 0.0, 0.8, 0.0, 0.8, 0.0, 0.0, 1.0, 10.0,
          0.8, 0.8, 0.8, 0.0, 10.0, 0.8, 0.8, 1.0, 1.0, 0.0, 0.8, 0.0, 1.0, 0.3, 0.0, 0.8, 1.0, 2.0, 0.3, 0.0, 0.3, 0.8,
          0.8, 2.0, 0.0, 0.0, 0.8, 0.0, 0.8, 0.0, 0.8, 0.8, 0.0, 1.0, 0.8, 0.8, 0.0, 1.0, 0.0, 0.8, 0.0, 0.8, 0.0, 0.8,
          0.0, 1.0, 0.8, 0.8, 0.0, 0.0, 0.8, 0.0, 0.3, 0.3, 0.0, 0.0, 0.8, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
          5.0, 0.0, 1.0, 0.8, 0.0, 1.0, 0.0, 0.8, 1.0, 2.0, 0.0, 0.0, 0.8, 0.3, 0.8, 0.0, 0.8, 1.0, 0.0, 0.8, 0.8, 0.0,
          0.0, 0.3, 0.0, 0.3, 0.3, 0.0, 0.8, 2.0, 0.0, 2.0, 0.8, 0.8, 0.0, 0.0, 0.0, 2.0, 0.8, 5.0, 0.0, 2.0, 0.0, 25.0,
          2.0, 0.0, 0.8, 0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0, 0.0, 10.0, 0.0, 0.3, 1.0, 0.0, 0.8, 0.0, 1.0, 0.3, 1.0,
          0.8, 0.3, 0.3, 0.3, 1.0, 0.0, 0.0, 0.8, 0.3, 0.0, 0.0, 0.3, 1.0, 2.0, 0.0, 0.8, 0.0, 1.0, 0.8, 1.0, 2.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 1.0, 1.0, 10.0, 0.0, 0.0, 0.0, 2.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.8, 5.0, 0.0,
          0.3, 0.3, 1.0, 8.0, 0.0, 0.0, 0.8, 10.0, 1.0, 0.0, 0.0, 0.0, 0.8, 1.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.8, 0.0, 5.0,
          0.0, 0.3, 8.0, 1.0, 0.3, 0.8, 1.0, 0.3, 0.8, 0.8, 0.0, 5.0, 0.0, 0.0, 0.8, 0.8, 0.0, 0.0, 0.0, 0.3, 0.0, 0.3,
          2.0, 1.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.8, 2.0, 1.0, 0.8, 1.0, 1.0, 0.8, 0.8, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
          0.8, 0.0, 0.0, 0.3, 1.0, 0.8, 2.0, 0.3, 0.3, 0.8, 1.0, 2.0, 0.0, 0.0, 0.0, 10.0, 0.0, 0.0, 0.8, 0.3, 1.0, 0.8,
          0.0, 2.0, 0.8, 0.8, 0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.8, 1.0, 0.8, 0.8, 0.0, 0.8, 0.0,
          1.0, 0.8, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.8, 1.0, 0.0, 0.8, 0.8, 0.8, 0.8, 0.0, 0.3, 0.0, 0.3, 0.0, 1.0,
          0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.8, 0.8, 0.0, 0.0, 5.0, 0.3, 0.0, 0.0, 2.0, 0.0, 1.0, 0.0, 1.0, 0.3, 0.3, 0.0,
          0.0, 0.8, 0.0, 0.0, 0.8, 0.0, 0.0, 0.8, 0.0, 0.0, 0.3, 0.0, 0.3, 0.0, 1.0, 1.0, 1.0, 0.0, 0.3, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.8, 0.8, 0.0, 2.0, 0.0, 0.0, 0.8, 0.8, 0.8, 0.8, 10.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.8, 0.8, 0.0, 0.0,
          1.0, 0.0, 0.8, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.8, 0.8, 0.0, 0.0, 0.8, 0.0, 0.8, 0.8, 0.8, 0.8,
          1.0, 1.0, 0.3, 0.0, 0.8, 0.0, 1.0, 0.3, 0.0, 8.0, 0.0, 0.0, 0.3, 0.3, 0.8, 0.0, 0.3, 0.0, 0.8, 0.3, 0.3, 0.0,
          1.0, 1.0, 0.0, 1.0, 0.8, 1.0, 0.0, 0.3, 10.0, 0.0, 0.0, 0.8, 0.3, 0.0, 0.8, 0.0, 0.8, 0.0, 0.0, 0.0, 2.0, 1.0,
          0.0, 2.0, 0.0, 1.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.3, 0.0, 0.0, 0.0, 1.0, 0.8, 0.0, 0.3, 0.0, 0.8, 0.8, 0.3,
          0.0, 1.0, 5.0, 0.0, 8.0, 0.0, 2.0, 0.0, 0.0, 0.8, 0.0, 2.0, 0.0, 0.0, 0.8, 0.0, 0.8, 0.0, 5.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0, 2.0, 0.8, 1.0, 0.8, 1.0, 0.8, 0.3, 0.0, 25.0, 0.3,
          1.0, 0.0, 0.3, 0.3, 1.0, 0.3, 0.8, 1.0, 2.0, 0.0, 0.0, 0.8, 0.3, 0.8, 0.0, 0.0, 1.0, 0.8, 0.8, 0.3, 0.8, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0, 0.0, 0.8, 0.8, 0.0, 0.3, 0.3, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.3,
          1.0, 0.8, 1.0, 0.8, 10.0, 0.0, 0.0, 0.8, 0.8, 0.3, 0.8, 0.0, 10.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 10.0, 0.8,
          10.0, 0.8, 2.0, 0.8, 1.0, 0.8, 1.0, 0.0, 1.0, 0.8, 1.0, 0.8, 0.8, 0.0, 2.0, 0.3, 0.0, 0.8, 0.3, 1.0, 0.0, 1.0,
          0.8, 0.0, 0.8, 0.0, 0.0, 0.8, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 0.8, 5.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 10.0, 0.8,
          2.0, 0.8, 0.8, 0.8, 0.0, 1.0, 0.8, 0.8, 2.0, 1.0, 0.3, 0.0, 0.0, 0.8, 1.0, 0.8, 0.0, 0.0, 0.8, 0.8, 0.0, 0.0,
          1.0, 0.8, 0.3, 0.8, 5.0, 1.0, 0.0, 0.0, 0.0, 0.8, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.0, 0.0, 1.0, 0.8, 1.0,
          0.0, 0.0, 0.8, 0.8, 0.0, 0.8, 0.8, 0.8, 0.8, 0.0, 0.0, 0.8, 0.0, 0.0, 0.8, 0.0, 0.0, 0.8, 0.8, 0.8, 0.0, 0.8,
          0.0, 2.0, 0.3, 0.8, 1.0, 0.0, 0.8, 0.3, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 2.0, 10.0, 0.0,
          0.0, 0.8, 0.8, 1.0, 5.0, 0.0, 0.8, 0.0, 2.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.0, 2.0, 0.3, 1.0, 1.0, 0.3, 0.8,
          0.8, 0.8, 0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.8, 0.8, 1.0, 0.0, 1.0, 1.0, 0.8, 5.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.8, 0.8, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.3, 0.0, 8.0, 25.0, 0.3, 0.8,
          100.0, 0.3, 0.0, 2.0, 0.8, 0.0, 0.8, 0.0, 0.0, 0.8, 2.0, 0.0, 0.8, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0,
          0.3, 10.0, 0.3, 0.3, 0.3, 0.8, 0.8, 10.0, 0.0, 0.0, 0.0, 0.8, 0.3, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.8, 8.0, 0.8, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.3, 0.0, 0.8, 1.0, 0.3, 0.8,
          0.0, 0.3, 10.0, 0.8, 0.3, 0.0, 0.8, 2.0, 0.0, 0.3, 0.0, 0.0, 0.8, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.8, 0.8,
          0.8, 0.3, 0.3, 0.0, 0.3, 10.0, 2.0, 0.8, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.8, 0.0, 0.8, 0.0, 0.0, 0.0, 8.0, 0.0,
          2.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.3, 0.8, 0.0, 0.0, 1.0, 10.0, 0.0, 0.8, 0.8, 1.0, 1.0, 0.0, 0.0, 0.8, 1.0, 0.0,
          0.0, 0.3, 0.8, 2.0, 0.0, 0.8, 1.0, 0.8, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.8, 0.8, 0.3, 0.0, 0.8, 0.0, 1.0,
          0.3, 0.0, 1.0, 0.0, 0.8, 0.8, 0.3, 1.0, 0.8, 1.0, 0.0, 0.3, 1.0, 1.0, 0.0, 0.8, 1.0, 10.0, 0.0, 0.0, 0.8, 0.0,
          0.0, 0.8, 0.0, 0.8, 0.3, 0.8, 0.8, 0.3, 0.0, 0.8, 0.0, 0.0, 0.8, 0.0, 0.0, 0.0, 1.0, 0.0, 0.3, 0.0, 1.0, 0.8,
          1.0, 0.8, 1.0, 1.0, 1.0, 0.8, 0.0, 0.0, 0.0, 1.0, 0.8, 8.0, 0.8, 0.0, 0.8, 0.8, 0.8, 0.0, 0.0, 0.0, 10.0, 0.0,
          1.0, 0.8, 0.8, 10.0, 1.0, 0.0, 0.8, 0.0, 0.0, 0.0, 10.0, 1.0, 2.0, 0.8, 0.8, 0.3, 0.0, 0.3, 0.8, 0.0, 2.0,
          0.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.0, 0.0, 5.0, 0.0, 1.0, 1.0, 0.0, 10.0, 0.0, 0.0, 1.0, 5.0, 0.0, 0.0, 0.0, 1.0,
          0.8, 0.0, 0.0, 5.0, 1.0, 2.0, 10.0, 2.0, 0.0, 0.3, 0.0, 2.0, 0.0, 0.8, 0.8, 0.8, 1.0, 0.8, 1.0, 0.8, 0.0, 0.0,
          10.0, 0.3, 0.8, 1.0, 0.0, 0.8, 0.0, 0.0, 1.0, 0.0, 1.0, 8.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0, 0.0,
          1.0, 0.0, 0.0, 2.0, 1.0, 0.0, 0.8, 2.0, 1.0, 0.3, 8.0, 0.8, 1.0, 0.3, 0.3, 0.8, 2.0, 0.3, 0.3, 1.0, 1.0, 0.0,
          0.8, 0.8, 0.0, 0.8, 0.8, 0.0, 2.0, 0.3, 0.8, 0.8, 0.8, 0.8, 0.0, 0.0, 0.8, 0.8, 0.0, 0.0, 0.8, 0.0, 0.8, 0.8,
          0.0, 0.0, 0.8, 1.0, 0.0, 0.0, 0.0, 0.8, 0.3, 0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 0.3, 1.0, 1.0, 0.3, 0.0, 0.8,
          0.8, 2.0, 0.8, 0.0, 0.8, 0.3, 1.0, 0.8, 5.0, 0.0, 0.8, 0.0, 0.8, 0.8, 0.0, 2.0, 0.0, 0.8, 0.0, 0.8, 1.0, 0.8,
          1.0, 2.0, 0.8, 0.0, 1.0, 0.0, 0.3, 1.0, 0.8, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.0, 0.0, 0.8, 0.8, 0.3, 5.0,
          0.0, 0.8, 0.0, 0.3, 0.0, 0.3, 0.0, 0.8, 0.8, 0.0, 0.8, 1.0, 0.8, 0.3, 1.0, 1.0, 0.8, 0.0, 1.0, 0.8, 0.8, 0.0,
          1.0, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 5.0, 0.8, 0.0, 0.8, 8.0, 0.0, 0.8, 0.8, 0.8, 0.8, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 1.0, 0.8, 0.0, 0.0, 0.0, 10.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.3, 0.8, 0.0, 0.3, 1.0, 0.0, 0.0, 0.3,
          0.0, 1.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.8, 2.0, 0.8, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
          0.0, 0.8, 0.0, 0.8,
        ];
        console.log(
          event,
          'bet settled event',
          event.escrowChange.toString(),
          'escrow change',
          event.result.toString(),
          'result'
        );
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
      }
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
    // console.log(severity, 'severity')
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
      if (this.userBalance < 0.01) {
        // If user balance is under 1 - request that they airdrop.
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
  const wallet = useConnectedWallet();
  const gameState = useSelector((store: Store) => store.gameState);
  const result = useSelector((store: Store) => store.gameState.result);
  const [stateWallet, setStateWallet] = React.useState(wallet);

  // The api is rebuilt only when the connected pubkey changes
  const api = React.useMemo(
    () => (stateWallet ? new ApiState(stateWallet, dispatch) : new NoUserApiState(dispatch)),
    [stateWallet, dispatch]
  );

  // If a new wallet has been set, dispose of the old api object and set the new wallet state.
  React.useEffect(() => {
    if (wallet !== stateWallet) api.dispose().then(() => setStateWallet(wallet));
  }, [api, wallet, stateWallet]);

  React.useEffect(() => {
    if (api instanceof ApiState) api.gameState = gameState;
  }, [api, gameState]);

  return <ApiContext.Provider value={api} children={props.children} />;
};

/**
 * Expose {@linkcode ApiContext} to the children
 */
export default useApi;
