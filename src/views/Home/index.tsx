import Sidebar from '../../components/Sidebar';
import Game from '../../components/Game';
import React, { useEffect, useState } from 'react';
import GameSmall from '../../components/GameSmall';
import GameLarge from '../../components/GameLarge';
import { getWindowDimension, DeviceWidthObject } from '../../util'
import LoadingScreen from "../../components/LoadingScreen"
function Index() {
  const [amount, setAmount] = useState('1');
  const [step, setStep] = useState(0);
  
  const [splash, setSplash] = useState(true)
  const [fade, setfade] = useState(false)
  const opacity = { true: "0%", false: "100%" };
  const style = {
    //@ts-ignore
    opacity: opacity[fade]
  }
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setfade(true);
      setTimeout(() => {
        setSplash(false);
      }, 2000);
    }, 3000);

    return ()=>clearTimeout(timeout)
  }, [])
  
   const [openModal, setOpenModal] = React.useState(false);
   const handleModalOpen = () => setOpenModal(true);
   const handleModalClose = () => setOpenModal(false);
  return (
    <div className="flex flex-wrap justify-center items-center min-h-screen h-screen relative">
      {
        splash ? (<LoadingScreen style={style} />):(<></>)
      }
      <div className="max-w-[1536px] max-h-[1920px] w-full flex flex-wrap justify-between items-center h-full">
        {getWindowDimension().width >= DeviceWidthObject.md.min &&
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
        {getWindowDimension().width >= DeviceWidthObject._2xl.min && (
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
