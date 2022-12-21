import Sidebar from '../../components/Sidebar';
import Game from '../../components/Game';
import React, { useState } from 'react';
import GameSmall from '../../components/GameSmall';
import GameLarge from '../../components/GameLarge';
import {getWindowDimension, DeviceWidthObject } from '../../util'
function Index() {
  const [amount, setAmount] = useState('0.003');
  const [step, setStep] = useState(0);
  
  
   const [openModal, setOpenModal] = React.useState(false);
   const handleModalOpen = () => setOpenModal(true);
   const handleModalClose = () => setOpenModal(false);
  return (
    <div className="flex flex-wrap justify-center items-center min-h-screen h-screen">
      <div className="max-w-[1536px] max-h-[1920px] w-full flex flex-wrap justify-between items-center h-full">
        {getWindowDimension().width > DeviceWidthObject.md.min &&
          getWindowDimension().width < DeviceWidthObject._2xl.min && (
            <Game
              amount={amount}
              setAmount={setAmount}
              step={step}
              setStep={setStep}
              handleModalOpen={handleModalOpen}
            />
          )}
        {
          getWindowDimension().width < DeviceWidthObject.md.min && (
            <GameSmall
              amount={amount}
              setAmount={setAmount}
              step={step}
              setStep={setStep}
              handleModalOpen={handleModalOpen}
            />
          )}
        {getWindowDimension().width > DeviceWidthObject._2xl.min && (
          <GameLarge
            amount={amount}
            setAmount={setAmount}
            step={step}
            setStep={setStep}
            handleModalOpen={handleModalOpen}
          />
        )}
        <Sidebar
          amount={amount}
          setAmount={setAmount}
          step={step}
          setStep={setStep}
          handleModalClose={handleModalClose}
          openModal={openModal}
        />
      </div>
    </div>
  );
}

export default Index;
