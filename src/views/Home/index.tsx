import Sidebar from '../../components/Sidebar';
import Game from '../../components/Game';
import React, { useState } from 'react';
import GameSmall from '../../components/GameSmall';
import GameLarge from '../../components/GameLarge';

function Index() {
  const [amount, setAmount] = useState('0.003');
  return (
    <div className="flex flex-wrap justify-center items-center min-h-screen h-screen">
      <div className="max-w-[1536px] max-h-[1920px] w-full flex flex-wrap justify-between items-center h-full">
        <Game amount={amount} setAmount={setAmount} />
        <GameSmall amount={amount} setAmount={setAmount} />
        <GameLarge amount={ amount} setAmount={ setAmount}/>
        <Sidebar amount={amount} setAmount={setAmount} />
      </div>
    </div>
  );
}

export default Index;
