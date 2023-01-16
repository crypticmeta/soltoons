import React, { useCallback, useEffect, useState } from 'react';
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
import { Box, MenuItem } from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
//nft
//@ts-ignore
import { NftTokenAccount, useWalletNfts } from '@nfteyez/sol-rayz-react';
import projectRegistry from '../../data/providers/discoutRegistry';
//sound-icons
import { GiSpeakerOff, GiSpeaker } from 'react-icons/gi';
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
function Sidebar({ amount, setAmount, step, setStep, handleModalClose, openModal, sound, setSound }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [playLoading, stopLoading] = useSound('/assets/audio/loading.mp3', {
    volume: sound?0.7:0,
  });
  const [playLose] = useSound('/assets/audio/error.mp3', {
    volume: sound?1:0,
  });
  const [playReward, stopReward] = useSound('/assets/audio/reward.mp3', {
    volume: sound?1:0,
  });

  const [open, setOpen] = React.useState(true);
  const [openHowTo, setOpenHowTo] = React.useState(false);

  const closeHowTo = () => {
    setOpenHowTo(false);
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  //for-fee-discount
  const [discountNft, setDiscountNft] = useState<any | null>(null);
  const { nfts, isLoading, error } = useWalletNfts({
    publicAddress: wallet.publicKey?.toBase58() || '',
    connection,
  });
  const api = hooks.useApi();
  const dispatch = hooks.useThunkDispatch();
  const logs: any = useSelector(({ HUDLogger }: Store) => HUDLogger.logs);
  const loading: boolean = useSelector((store: Store) => store.gameState.loading);
  const balances = useSelector((store: Store) => store.gameState.userBalances);
  const tokenEscrow = useSelector((store: Store) => store.gameState.tokenEscrow);
  const tokenmint = useSelector((store: Store) => store.gameState.tokenmint);
  const user = useSelector((store: Store) => store.gameState.user);
  const result = useSelector((store: Store) => store.gameState.result);
  const userVaultBal = useSelector((store: Store) => store.gameState.userVaultBalance);  
  const houseVaultBal = useSelector((store: Store) => store.gameState.vaultBalance);
  const [userAccountExists, setUserAccountExists] = useState(false);
  const [userEscrowExists, setUserEscrowExists] = useState(true);
  const [wait, setWait] = useState(0);

  //tokenmint
  const [token, setToken] = React.useState(tokenmint);
  const [tokenInfo, setTokenInfo] = useState(tokenInfoMap.get(tokenmint));

  //status-control
  const [control, setControl] = useState('loading');

  const handleChange = (event: SelectChangeEvent) => {
    dispatch(thunks.setLoading(true));
    setToken(event.target.value as string);
  };

  const check_holder = useCallback(async (newNFTs: NftTokenAccount[]) => {
    let tempArr: any[] = [];
    if (newNFTs && newNFTs.length > 0) {
      newNFTs.map((item) => {
        //  console.log(item, 'item');
        if (
          item.data.creators &&
          projectRegistry.includes(item.data.creators[0].address) &&
          item.data.creators[0].verified
        ) {
          setDiscountNft(item);
        }
        tempArr.push(item);
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !error) check_holder(nfts);
  }, [nfts, isLoading, error]);

  useEffect(() => {
    if (discountNft) {
      dispatch(thunks.setDiscount(discountNft));
    }
  }, [discountNft]);

  //stores old token escrow info to check if the store has updated with escrow of new token mint
  useEffect(() => {
    if (tokenEscrow) {
      localStorage.setItem(tokenmint + wallet.publicKey?.toBase58() + 'Escrow', tokenEscrow.publicKey);
      localStorage.setItem('oldTokenMint', tokenmint);
      localStorage.setItem(tokenEscrow.publicKey + 'EscrowIsInitialized', String(tokenEscrow.isInitialized));
    }
  }, [tokenEscrow]);

  //stops loading music when step reaches the 3rd part (plushie is released from claw)
  useEffect(() => {
    if (step === 3) {
      stopLoading.stop();
    }
  }, [step, stopLoading]);

  // part 1: if tokenmint exists, it loads the token info to tokenInfo useState and activates the first bet option
  // part 2: if tokenmint isnt sol
  //
  useEffect(() => {
    if (tokenmint && tokenInfoMap.get(tokenmint)) {
      api?.handleCommand('vault');
      setTokenInfo(tokenInfoMap.get(tokenmint));
      if (tokenInfoMap.get(tokenmint)?.bets.length) setAmount(tokenInfoMap.get(tokenmint)?.bets[0] || 0);
    }
    if (logs && tokenmint !== wsol) {
      if (!tokenEscrow?.isInitialized && userAccountExists) {
        //tokenescrow is not initialized then setUserAccountExists false and loading false
        // dispatch(thunks.setLoading(false));
        setUserEscrowExists(false);
      } else if (tokenEscrow.isInitialized && userAccountExists) {
        //tokenescrow is initialized and new tokenescrow account belongs to new tokenmint then setUserAccountExists true and loading false
        // dispatch(thunks.setLoading(false));
        setUserEscrowExists(true);
      } else {
        // dispatch(thunks.setLoading(false));
      }
    }
  }, [tokenmint, tokenEscrow]);

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
    if (token !== tokenmint) {
      dispatch(thunks.setTokenmint(token));
    }
  }, [dispatch, token, tokenmint]);

  useEffect(() => {
    const newRound = step === 0; //new round or page refresh
    const tokenEscrowHasClaimableBalance = tokenmint === wsol ? userVaultBal > 0.03552384 : tokenEscrow.balance > 0; //should have claimable balance to claim reward

    //@ts-ignore
    const escrowUpdated = localStorage.getItem(localStorage.getItem('oldTokenMint') + wallet.publicKey?.toBase58() + 'Escrow') ===
      tokenEscrow.publicKey||false;
    const mintUpdated = localStorage.getItem('oldTokenMint') === token||false;
    // console.log(escrowUpdated, ' Escrow Updated?')
    // console.log(mintUpdated, ' Mint Updated?');
    if (
      userAccountExists &&
      userEscrowExists &&
      newRound &&
      tokenEscrowHasClaimableBalance &&
      !result.status &&
      (tokenmint === wsol ? userVaultBal > 0.03552384 : tokenEscrow.balance > 0)
    ) {
      //ensures the button is only shown for old rewards not current round one
      setControl('collectPreviousReward');
    } else if (tokenmint === wsol && !userAccountExists) {
      setControl('createUserAccount');
    } else if (tokenmint !== wsol && !userAccountExists) {
      setControl('createUserAccount');
    } else if (tokenmint !== wsol && userAccountExists && !userEscrowExists && mintUpdated && escrowUpdated) {
      setControl('createEscrowAccount');
    } else if (tokenmint === wsol && userAccountExists) {
      setControl('play');
      if (logs[0].message.includes('Accounts retrieved for user')) dispatch(thunks.setLoading(false));
    } else if (tokenmint !== wsol && userAccountExists && userEscrowExists) {
      setControl('play');
    }
    return () => {};
  }, [tokenmint, userAccountExists, userEscrowExists, token, step, userVaultBal, tokenEscrow, result.status, loading]);

  useEffect(() => {
    // console.log("setting control as : ", control)
    if (control) {
      dispatch(thunks.setLoading(false));
    }
  }, [control]);

  useEffect(() => {
    if (logs) {
      setOpen(true);
      setTimeout(() => {
        setOpen(false);
      }, 6000);
    }
  }, [logs]);

  return (
    <div className="flex h-full flex-col max-h-[800px]  md:justify-center w-full lg:w-3/12 p-6 font-bold relative">
      <div className="part1 h-[20%]  center w-full">
        <div className="w-full">
          {wallet?.connected && (
            <div className="tokenSelector mb-1">
              <Select
                labelId="select-token"
                id="select-token"
                sx={{
                  width: '100%',
                  height: '40px',
                  outline: 'none',
                  border: 'none',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                }}
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
            </div>
          )}
          <div className="bg-brand_yellow walletMultiButton">
            <WalletMultiButton color="inherit" className={'walletButton'} />
          </div>
        </div>
      </div>
      <div className="part2 h-[10%]  2xl:h-[10%] p-1">
        <div className="bg-brand_yellow border-4 border-black rounded-3xl p-1 text-sm overflow-hidden h-full center">
          <div className="flex justify-between font-extrabold ">
            <p onClick={() => setOpenHowTo(true)} className="text-center w-full cursor-pointer border-black xl:text-lg">
              How To Play
            </p>
          </div>
        </div>
      </div>
      <div className="part3 h-[40%]  2xl:h-[45%] p-1">
        <div className="bg-brand_yellow rounded-3xl border-4 border-black text-sm p-2 text-center h-full center overflow-hidden justify-between relative">
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
                userVaultBal={userVaultBal}
                tokenInfo={tokenInfo}
                escrow={tokenEscrow}
                discountNft={discountNft}
                houseVaultBal = {houseVaultBal}
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

      <div
        className="absolute bg-brand_yellow rounded-full w-[40px] h-[40px] text-xl center bottom-[5%] right-[7%] cursor-pointer hover:bg-yellow-800"
        onClick={() => {
          localStorage.setItem('soltoons-sound', String(!sound));
          setSound(!sound);
        }}
      >
        {!sound ? (
          <>
            <GiSpeaker />
          </>
        ) : (
          <>
            <GiSpeakerOff />
          </>
        )}
      </div>

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
                    ? `Congrats! You Won ${
                        result?.change / Math.pow(10, tokenInfo?.decimals || 9) > 10000
                          ? convertToShortForm(result?.change / Math.pow(10, tokenInfo?.decimals || 9))
                          : result?.change / Math.pow(10, tokenInfo?.decimals || 9)
                      } ${tokenInfo?.symbol}`
                    : Number(result?.multiplier) < 1 && Number(result?.multiplier) > 0
                    ? `Collect ${
                        result?.change / Math.pow(10, tokenInfo?.decimals || 9) > 10000
                          ? convertToShortForm(result?.change / Math.pow(10, tokenInfo?.decimals || 9))
                          : result?.change / Math.pow(10, tokenInfo?.decimals || 9)
                      } ${tokenInfo?.symbol}`
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
      <Modal open={openHowTo} onClose={closeHowTo}>
        <div className="bg-black w-full h-screen center bg-opacity-75">
          <div className="bg-brand_yellow rounded-xl md:w-6/12 2xl:w-4/12 p-6 text-xl">
            <div className="flex flex-col">
              <div className="flex justify-between font-extrabold mb-4">
                <p className="text-center w-full cursor-pointer border-black xl:text-lg">How To Play</p>
              </div>
              <div className="overflow-scroll h-[90%] no-scrollbar text-xs pb-4">
                <div>
                  <p className="text-brand_black capitalize">
                    Create an account. Helps to store funds while waiting for result.
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">Choose token and bet amount.</p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">
                    Use arrow keys (keyboard) or game button to move the grabber sideways.
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">Click on play button.</p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">
                    When result arrives, the grabber will grab your item and drop it into container.
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">
                    Click on the item that was dropped and collect your reward.
                  </p>
                </div>
              </div>
              <div className="flex justify-between font-extrabold mb-4">
                <p className="text-center w-full cursor-pointer border-black xl:text-lg">Info</p>
              </div>
              <div className="overflow-scroll h-[90%] no-scrollbar text-xs ">
                <div>
                  <p className="text-brand_black capitalize">
                    0.036 SOL is charged to create user account (required only ONCE)
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">
                    0.002 SOL is charged at every round (for verifiable randomness)
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">
                    standard 3% fee is applied on every game. 1% for soltoons holders.
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">
                    if tx fails to get result, you can play te next round without transferring funds
                  </p>
                </div>
                <hr className="my-2 border-black" />
                <div>
                  <p className="text-brand_black capitalize">Transaction signatures are visible in console</p>
                </div>
              </div>
              <div className="center space-x-4 flex-wrap text-sm md:text-xl">
                <button
                  className="bg-[#fd675d] border-2 rounded-3xl border-black uppercase font-extrabold px-4 py-2 cursor-pointer"
                  onClick={() => closeHowTo()}
                >
                  Close
                </button>
              </div>
            </div>
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
const Play = ({
  amount,
  setAmount,
  api,
  balances,
  loading,
  result,
  userVaultBal,
  tokenInfo,
  escrow,
  discountNft,
  houseVaultBal}: any) => {
  const isWsol = tokenInfo.address === wsol;
  const token = tokenInfo;
  //TODO: loading when play button pressed
  return (
    <div className="w-full h-full">
      {loading && (result?.status === 'loading' || result?.status === 'waiting') ? (
        <div className="center h-full text-white border-white p-6">
          <img src="/assets/images/coin-transparent.gif" alt="loading" />
        </div>
      ) : (
        <div className="center w-full h-full">
          {result?.status === 'success' &&
          result?.userWon &&
          (isWsol ? userVaultBal > 0.03552384 : escrow.balance > 0) ? (
            <>
              <button className="center h-full w-full text-lg">Received Result!</button>
            </>
          ) : (
            <div className="h-full w-full relative bg-green-00">
              <span className="bg-green-500 text-green-900 corner-ribbon top-left">
                {discountNft ? '1% FEE' : '3% FEE'}
              </span>
              <div className="bg-red-00 py-2 flex flex-col bg-red-00 items-center justify-center h-[30%]">
                <p className="font-extrabold text-center text-md border-b-2 w-full pb-4">PLAY with {token?.symbol}</p>

                {/* <hr className="my-2 border-black" /> */}
              </div>
              <div className="flex flex-wrap  italic justify-between bg-red-00 w-full ">
                {token?.bets?.map((item: number) => (
                  <button
                    disabled={
                      isWsol
                        ? balances.sol < item || houseVaultBal < item * 10
                        : balances.token < item || houseVaultBal < item * 10
                    }
                    className={`w-${token?.bets?.length === 4 ? 5 : 4}/12 center bg-red-00 my-1 p-1 `}
                    onClick={() => setAmount(Number(item))}
                    key={item}
                  >
                    <span
                      className={`text-xs w-full p-1 text-center ${
                        amount === item ? 'bg-yellow-400' : 'bg-yellow-100'
                      } hover:bg-yellow-600 cursor-pointer 
                        ${
                          isWsol
                            ? balances.sol < item || houseVaultBal < item * 10
                              ? ' bg-red-600 cursor-not-allowed '
                              : ''
                            : balances.token < item || houseVaultBal < item * 10
                            ? ' bg-red-600 cursor-not-allowed '
                            : ''
                        }
                   
                      `}
                    >
                      {item < 10000 ? item : convertToShortForm(item)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="pt-6 md:pt-1 2xl:pt-6">
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
                      {Number(balances.token || 0) > 1000
                        ? convertToShortForm(Number(balances.token))
                        : Number(balances.token)}{' '}
                      {token.symbol}
                    </span>
                  ) : (
                    <></>
                  )}
                </p>
                {tokenInfo.address === wsol && Number(amount) > 2 && (
                  <p className="text-red-800 text-xs pt-2 text-center">Amount should be less than 2 SOL</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default Sidebar;


const CreateEscrowAccount = ({ api, tokenmint, token }: any) => {
  return (
    <button
      onClick={() => {
        api.handleCommand('create escrow');
      }}
      className="center h-full text-lg"
    >
      Create Vault Account
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
const CollectPreviousReward = ({ api }: any) => {
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
};

function convertToShortForm(n: number): string {
  const suffixes = { 9: 'B', 12: 'T' };
  let num = n;
  let suffix = '';
  for (let key in suffixes) {
    if (num >= Math.pow(10, Number(key))) {
      num /= Math.pow(10, Number(key));
      //@ts-ignore
      suffix = suffixes[Number(key)];
    }
  }
  if (num >= 1000000) {
    num /= 1000000;
    suffix = 'M';
  }
  if (num >= 1000) {
    num /= 1000;
    suffix = 'K';
  }
  return num.toFixed(1) + suffix;
}


