import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token-v2';
import { PublicKey } from '@solana/web3.js';
import { AnchorWallet, QueueAccount, SwitchboardProgram } from '@switchboard-xyz/solana.js';
import { PROGRAM_ID_CLI } from './generated/programId';
import { FlipProgram } from './types';
import { User } from './user';
import Big from 'big.js';

const DEFAULT_COMMITMENT = 'confirmed';

export const defaultRpcForCluster = (cluster: anchor.web3.Cluster | 'localnet') => {
  switch (cluster) {
    case 'mainnet-beta':
      return 'https://warmhearted-greatest-emerald.solana-mainnet.quiknode.pro/2b6bcf328ed2611d4d293c2aaa027f3139acb0af/';
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'localnet':
      return 'http://localhost:8899';
    default:
      throw new Error(`Failed to find RPC_URL for cluster ${cluster}`);
  }
};

export interface FlipUser {
  keypair: anchor.web3.Keypair;
  switchboardProgram: SwitchboardProgram;
  switchTokenWallet: anchor.web3.PublicKey;
  user: User;
}

export async function getFlipProgram(rpcEndpoint: string): Promise<FlipProgram> {
  const programId = new anchor.web3.PublicKey(PROGRAM_ID_CLI);
  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(rpcEndpoint, { commitment: DEFAULT_COMMITMENT }),
    new AnchorWallet(anchor.web3.Keypair.generate()),
    { commitment: DEFAULT_COMMITMENT }
  );

  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) throw new Error(`Failed to find IDL for program [ ${programId.toBase58()} ]`);

  return new anchor.Program(idl, programId, provider, new anchor.BorshCoder(idl));
}

export async function createFlipUser(
  userWallet: anchor.AnchorProvider,
  TOKENMINT: PublicKey,
  program: FlipProgram,
  queueAccount: QueueAccount,
  wSolAmount = 0.2
): Promise<FlipUser> {
  const switchboardProgram = queueAccount.program;

  const keypair = anchor.web3.Keypair.generate();
  const loadUser = await User.load(program, userWallet.wallet.publicKey, TOKENMINT).catch((err) =>
    console.log(err, 'user account doesnt exist yet')
  );
  if (!loadUser) {
    const airdropTxn = await program.provider.connection.requestAirdrop(
      keypair.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await program.provider.connection.confirmTransaction(airdropTxn);
  }

  const provider = new anchor.AnchorProvider(switchboardProgram.provider.connection, new AnchorWallet(keypair), {});
  const flipProgram = new anchor.Program(program.idl, program.programId, provider);

  const newSwitchboardProgram = new SwitchboardProgram(
    await SwitchboardProgram.loadAnchorProgram(
      switchboardProgram.cluster,
      switchboardProgram.connection,
      keypair,
      switchboardProgram.programId
    ),
    switchboardProgram.cluster,
    switchboardProgram.mint
  );

  const [switchTokenWallet] = await newSwitchboardProgram.mint.getOrCreateWrappedUser(keypair.publicKey, {
    fundUpTo: wSolAmount,
  });

  const switchTokenWallet2 = await spl.getAssociatedTokenAddress(TOKENMINT, userWallet.wallet.publicKey);
  if (loadUser) {
    return {
      keypair,
      switchboardProgram: newSwitchboardProgram,
      switchTokenWallet: switchTokenWallet2,
      user: loadUser,
    };
  } else {
    const user = await User.create(userWallet, flipProgram, newSwitchboardProgram, TOKENMINT);
    return {
      keypair,
      switchboardProgram: newSwitchboardProgram,
      switchTokenWallet,
      user,
    };
  }
}

export const tokenAmountToBig = (tokenAmount: anchor.BN, decimals = 9): Big => {
  const bigTokenAmount = new Big(tokenAmount.toString(10));

  const denominator = new Big(10).pow(decimals);
  const oldDp = Big.DP;
  Big.DP = 20;
  const result = bigTokenAmount.div(denominator);
  Big.DP = oldDp;
  return result;
};

export const verifyPayerBalance = async (
  connection: anchor.web3.Connection,
  payer: anchor.web3.PublicKey,
  minAmount = 0.1 * anchor.web3.LAMPORTS_PER_SOL,
  currentBalance?: number
): Promise<void> => {
  if (connection.rpcEndpoint === defaultRpcForCluster('devnet')) {
    connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'));
  }
  const payerBalance = currentBalance ?? (await connection.getBalance(payer));
  if (payerBalance > minAmount) {
    return console.log(
      `Payer has sufficient funds, ${payerBalance / anchor.web3.LAMPORTS_PER_SOL} > ${
        minAmount / anchor.web3.LAMPORTS_PER_SOL
      }`
    );
  }

  try {
    console.log(`Requesting airdrop for user ${payer.toBase58()}`);
    const AIRDROP_AMT = 1 * anchor.web3.LAMPORTS_PER_SOL;
    const airdropTxn = await connection.requestAirdrop(payer, AIRDROP_AMT);
    await connection.confirmTransaction(airdropTxn);
  } catch (error) {
    console.log(`Failed to request an airdrop`);
    console.error(error);
  }
};
