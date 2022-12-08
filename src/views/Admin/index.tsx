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
      className="bg-brand_yellow border-4 rounded-3xl border-black w-full text-center p-2 px-6 cursor-pointer"
      onClick={wallet ? disconnect : walletKit.connect}
    >
      {content}
    </div>
  );
};

function Admin() {
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
    const logs = useSelector(({ HUDLogger }: Store) => HUDLogger.logs);
    const loading = useSelector((store: Store) => store.gameState.loading);
    const balances = useSelector((store: Store) => store.gameState.userBalances);
    const wallet = useConnectedWallet();
      useEffect(() => {
        handleClick();
      }, [logs]);
    return (
      <div className="w-full h-screen center">
        <div className="max-w-[500px] w-4/12 bg-red-00">
          <WalletButton />
          {wallet?.connect && (
            <div>
              <div className="center py-6">
                <button
                  onClick={() => api.handleCommand('drain')}
                  className="bg-white font-extrabold px-6 py-2 rounded hover:bg-gray-300"
                >
                  Claim Vault Funds
                </button>
              </div>
              <div className="center">
                <p className="text-white text-xs">Balance: {balances.sol?.toFixed(4)} SOL</p>
              </div>
            </div>
          )}
        </div>
        <Snackbar open={open} onClose={handleClose}>
          <Alert
            onClose={handleClose}
            severity={logs[0]?.severity === 'error' ? 'error' : 'info'}
            sx={{ width: '100%' }}
          >
            {logs[0]?.message}
          </Alert>
        </Snackbar>
      </div>
    );
}

export default Admin;
