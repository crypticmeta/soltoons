import React, { FC, useCallback, useMemo } from 'react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  getPhantomWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolletExtensionWallet,
  getSlopeWallet,
} from '@solana/wallet-adapter-wallets';

import toast from 'react-hot-toast';
const extendedClusterApiUrl = () => {
  return (
    process.env.REACT_APP_RPC ||
    'https://warmhearted-greatest-emerald.solana-mainnet.quiknode.pro/2b6bcf328ed2611d4d293c2aaa027f3139acb0af/'
  );
};

const Wallet: FC = ({ children }:any) => {
  const network = process.env.REACT_APP_NETWORK==="devnet"?"devnet":"mainnet-beta";
  const endpoint = useMemo(() => extendedClusterApiUrl(), []);

  // @solana/wallet-adapter-wallets imports all the adapters but supports tree shaking --
  // Only the wallets you want to support will be compiled into your application
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      getSlopeWallet(),
      getSolletWallet({ network: network as unknown as WalletAdapterNetwork }),
      getSolletExtensionWallet({
        network: network as unknown as WalletAdapterNetwork,
      }),
    ],
    [network]
  );

  const onError = useCallback((error: WalletError) => {
      toast.error(error.message ? `${error.name}: ${error.message}` : error.name);
      
    console.error(error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletDialogProvider featuredWallets={5}>{children}</WalletDialogProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default Wallet;
