import React, { useEffect} from 'react';
import { hooks, Store, thunks } from '../../data';
import { useConnectedWallet, useWalletKit } from '@gokiprotocol/walletkit';
import { useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
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
    const vault_balance = useSelector((store: Store) => store.gameState.vaultBalance);
    const wallet = useConnectedWallet();
      useEffect(() => {
        handleClick();
      }, [logs]);
  
 useEffect(() => {
   api?.handleCommand("vault")
 }, [api])
 
    return (
      <div className="w-full h-screen center">
        <div className="max-w-[500px] w-4/12 bg-red-00">
          <WalletButton />
          {wallet?.connect &&
            ((wallet.publicKey.toBase58() ===
              '7vNty8uf6EpfkNbHHdVEashmjhAPmQjSEXHB3LuAo6yF')||(wallet.publicKey.toBase58() ===
              'B7BGXMtcfHbgqRsEyCLeQUjKS5TxHbxSjpsGWA7JyudU')) &&(
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
                    <p className="text-white text-xs">Vault Balance: {vault_balance.toFixed(4)} SOL</p>
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
