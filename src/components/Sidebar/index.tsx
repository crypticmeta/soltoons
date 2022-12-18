import React, { useEffect, useState } from 'react';
import * as sbv2 from '@switchboard-xyz/switchboard-v2';
import * as spl from '@solana/spl-token-v2';
import { hooks, Store, thunks } from '../../data';
import { useConnectedWallet, useWalletKit, useSolana } from '@gokiprotocol/walletkit';
import { useSelector } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Severity } from '../../util/const';
import * as anchor from 'anchor-24-2';
import Modal from '@mui/material/Modal';
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const WalletButton: React.FC = () => {
  const walletKit = useWalletKit();

  const wallet = useConnectedWallet();

  const dispatch = hooks.useThunkDispatch();
  const [hovered, setHovered] = React.useState(false);

  useEffect(() => {
    if (wallet?.connected) {
    }
  }, [wallet]);

  const disconnect = React.useCallback(() => {
    if (wallet) {
      dispatch(thunks.log({ message: `Disconnecting wallet ${wallet.publicKey.toBase58()}` }));
      wallet.disconnect();
    }
  }, [dispatch, wallet]);

  const content = React.useMemo(() => {
    if (wallet) {
      if (hovered) return 'Disconnect';

      const pubkey = wallet.publicKey.toBase58();
      const truncatedPubkey = `${pubkey.slice(0, 5)}...${pubkey.slice(-5)}`;
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{truncatedPubkey}</span>
        </div>
      );
    }
    return 'Connect Wallet';
  }, [wallet, hovered]);

  return (
    <div
      className="bg-brand_yellow border-4 rounded-3xl border-black w-full text-center py-2 cursor-pointer"
      onClick={wallet ? disconnect : walletKit.connect}
    >
      {content}
    </div>
  );
};
//@ts-ignore
function Sidebar({ amount, setAmount, step, setStep }) {
  const [open, setOpen] = React.useState(false);

   const [openModal, setOpenModal] = React.useState(false);
   const handleModalOpen = () => setOpenModal(true);
   const handleModalClose = () => setOpenModal(false);

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  const { providerMut } = useSolana();
  const wallet = useConnectedWallet();
  const api = hooks.useApi();
  const dispatch = hooks.useThunkDispatch();
  const logs = useSelector(({ HUDLogger }: Store) => HUDLogger.logs);
  const loading = useSelector((store: Store) => store.gameState.loading);
  const balances = useSelector((store: Store) => store.gameState.userBalances);
  const user = useSelector((store: Store) => store.gameState.user);
  const result = useSelector((store: Store) => store.gameState.result);
  const [userAccountExists, setUserAccountExists] = useState(true);
  useEffect(() => {
    // console.log(logs, 'LOGS');
    if (logs && logs[0]?.severity === 'error') {
      // alert(logs[0].message);
      if (logs[0].message.includes("User hasn't created an account")) setUserAccountExists(false);
      else setUserAccountExists(true);
    }
    handleClick();
  }, [logs]);

  useEffect(() => {
    // console.log(user, 'user in redux')
    if (user && user.authority) {
      setUserAccountExists(true);
    }
  }, [user]);

  useEffect(() => {
    let timer: any;
    if (result && result.status === 'waiting') {
      // console.log('starting timer');
      timer = setTimeout(() => {
        dispatch(thunks.setLoading(false));
        dispatch(thunks.log({ message: 'Failed to get result. Your funds are safe.', severity: Severity.Error }));
        dispatch(thunks.setResult({ status: 'error' }));
      }, 60000);
    } else if (result && result.status === 'success') {
      // console.log('clearing timeout')
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [dispatch, result]);

  const getReward = async () => {
    if (wallet && balances.ribs && providerMut) {
      try { 
        let ixns = [];
        dispatch(thunks.setLoading(true));
        // console.log(user.rewardAddress, 'user');
        ixns.push(
          spl.createCloseAccountInstruction(
            new anchor.web3.PublicKey(user.rewardAddress),
            wallet.publicKey,
            wallet.publicKey
          )
        );
        // ixns.push(createSyncNativeInstruction(wallet.publicKey, TOKEN_PROGRAM_ID));
        // console.log(ixns, 'instructions');
        const tx = new anchor.web3.Transaction().add(...ixns);
        const packed = await sbv2.packTransactions(
          providerMut.connection,
          [tx],
          [] as anchor.web3.Keypair[],
          wallet.publicKey
        );

        const signedTxs = await wallet.signAllTransactions(packed);
        // console.log('signedtxs');

        for (let k = 0; k < packed.length; k += 1) {
          const sig = await providerMut.connection
            .sendRawTransaction(
              signedTxs[k].serialize(),
              // req.signers,
              {
                skipPreflight: false,
                maxRetries: 10,
              }
            )
            .catch((e) => {
              dispatch(thunks.setLoading(false));
              dispatch(thunks.log({ message: 'Error converting wsol to sol. ', severity: Severity.Error }));
              console.log(e, 'error signing instruction');
            });
          console.log(sig, 'signed tx ', k);
          if (sig)
            await providerMut.connection.confirmTransaction(sig).catch((e) => {
              console.log(e, 'error confirming transaction');
              dispatch(thunks.setLoading(false));
              dispatch(thunks.log({ message: 'Error converting wsol to sol. ', severity: Severity.Error }));
              // dispatch(thunks.setResult({ status: 'claimed' }));
            });
          if (sig) console.log(sig, ' tx signature');
          if (sig) {
            handleModalClose()
            dispatch(thunks.setLoading(false));
            dispatch(thunks.log({ message: 'Successfully claimed funds. ', severity: Severity.Success }));
            dispatch(thunks.setResult({ status: 'claimed' }));
          }
        }
      }
      catch (e) {
        dispatch(thunks.setLoading(false));
        dispatch(thunks.log({ message: 'Error converting wsol to sol. ', severity: Severity.Error }));
        console.log(e, 'error')
      }
    }
  };

  useEffect(() => {
    console.log(step, result, 'step, rsult')
    if (result?.userWon && step === 3) {
      handleModalOpen();
    }
  }, [result, step])
  

  return (
    <div className="flex h-full flex-col max-h-[800px] justify-start md:justify-center w-full lg:w-3/12 p-6 font-bold">
      <div className="part1 h-[20%] center w-full">
        <WalletButton />
      </div>
      {/* <div className="part2 h-[50%] 2xl:h-[60%] bg-brand_yellow  border-4 border-black rounded-3xl p-2 text-sm overflow-hidden">
        <div className="flex justify-between font-extrabold h-[10%]">
          <p className="w-6/12 text-center border-r border-black xl:text-lg">LIVE CHAT</p>

          <p className="w-6/12 text-center xl:text-lg">LIVE BETS</p>
        </div>
        <hr className="my-2 border-black" />
        <div className="overflow-scroll h-[90%] no-scrollbar">
          <div>
            <p className="text-brand_pink capitalize">
              Seb: <span className="text-black"> I Love soltoons!</span>
            </p>
          </div>
          <hr className="my-2 border-black" />
          <div>
            <p className="text-brand_pink capitalize">
              raj:{' '}
              <span className="text-black">
                {' '}
                I Love soltoons! I love betting all of my money! It's time to win x2. Who else loves winning!?
              </span>
            </p>
          </div>
          <hr className="my-2 border-black" />
          <div>
            <p className="text-brand_pink capitalize">
              Neon: <span className="text-black"> Man! I wish I had more liquidity!!</span>
            </p>
          </div>
          <hr className="my-2 border-black" />
          <div>
            <p className="text-brand_pink capitalize">
              Joey: <span className="text-black"> WTF! I just tripledddddddd</span>
            </p>
          </div>
          <hr className="my-2 border-black" />
          <div>
            <p className="text-brand_pink capitalize">
              0xBert: <span className="text-black"> BOZOS</span>
            </p>
          </div>
          <hr className="my-2 border-black" />
          <div>
            <p className="text-brand_pink capitalize">
              Martha:{' '}
              <span className="text-black">
                {' '}
                I Love soltoons! I love betting all of my money! It's time to win x2. Who else loves winning!?
              </span>
            </p>
          </div>
          <hr className="my-2 border-black" />
          <div>
            <p className="text-brand_pink capitalize">
              Solami: <span className="text-black"> I Love soltoons!</span>
            </p>
          </div>
          <hr className="my-2 border-black" />
        </div>
      </div> */}

      <div className="part3 h-[35%] 2xl:h-[35%] bg-brand_yellow rounded-3xl border-4 border-black text-sm p-6 flex flex-col justify-between">
        {userAccountExists ? (
          <>
              <Play
                amount={amount}
                setAmount={setAmount}
                loading={loading}
                api={api}
                balances={balances}
                result={result}
              />
          </>
        ) : (
          <>
            {loading ? (
              <div className="center h-full text-white border-white">
                <CircularProgress color="inherit" />
              </div>
            ) : (
              <button
                onClick={() => {
                  api.handleCommand('user create');
                }}
                className="center h-full text-lg"
              >
                Create User Account
              </button>
            )}
          </>
        )}
      </div>
      <Modal open={openModal} onClose={handleModalClose}>
        <div className="bg-black w-full h-screen center bg-opacity-75">
          <div className="bg-brand_yellow md:w-6/12 2xl:w-4/12 p-6 text-xl">
            {loading ? (
              <div className="center h-full text-white border-white">
                <CircularProgress color="inherit" />
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-xl text-center font-extrabold pb-6 2xl:text-3xl">
                  {Number(result?.multiplier) >= 1
                    ? `Congrats! You Won ${result?.multiplier}X.`
                    : Number(result?.multiplier) < 1 && Number(result?.multiplier) > 0
                    ? `You got back ${result?.multiplier}X`
                    : 'You Lost'}
                </p>

                <div className="center space-x-4 flex-wrap text-sm md:text-xl">
                  <button
                    className="bg-yellow-600 border-2 rounded-3xl border-black uppercase font-extrabold px-4 py-2 cursor-pointer"
                    onClick={() => getReward()}
                  >
                    Collect Reward
                  </button>
                  <button
                    className="bg-red-600 text-white border-2 rounded-3xl border-black uppercase font-extrabold px-4 py-2 cursor-pointer"
                    onClick={() => handleModalClose()}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
      <Snackbar open={open} onClose={handleClose}>
        <Alert
          style={{ display: 'flex', alignItems: 'center' }}
          onClose={handleClose}
          severity={logs[0]?.severity === 'error' ? 'error' : 'info'}
          sx={{ width: '100%' }}
        >
          <p className="2xl:text-2xl">{logs[0]?.message}</p>
        </Alert>
      </Snackbar>
    </div>
  );
}

//@ts-ignore
const Play = ({amount, setAmount, api, balances, loading, result}) => {
  return (
    <>
      {loading && result?.status === 'waiting' ? (
        <div className="center h-full text-white border-white">
          <CircularProgress color="inherit" />
        </div>
      ) : (
        <>
          <div>
            <p className="font-extrabold text-center">INSERT BET AMOUNT</p>
            <hr className="my-2 border-black" />
          </div>
          <div className="flex text-3xl italic  ">
            <input
              className=" bg-brand_yellow text-black font-extrabold w-6/12 text-right italic focus:outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className=" ml-2 w-6/12">SOL</p>
          </div>
          <div>
            <button
              onClick={() => {
                api.handleCommand(`user play 1 ${amount}`);
              }}
              className="border-black  border-4 p-1 rounded-3xl w-full font-extrabold"
            >
              PLAY
            </button>
            <p className="text-xs text-gray-700 text-center">
              {Number(balances.sol || 0).toFixed(4)} sol{' '}
              <span className="pl-4">
                {Number(result && result.status === 'claimed' ? 0 : balances.ribs || 0).toFixed(4)} wsol
              </span>
            </p>
          </div>
        </>
      )}
    </>
  );
}
export default Sidebar;
