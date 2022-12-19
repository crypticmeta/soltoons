import { css } from '@emotion/react';
import { WalletKitProvider } from '@gokiprotocol/walletkit';
import { ModalStep } from '@gokiprotocol/walletkit/dist/cjs/components/WalletSelectorModal';
import { GlobalStyles } from '@mui/material';
import React from 'react';
import NavigationBar from './components/NavigationBar';
import DataLayer from './data';
import Router from './Router';
import { zIndices } from './util/const';

const inputGlobalStyles = (
  <GlobalStyles
    styles={css`
      [data-reach-dialog-overlay] {
        z-index: ${zIndices.ConnectWalletDialog};
      }
    `}
  />
);

const App: React.FC = () => {
 

  return (
    <WalletKitProvider app={{ name: 'Soltoons' }} defaultNetwork={'devnet'} initialStep={ModalStep.Select} >
      <DataLayer>
        {inputGlobalStyles}
        <div style={{ display: 'flex', flexDirection: 'column' }} className="bg-gray-00 min-h-screen">
          {/* <NavigationBar /> */}
          <Router />
        </div>
      </DataLayer>
    </WalletKitProvider>
  );
};

export default App;
