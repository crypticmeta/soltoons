import * as anchor from "@project-serum/anchor";
import * as anchor24 from "anchor-24-2";
import { PublicKey } from "@solana/web3.js";
import {
  AnchorWallet,
  loadSwitchboardProgram,
  OracleQueueAccount,
  PermissionAccount,
  ProgramStateAccount,
  VrfAccount,
} from "@switchboard-xyz/switchboard-v2";

export async function loadSwitchboard(
  provider: anchor.AnchorProvider
): Promise<anchor24.Program> {
  const switchboardProgram = await loadSwitchboardProgram(
    process.env.REACT_APP_NETWORK == 'devnet' ? 'devnet' : "mainnet-beta",
    provider.connection,
    ((provider as anchor.AnchorProvider).wallet as AnchorWallet).payer
  );

  return switchboardProgram as any;
}

export async function loadVrfContext(
  program: anchor24.Program,
  vrfPubkey: PublicKey
): Promise<{
  accounts: {
    vrfAccount: VrfAccount;
    programStateAccount: ProgramStateAccount;
    queueAccount: OracleQueueAccount;
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
  const vrfAccount = new VrfAccount({
    program: program as any,
    publicKey: vrfPubkey,
  });
  const vrf = await vrfAccount.loadData();

  const [programStateAccount, stateBump] = ProgramStateAccount.fromSeed(
    program as any
  );

  const queueAccount = new OracleQueueAccount({
    program: program as any,
    publicKey: vrf.oracleQueue,
  });
  const queue = await queueAccount.loadData();

  console.log('keys passed to derive permission are: ')
  console.log("**************************")
  console.log(program.programId.toBase58(), 'program')
  console.log(queue.authority.toBase58(), 'authority')
  console.log(queueAccount.publicKey.toBase58(), 'queue')
  console.log(vrfPubkey.toBase58(), 'vrf')
  console.log("*************************")
  const [permissionAccount, permissionBump] = PermissionAccount.fromSeed(
    program as any,
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
    bumps: { stateBump, permissionBump },
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
