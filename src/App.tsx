import { css } from '@emotion/react';
import { WalletKitProvider } from '@gokiprotocol/walletkit';
import { ModalStep } from '@gokiprotocol/walletkit/dist/cjs/components/WalletSelectorModal';
import { GlobalStyles } from '@mui/material';
import React from 'react';
import DataLayer from './data';
import Wallet from './data/providers/WalletProvider';
import Router from './Router';
import { zIndices } from './util/const';
const App: React.FC = () => {
 

  return (//@ts-ignore
    <Wallet>
      <DataLayer>
        <div style={{ display: 'flex', flexDirection: 'column' }} className="bg-gray-00 min-h-screen">
          <Router />
        </div>
      </DataLayer>
    </Wallet>
  );
};

export default App;
