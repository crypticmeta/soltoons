import React from 'react';
import DataLayer from './data';
import Wallet from './data/providers/WalletProvider';
import Router from './Router';

import './styles/style.css';
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
