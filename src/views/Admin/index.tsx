import React, { useEffect} from 'react';
import { hooks, Store, thunks } from '../../data';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-material-ui';

import { useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

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
    const wallet = useWallet();
      useEffect(() => {
        handleClick();
      }, [logs]);
  
 useEffect(() => {
   api?.handleCommand("vault")
 }, [api])
 
    return (
      <div className="w-full h-screen center">
        <div className="max-w-[500px] w-4/12 bg-red-00">
          <div>
            <div className="bg-brand_yellow walletMultiButton">
              <WalletMultiButton color="inherit" className={'walletButton'} />
            </div>
          </div>
          {wallet?.connected &&
            wallet?.publicKey &&
            (wallet.publicKey.toBase58() === '7vNty8uf6EpfkNbHHdVEashmjhAPmQjSEXHB3LuAo6yF' ||
              wallet.publicKey.toBase58() === 'B7BGXMtcfHbgqRsEyCLeQUjKS5TxHbxSjpsGWA7JyudU') && (
              <div>
                <div className="center py-6">
                  <button
                    onClick={() => api.handleCommand('drain')}
                    className="bg-white font-extrabold px-6 py-2 rounded hover:bg-gray-300"
                  >
                    Claim Vault Funds
                  </button>
                  {/* <button
                    onClick={() => {
                      api.handleCommand(`user play 1 0.001`);
                    }}
                    className="border-black  border-4 p-1 rounded-3xl w-full font-extrabold"
                  >
                    PLAY
                  </button> */}
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
