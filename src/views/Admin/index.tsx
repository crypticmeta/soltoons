import React, { useEffect, useState} from 'react';
import { hooks, Store, thunks } from '../../data';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-material-ui';

import { useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { tokenInfoMap } from '../../data/providers/tokenProvider';
import { userAirdrop } from '../../api/generated/instructions/userAirdrop';

const wsol = 'So11111111111111111111111111111111111111112';
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Admin() {
  
  const dispatch = hooks.useThunkDispatch();
  const tokenmint = useSelector((store: Store) => store.gameState.tokenmint);
  const houseVault = useSelector((store: Store) => store.gameState.houseVault);
  const [open, setOpen] = React.useState(false);
  //tokenmint
  const [token, setToken] = React.useState(tokenmint);
  const [tokenInfo, setTokenInfo] = useState(tokenInfoMap.get(tokenmint));

  const handleClick = () => {
    setOpen(true);
  };
  const handleChange = (event: SelectChangeEvent) => {
    dispatch(thunks.setLoading(true));
    setToken(event.target.value as string);
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
    if(api&& tokenmint)
    api?.handleCommand('vault');
  }, [api, tokenmint, token]);

  useEffect(() => {
    if (token !== tokenmint) {
      dispatch(thunks.setTokenmint(token));
    }
  }, [dispatch, token, tokenmint]);
  return (
    <div className="w-full h-screen center">
      <div className="max-w-[500px] w-4/12 bg-red-00">
        <div>
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
                <div>
                  <p className="text-white text-xs text-center">
                    Vault Balance: {vault_balance>10000?convertToShortForm(vault_balance):vault_balance.toFixed(4)} {tokenInfo?.symbol}
                  </p>
                  {token === wsol ? (
                    <p className="text-xs text-white">
                      House:{" "}
                      <a href={`https://explorer.solana.com/address/${houseVault || ''}`}>{houseVault}</a>
                    </p>
                  ) : (
                    <p className="text-xs text-white">
                      House Token Vault:{' '}
                      <a href={`https://explorer.solana.com/address/${houseVault || ''}`}>{houseVault}</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
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

export default Admin;

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


