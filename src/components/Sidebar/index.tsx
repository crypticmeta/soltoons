import React, { useEffect, useState } from 'react';
import { hooks, Store, thunks } from '../../data';
import { useConnectedWallet, useWalletKit, useSolana } from '@gokiprotocol/walletkit';
import { useSelector } from 'react-redux';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Severity } from '../../util/const';
import { LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { createSyncNativeInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token-v2';
import * as anchor from 'anchor-24-2'
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
          <span >{truncatedPubkey}</span>
        </div>
      );
    }
    return 'Connect Wallet';
  }, [wallet, hovered]);

  return (
    <div className='bg-brand_yellow border-4 rounded-3xl border-black w-full text-center py-2 cursor-pointer' onClick={wallet ? disconnect : walletKit.connect}
    >
      {content}
    </div>
  );
};
//@ts-ignore
function Sidebar({ amount, setAmount }) {
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


  const solana = useSolana();
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
        if (logs && logs[0]?.severity === "error") {
          // alert(logs[0].message);
          if (logs[0].message.includes("User hasn't created an account")) setUserAccountExists(false);
          else setUserAccountExists(true);
        }
        handleClick()
      }, [logs]);

  useEffect(() => {
    // console.log(user, 'user in redux')
    if (user && user.authority) {
      setUserAccountExists(true)
    }
  }, [user])

  useEffect(() => {
    let timer: any;
    if (result && result.status === "waiting") {
      
        // console.log('starting timer');
      timer = setTimeout(() => {
        dispatch(thunks.setLoading(false));
        dispatch(thunks.log({ message:"Failed to get result. Your funds are safe.", severity: Severity.Error }));
        dispatch(thunks.setResult({status: "error"}));
      }, 60000);
    } else if (result && result.status === 'success') {
      // console.log('clearing timeout')
      clearTimeout(timer);
      
    }
      return () => clearTimeout(timer);
  }, [dispatch, result])

  const getReward = async() => {
    if (wallet && balances.ribs) {
      let ixns = [];
      console.log(user.rewardAddress, 'user')
      ixns.push(
        SystemProgram.transfer({
          fromPubkey: new anchor.web3.PublicKey(user.rewardAddress),
          toPubkey: wallet?.publicKey,
          lamports: balances.ribs * LAMPORTS_PER_SOL - 0.002 * LAMPORTS_PER_SOL,
        })
      );
      ixns.push(createSyncNativeInstruction(wallet.publicKey, TOKEN_PROGRAM_ID));

      const sig = await wallet?.signTransaction(new anchor.web3.Transaction().add(...ixns));
      console.log(sig, ' tx')
      //@ts-ignore
      // const confirm = await solana.connection.confirmTransaction(sig);
      // console.log(confirm, 'confirm')
      // await solana.connection.confirmTransaction(sig);

    }


  }
  
  
  
  return (
    <div className="flex h-full flex-col max-h-[800px] justify-between w-full lg:w-3/12 p-6 font-bold">
      <div className="part1 h-[10%] center w-full">
        <WalletButton />
      </div>
      <div className="part2 h-[50%] 2xl:h-[60%] bg-brand_yellow  border-4 border-black rounded-3xl p-2 text-sm overflow-hidden">
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

      <div className="part3 h-[35%] 2xl:h-[25%] bg-brand_yellow rounded-3xl border-4 border-black text-sm p-6 flex flex-col justify-between">
        {userAccountExists ? (
          <>
            {  true ? (
              <Play amount={amount} setAmount={setAmount} loading={loading} api={api} balances={balances} />
            ) : (
                <div className="center h-full ">
                 <button onClick={()=>getReward()}>Collect Reward</button>
                </div>
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
      <Snackbar open={open} onClose={handleClose}>
        <Alert onClose={handleClose} severity={logs[0]?.severity === 'error' ? 'error' : 'info'} sx={{ width: '100%' }}>
          {logs[0]?.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

//@ts-ignore
const Play = ({amount, setAmount, api, balances, loading}) => {
  return (
    <>
      {
        loading ? (<div className='center h-full text-white border-white'>
        <CircularProgress color="inherit"/></div>) : (
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
          {Number(balances.sol).toFixed(4)} sol <span className='pl-4'>{Number(balances.ribs).toFixed(4)} wsol</span>
        </p>
      </div></>
        )
     }
    </>
  );
}
export default Sidebar;
