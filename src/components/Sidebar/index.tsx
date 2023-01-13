import React, { useEffect, useState } from 'react';
import { hooks, Store, thunks } from '../../data';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-material-ui';
// import { useConnectedWallet, useWalletKit } from '@gokiprotocol/walletkit';
import { useSelector } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Severity } from '../../util/const';
import Modal from '@mui/material/Modal';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import LinearProgress from '@mui/material/LinearProgress';
import useSound from 'use-sound';
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});


//@ts-ignore
function Sidebar({ amount, setAmount, step, setStep, handleModalClose, openModal }) {
    const [playLoading, stopLoading] = useSound('/assets/audio/loading.mp3', {
      volume: 0.7,
    });
    const [playWin, stopWin] = useSound('/assets/audio/win.mp3', {
      volume: 1,
    });
  const [playLose, stopLose] = useSound('/assets/audio/error.mp3', {
    volume: 1,
  });
  const [playReward, stopReward] = useSound('/assets/audio/reward.mp3', {
    volume: 1,
  });

  const [open, setOpen] = React.useState(false);

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  const api = hooks.useApi();
  const dispatch = hooks.useThunkDispatch();
  const logs = useSelector(({ HUDLogger }: Store) => HUDLogger.logs);
  const loading = useSelector((store: Store) => store.gameState.loading);
  const balances = useSelector((store: Store) => store.gameState.userBalances);
  const user = useSelector((store: Store) => store.gameState.user);
  const result = useSelector((store: Store) => store.gameState.result);
  const userVaultBal = useSelector((store: Store) => store.gameState.userVaultBalance);
  const [userAccountExists, setUserAccountExists] = useState(true);
  const [lastGameStatus, setLastGameStatus] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (step === 3) {
      stopLoading.stop();
    }
  }, [step])
  
  useEffect(() => {
    if (logs && logs[0]?.severity === 'error') {
      // alert(logs[0].message);
      if (logs[0].message.includes("User hasn't created an account")) setUserAccountExists(false);
      else setUserAccountExists(true);
    }
    handleClick();
  }, [logs]);

  useEffect(() => {
    if (user && user.authority) {
      setUserAccountExists(true);
      setLastGameStatus(user.currentRound.status.kind);
    }
  }, [user]);

  useEffect(() => {
    let timer: any;
    if (result && result.status === 'waiting') {
      setWait(1);
      timer = setTimeout(() => {
        dispatch(thunks.setLoading(false));
        dispatch(thunks.log({ message: 'Failed to get result. Your funds are safe.', severity: Severity.Error }));
        dispatch(thunks.setResult({ status: 'error' }));
      }, 100000);
    } else if (result && result.status === 'success') {
      clearTimeout(timer);
    } else if (result && result.status === 'claimed') {
      handleModalClose();
    }
    return () => clearTimeout(timer);
  }, [dispatch, handleModalClose, result]);

  useEffect(() => {
    let interval: any;
    if (result.status === 'waiting' && wait < 100) {
      interval = setInterval(() => {
        setWait(wait + 1);
      }, 1000);
    } else {
      setWait(0);
      clearInterval(interval);
    }
    return () => {
      clearInterval(interval);
    };
  }, [result, wait]);

  useEffect(() => {
    if (result && result?.status === 'waiting') {
      playLoading();
    } else if (result?.status === 'success') {
      if (result.userWon) {
       
      } else {
        stopLoading.stop();
        playLose();
      }
    } else if (result?.status === 'claimed') {
      stopLoading.stop();
      playReward();
      setTimeout(() => {
        stopReward.stop();
      }, 1500);
    } else if (result?.status === 'error' && !loading) {
      stopLoading.stop();
      playLose();
    } else {
      stopLoading.stop();
    }
  }, [result]);

  return (
    <div className="flex h-full flex-col max-h-[800px] justify-start md:justify-center w-full lg:w-3/12 p-6 font-bold">
      <div className="part1 h-[20%] center w-full">
        <div className="bg-brand_yellow walletMultiButton">
          <WalletMultiButton color="inherit" className={'walletButton'} />
        </div>
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
            {step === 0 && userVaultBal > 0.0362616 && !result?.status && lastGameStatus.includes('Settled') ? (
              <>
                <button
                  onClick={() => {
                    api.handleCommand('collect reward');
                  }}
                  className="center h-full text-lg"
                >
                  Collect Reward
                </button>
              </>
            ) : (
              <Play
                  amount={amount}
                  setAmount={setAmount}
                  loading={loading}
                  api={api}
                  balances={balances}
                  result={result}
                  wait={wait}
                  userVaultBal={ userVaultBal}
              />
            )}
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
      {wait > 0 && (
        <div className="bg-red-00 w-full py-2">
          <LinearProgress sx={{ height: 5, borderRadius: '30px' }} variant="determinate" value={wait} />
        </div>
      )}
      <Modal open={openModal} onClose={handleModalClose}>
        <div className="bg-black w-full h-screen center bg-opacity-75">
          <div className="bg-brand_yellow rounded-xl md:w-6/12 2xl:w-4/12 p-6 text-xl">
            {loading ? (
              <div className="center h-full text-white border-white">
                <CircularProgress color="inherit" />
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-xl text-center font-extrabold pb-6 2xl:text-3xl">
                  {Number(result?.multiplier) >= 1
                    ? `Congrats! You Won ${result?.change / LAMPORTS_PER_SOL} SOL`
                    : Number(result?.multiplier) < 1 && Number(result?.multiplier) > 0
                    ? `You won ${result?.change / LAMPORTS_PER_SOL} SOL`
                    : 'You Lost'}
                </p>

                <div className="center space-x-4 flex-wrap text-sm md:text-xl">
                  <button
                    className="bg-[#a23acd] border-2 rounded-3xl border-black uppercase font-extrabold px-4 py-2 cursor-pointer"
                    onClick={() => api.handleCommand('collect reward')}
                  >
                    Collect Reward
                  </button>
                  {/* <button
                    className="bg-red-600 text-white border-2 rounded-3xl border-black uppercase font-extrabold px-4 py-2 cursor-pointer"
                    onClick={() => handleModalClose()}
                  >
                    Close
                  </button> */}
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
const Play = ({amount, setAmount, api, balances, loading, result, wait, userVaultBal}) => {
  return (
    <>
      {loading && (result?.status === 'loading' || result?.status === 'waiting') ? (
        <div className="center h-full text-white border-white p-6">
          {/* <CircularProgress color="inherit" /> */}
          <img src="/assets/images/coin-transparent.gif" alt="loading" />
          {/* <div className="bg-red-00 w-full">
            <LinearProgress sx={{ height: 10, borderRadius: '30px' }} variant="determinate" value={wait} />
          </div> */}
        </div>
      ) : (
        <>
          {result?.status === 'success' && result?.userWon && userVaultBal > 0.0362616 ? (
            <>
              <button 
                className="center h-full text-lg"
              >
                Received Result!
              </button>
            </>
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
                  {/* <span className="pl-4">
                {Number(result && result.status === 'claimed' ? 0 : balances.ribs || 0).toFixed(4)} wsol
              </span> */}
                </p>
                {Number(amount) > 2 && (
                  <p className="text-red-800 text-xs pt-2 text-center">Amount should be less than 2 SOL</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
export default Sidebar;
