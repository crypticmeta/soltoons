import React, { useEffect, useState } from 'react';
import { hooks, Store, thunks } from '../../data';
import { tokenInfoMap} from "../../data/providers/tokenProvider";
import { WalletMultiButton } from '@solana/wallet-adapter-material-ui';
// import { useConnectedWallet, useWalletKit } from '@gokiprotocol/walletkit';
import { useSelector } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Severity } from '../../util/const';
import Modal from '@mui/material/Modal';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import useSound from 'use-sound';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Box, FormControl, MenuItem } from '@mui/material';
const wsol = 'So11111111111111111111111111111111111111112';
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }} color="inherit">
      <Box sx={{ width: '100%', mr: 1 }} color="inherit">
        <LinearProgress color='inherit' variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <p className='text-white'>{Math.round(props.value)}%</p>
      </Box>
    </Box>
  );
}
//@ts-ignore
function Sidebar({ amount, setAmount, step, setStep, handleModalClose, openModal }) {
    const [playLoading, stopLoading] = useSound('/assets/audio/loading.mp3', {
      volume: 0.7,
    });
  const [playLose] = useSound('/assets/audio/error.mp3', {
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
  const logs:any = useSelector(({ HUDLogger }: Store) => HUDLogger.logs);
  const loading:boolean = useSelector((store: Store) => store.gameState.loading);
  const balances = useSelector((store: Store) => store.gameState.userBalances);
  const tokenEscrow = useSelector((store: Store) => store.gameState.tokenEscrow);
  const tokenmint = useSelector((store: Store) => store.gameState.tokenmint);
  const user = useSelector((store: Store) => store.gameState.user);
  const result = useSelector((store: Store) => store.gameState.result);
  const userVaultBal = useSelector((store: Store) => store.gameState.userVaultBalance);
  const [userAccountExists, setUserAccountExists] = useState(true);
  const [userEscrowExists, setUserEscrowExists] = useState(true);
  const [wait, setWait] = useState(0);

  //tokenmint
  const [token, setToken] = React.useState(tokenmint);
  const [tokenInfo, setTokenInfo] = useState(tokenInfoMap.get(tokenmint));


  //status-control
  const [control, setControl] = useState("loading")

  const handleChange = (event: SelectChangeEvent) => {
    dispatch(thunks.setLoading(true));
    setToken(event.target.value as string);
  };
  
  //stores old token escrow info to check if the store has updated with escrow of new token mint
  useEffect(() => {
    if(tokenEscrow)
    {
      localStorage.setItem(tokenmint + "Escrow", tokenEscrow.publicKey);      
      localStorage.setItem('oldTokenMint', tokenmint);
      localStorage.setItem(localStorage.getItem('tokenMint') + 'EscrowIsInitialized', String(tokenEscrow.isInitialized));
    }
  }, [tokenEscrow])
  
  //stops loading music when step reaches the 3rd part (plushie is released from claw)
  useEffect(() => {
    if (step === 3) {
      stopLoading.stop();
    }
  }, [step, stopLoading])

  // part 1: if tokenmint exists, it loads the token info to tokenInfo useState and activates the first bet option
  // part 2: if tokenmint isnt sol
  //         
  useEffect(() => {
    if (tokenmint && tokenInfoMap.get(tokenmint)) {
      setTokenInfo(tokenInfoMap.get(tokenmint));
      if (tokenInfoMap.get(tokenmint)?.bets.length) setAmount(tokenInfoMap.get(tokenmint)?.bets[0] || 0);
    }
    if (logs && tokenmint !== wsol) {
      if (!tokenEscrow?.isInitialized && userAccountExists) {
        //tokenescrow is not initialized then setUserAccountExists false and loading false
        // dispatch(thunks.setLoading(false));
        setUserEscrowExists(false)
      }
      else if (
        tokenEscrow.isInitialized &&
        userAccountExists
      ) {
        //tokenescrow is initialized and new tokenescrow account belongs to new tokenmint then setUserAccountExists true and loading false
        // dispatch(thunks.setLoading(false));
        setUserEscrowExists(true);
      } else {
        // dispatch(thunks.setLoading(false));
      }
    }
  }, [tokenmint, tokenEscrow])
  
  useEffect(() => {
    if (user && user.authority) {
      setUserAccountExists(true);
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
  }, [loading, result]);

  useEffect(() => {
    if (token !==tokenmint) {
      dispatch(thunks.setTokenmint(token));
    }
  }, [dispatch, token, tokenmint])

  useEffect(() => {
    const newRound = step === 0; //new round or page refresh
    const tokenEscrowHasClaimableBalance = tokenmint === wsol ? userVaultBal > 0.03552384 : tokenEscrow.balance > 0; //should have claimable balance to claim reward
  
    const escrowUpdated = localStorage.getItem(localStorage.getItem('oldTokenMint') + 'Escrow') === tokenEscrow.publicKey;
     const mintUpdated =
       localStorage.getItem("oldTokenMint") === token;
    // console.log(escrowUpdated, ' Escrow Updated?')
    // console.log(mintUpdated, ' Mint Updated?');
    if (
      userAccountExists &&
      userEscrowExists &&
      newRound &&
      tokenEscrowHasClaimableBalance &&
      !result.status &&
      (tokenmint===wsol ? userVaultBal > 0.03552384 : tokenEscrow.balance > 0)
    ) {
      //ensures the button is only shown for old rewards not current round one
      setControl('collectPreviousReward');
    } else if (tokenmint === wsol && !userAccountExists) {
      setControl('createUserAccount');
    } else if (tokenmint !== wsol && !userAccountExists ) {
      setControl('createUserAccount');
    } else if (tokenmint !== wsol && userAccountExists && !userEscrowExists && mintUpdated && escrowUpdated) {
      setControl('createEscrowAccount');
    } else if (tokenmint === wsol && userAccountExists) {
      setControl('play');
      dispatch(thunks.setLoading(false))
    } else if (tokenmint !== wsol && userAccountExists && userEscrowExists) {
      setControl('play');
    }
    return () => {
      
    }
  }, [tokenmint, userAccountExists, userEscrowExists, token, step, userVaultBal, tokenEscrow, result.status])

  useEffect(() => {
    if (control) {
      dispatch(thunks.setLoading(false))
    }
  },[control])
  
  return (
    <div className="flex h-full flex-col max-h-[800px] justify-between md:justify-center w-full lg:w-3/12 p-6 font-bold">
      <div className="part1 h-[20%] center w-full">
        <div className="w-full">
          <div className="tokenSelector mb-1">
            <FormControl fullWidth variant="filled">
              <Select
                labelId="select-token"
                id="select-token"
                sx={{ width: '100%', height: '40px', outline: 'none', border: 'none' }}
                value={token}
                label="Token"
                onChange={handleChange}
              >
                {Array.from(tokenInfoMap.values())
                  .filter((t) => t.symbol)
                  .map((item: any) => (
                    <MenuItem value={item.address} key={item.symbol + Math.random()}>
                      {item.symbol}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </div>
          <div className="bg-brand_yellow walletMultiButton">
            <WalletMultiButton color="inherit" className={'walletButton'} />
          </div>
        </div>
      </div>
      <div className="part2 h-[40%] 2xl:h-[60%] p-1">
        <div className="bg-brand_yellow border-4 border-black rounded-3xl p-1 text-sm overflow-hidden h-full">
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
        </div>
      </div>

      <div className="part3 h-[35%] 2xl:h-[35%] p-1">
        <div className="bg-brand_yellow rounded-3xl border-4 border-black text-sm p-1 text-center h-full flex flex-col overflow-hidden justify-between relative">
          {result?.status === 'waiting' && (
            <div className="center h-full text-white border-white absolute top-0 bottom-0 z-[12] bg-brand_yellow left-0 right-0">
              <img src="/assets/images/coin-transparent.gif" alt="loading" />
            </div>
          )}
          {(loading || control === 'loading') && (
            <div className="center h-full text-white border-white absolute top-0 bottom-0 z-[11] bg-brand_yellow left-0 right-0">
              <CircularProgress color="inherit" />
            </div>
          )}
          {!loading && control === 'collectPreviousReward' && (
            <div className="center h-full absolute top-0 bottom-0 z-10 bg-brand_yellow left-0 right-0">
              <CollectPreviousReward api={api} />
            </div>
          )}
          {!loading && control === 'createUserAccount' && (
            <div className="center h-full absolute top-0 bottom-0 z-10 bg-brand_yellow left-0 right-0">
              <CreateUserAccount api={api} />
            </div>
          )}
          {!loading && control === 'createEscrowAccount' && (
            <div className="center h-full absolute top-0 bottom-0 z-10 bg-brand_yellow left-0 right-0">
              <CreateEscrowAccount api={api} tokenmint={tokenmint} token={token} />
            </div>
          )}
          {!loading && control === 'play' && (
            <div className="h-full absolute top-0 bottom-0 z-10 bg-brand_yellow left-0 right-0">
              <Play
                amount={amount}
                setAmount={setAmount}
                loading={loading}
                api={api}
                balances={balances}
                result={result}
                wait={wait}
                userVaultBal={userVaultBal}
                tokenInfo={tokenInfo}
                escrow={tokenEscrow}
              />
            </div>
          )}
        </div>
      </div>
      {wait > 0 && (
        <div className="bg-red-00 w-full py-2 text-white">
          <LinearProgressWithLabel sx={{ height: 5, borderRadius: '30px' }} variant="determinate" value={wait} />
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
                    ? `Congrats! You Won ${result?.change / Math.pow(10, tokenInfo?.decimals || 9)} ${
                        tokenInfo?.symbol
                      }`
                    : Number(result?.multiplier) < 1 && Number(result?.multiplier) > 0
                    ? `You won ${result?.change / Math.pow(10, tokenInfo?.decimals || 9)} ${tokenInfo?.symbol}`
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
const CreateEscrowAccount = ({ api, tokenmint, token }: any) => {
  return (
    <button
      onClick={() => {
        api.handleCommand('create escrow');
      }}
      className="center h-full text-lg"
    >
      "Create Vault Account"
    </button>
  );
};
const CreateUserAccount = ({ api }: any) => {
  return (
    <button
      onClick={() => {
        api.handleCommand('user create');
      }}
      className="center h-full text-lg"
    >
      Create Account
    </button>
  );
};
const CollectPreviousReward = ({api}:any) => {
  return (
    <button
      onClick={() => {
        api.handleCommand('collect reward');
      }}
      className="center h-full text-lg"
    >
      Collect Reward
    </button>
  );
}

//@ts-ignore
const Play = ({ amount, setAmount, api, balances, loading, result, wait, userVaultBal, tokenInfo, escrow }) => {
  const isWsol = tokenInfo.address === wsol;
  const token = tokenInfo;
  return (
    <>
      {loading && (result?.status === 'loading' || result?.status === 'waiting') ? (
        <div className="center h-full text-white border-white p-6">
          <img src="/assets/images/coin-transparent.gif" alt="loading" />
        </div>
      ) : (
        <>
          {result?.status === 'success' &&
          result?.userWon &&
          (isWsol ? userVaultBal > 0.03552384 : escrow.balance > 0) ? (
            <>
              <button className="center h-full w-full text-lg">Received Result!</button>
            </>
          ) : (
            <>
              <div>
                <p className="font-extrabold text-center">PLAY with {token?.symbol}</p>
                <hr className="my-2 border-black" />
              </div>
              <div className="flex flex-wrap text-3xl italic justify-between bg-red-00 w-full">
                {token?.bets?.map((item: number) => (
                  <div
                    className={`w-${token?.bets?.length === 4 ? 5 : 4}/12 center bg-red-00 my-1 p-1`}
                    onClick={() => setAmount(Number(item))}
                    key={item}
                  >
                    <p
                      className={`text-sm w-full p-1 text-center ${
                        amount === item ? 'bg-yellow-400' : 'bg-yellow-100'
                      } hover:bg-yellow-600 cursor-pointer`}
                    >
                      {item}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <button
                  disabled={tokenInfo.address !== wsol && balances.token === 0}
                  onClick={() => {
                    api.handleCommand(`user play 1 ${amount}`);
                  }}
                  className={`border-black  border-4 p-1 rounded-3xl text-xs w-10/12 font-extrabold ${
                    tokenInfo.address !== wsol && balances.token === 0
                      ? 'bg-gray-600 cursor-not-allowed'
                      : ' hover:bg-yellow-500'
                  }`}
                >
                  {loading
                    ? 'Loading...'
                    : tokenInfo.address !== wsol && balances.token === 0
                    ? `Insufficient ${token?.symbol} Balance`
                    : 'PLAY'}
                </button>
                <p className="text-xs text-gray-700 text-center">
                  {Number(balances.sol || 0).toFixed(4)} SOL{' '}
                  {balances.token && token && tokenInfo.address !== wsol ? (
                    <span className="pl-4">
                      {Number(balances.token || 0).toFixed(2)} {token.symbol}
                    </span>
                  ) : (
                    <></>
                  )}
                </p>
                {tokenInfo.address === wsol && Number(amount) > 2 && (
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
