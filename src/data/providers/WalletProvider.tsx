import React, { FC, useCallback, useMemo } from 'react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletWalletAdapter,
  SolletExtensionWalletAdapter,
  SlopeWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import toast from 'react-hot-toast';
import { clusterApiUrl } from '@solana/web3.js';

const Wallet: FC = ({ children }:any) => {
  const onchainEnabled = process.env.REACT_APP_ENABLE_ONCHAIN === 'true';
  const network = process.env.REACT_APP_NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
  const endpoint = useMemo(() => process.env.REACT_APP_RPC || clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets imports all the adapters but supports tree shaking --
  // Only the wallets you want to support will be compiled into your application
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolletWalletAdapter({ network: network as unknown as WalletAdapterNetwork }),
      new SolletExtensionWalletAdapter({
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
      <WalletProvider wallets={wallets} onError={onError} autoConnect={onchainEnabled}>
        <WalletDialogProvider featuredWallets={5}>{children}</WalletDialogProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default Wallet;
