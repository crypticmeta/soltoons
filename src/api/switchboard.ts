import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import {
  AnchorWallet,
  QueueAccount,
  PermissionAccount,
  ProgramStateAccount,
  VrfAccount,
  SwitchboardProgram,
} from '@switchboard-xyz/solana.js';

export async function loadSwitchboard(provider: anchor.AnchorProvider): Promise<SwitchboardProgram> {
  const switchboardProgram = await SwitchboardProgram.load(
    process.env.REACT_APP_NETWORK === 'devnet' ? 'devnet' : 'mainnet-beta',
    provider.connection,
    ((provider as anchor.AnchorProvider).wallet as AnchorWallet).payer
  );

  return switchboardProgram;
}

export async function loadVrfContext(
  program: SwitchboardProgram,
  vrfPubkey: PublicKey
): Promise<{
  accounts: {
    vrfAccount: VrfAccount;
    programStateAccount: ProgramStateAccount;
    queueAccount: QueueAccount;
    permissionAccount: PermissionAccount;
  };
  bumps: {
    stateBump: number;
    permissionBump: number;
  };
  publicKeys: {
    vrf: PublicKey;
    vrfEscrow: PublicKey;
    switchboardProgram: PublicKey;
    oracleQueue: PublicKey;
    switchboardProgramState: PublicKey;
    queueAuthority: PublicKey;
    dataBuffer: PublicKey;
    permission: PublicKey;
  };
}> {
  const [vrfAccount, vrf] = await VrfAccount.load(program, vrfPubkey);

  const [queueAccount, queue] = await QueueAccount.load(program, vrf.oracleQueue);

  const programStateAccount = new ProgramStateAccount(program, program.programState.publicKey);

  const [permissionAccount, permissionBump] = PermissionAccount.fromSeed(
    program,
    queue.authority,
    queueAccount.publicKey,
    vrfPubkey
  );

  return {
    accounts: {
      vrfAccount,
      programStateAccount,
      queueAccount,
      permissionAccount,
    },
    bumps: { stateBump: program.programState.bump, permissionBump },
    publicKeys: {
      vrf: vrfAccount.publicKey,
      vrfEscrow: vrf.escrow,
      switchboardProgram: program.programId,
      oracleQueue: queueAccount.publicKey,
      switchboardProgramState: programStateAccount.publicKey,
      queueAuthority: queue.authority,
      dataBuffer: queue.dataBuffer,
      permission: permissionAccount.publicKey,
    },
  };
}
