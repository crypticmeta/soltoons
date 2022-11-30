import React, { useState } from 'react';
import { hooks, thunks } from '../../data';
import { useConnectedWallet, useWalletKit } from '@gokiprotocol/walletkit';
const WalletButton: React.FC = () => {
  const walletKit = useWalletKit();
  const wallet = useConnectedWallet();
  const dispatch = hooks.useThunkDispatch();
  const [hovered, setHovered] = React.useState(false);

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
        <button className="border-black  border-4 p-1 rounded-3xl w-full font-extrabold">PLAY</button>
      </div>
    </div>
  );
}

export default Sidebar;
