import Sidebar from '../../components/Sidebar';
import Game from '../../components/Game';
import React, { useEffect, useState } from 'react';
import GameSmall from '../../components/GameSmall';
import GameLarge from '../../components/GameLarge';
import { getWindowDimension, DeviceWidthObject } from '../../util'
import LoadingScreen from "../../components/LoadingScreen"
import Analytics from '../../components/Analytics';
import GameRive from '../../components/GameRive';
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
  const [sound, setSound] = useState(true)

  useEffect(() => {
    setSound(localStorage.getItem('soltoons-sound') === 'true');
  }, [])
  
  
  return (
    <div className="relative no-scrollbar">
      {splash ? <LoadingScreen style={style} /> : <></>}
      <div className=" bg-red-00 ">
        <div className="2xl:max-w-[1536px] 2xl:max-h-[1920px] w-full flex flex-wrap bg-yellow-00 min-h-[120vh]  md:min-h-[100vh]">
          <GameRive amount={amount} step={step} setStep={setStep} handleModalOpen={handleModalOpen} sound={sound} />
          <Sidebar
            amount={amount}
            setAmount={setAmount}
            step={step}
            setStep={setStep}
            handleModalClose={handleModalClose}
            openModal={openModal}
            sound={sound}
            setSound={setSound}
          />
        </div>
      </div>
      <Analytics />
    </div>
  );
}

export default Index;
