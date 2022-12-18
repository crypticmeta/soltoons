import Sidebar from '../../components/Sidebar';
import Game from '../../components/Game';
import React, { useState } from 'react';
import GameSmall from '../../components/GameSmall';
import GameLarge from '../../components/GameLarge';

function Index() {
  const [amount, setAmount] = useState('0.003');
    const [step, setStep] = useState(0);
  return (
    <div className="flex flex-wrap justify-center items-center min-h-screen h-screen">
      <div className="max-w-[1536px] max-h-[1920px] w-full flex flex-wrap justify-between items-center h-full">
        <Game amount={amount} setAmount={setAmount} step={step} setStep={setStep} />
        <GameSmall amount={amount} setAmount={setAmount} step={step} setStep={setStep} />
        <GameLarge amount={amount} setAmount={setAmount} step={step} setStep={setStep} />
        <Sidebar amount={amount} setAmount={setAmount} step={step} setStep={setStep} />
      </div>
    </div>
  );
}

export default Index;
