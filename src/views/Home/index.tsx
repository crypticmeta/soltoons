import Sidebar from '../../components/Sidebar';
import React, { useEffect, useState } from 'react';
import LoadingScreen from "../../components/LoadingScreen"
import Analytics from '../../components/Analytics';
import GameRive from '../../components/GameRive';

import Countdown from 'react-countdown';
function Index() {
  const [amount, setAmount] = useState('1');
  const [step, setStep] = useState(0);

  const [splash, setSplash] = useState(true);
  const [fade, setfade] = useState(false);
  const opacity = { true: '0%', false: '100%' };
  const style = {
    //@ts-ignore
    opacity: opacity[fade],
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setfade(true);
      setTimeout(() => {
        setSplash(false);
      }, 2000);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const [openModal, setOpenModal] = React.useState(false);
  const handleModalOpen = () => setOpenModal(true);
  const handleModalClose = () => setOpenModal(false);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    setSound(localStorage.getItem('soltoons-sound') === 'true');
  }, []);

  // Renderer callback with condition
  const renderer = ({ days, hours, minutes, seconds, completed }:any) => {
    if (!completed) {
      return (
        <div className="center min-h-screen">
          <div className="text-3xl 2xl:text-5xl bg-brand_yellow p-3 rounded-xl shadow-2xl font-extrabold font-sans flex space-x-6">
            <span>{days} D</span>
            <span>:</span>
            <span>{hours} H</span>
            <span>:</span>
            <span>{minutes} m</span>
            <span>:</span>
            <span>{seconds} sec</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative no-scrollbar">
      <Countdown date={new Date('10 February 2023')} zeroPadDays={2} zeroPadTime={2} renderer={renderer} />
      {new Date() > new Date("10 February 2023") && (<>
        {splash ? <LoadingScreen style={style} /> : <></>}
        <div className=" flex  relative 2xl:justify-center items-center">
          <div className="2xl:max-w-[1920px] 2xl:max-h-[1080px] w-full  h-screen items-center flex flex-wrap bg-yellow-00 min-h-[120vh] lg:max-h-screen  md:min-h-[100vh]">
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
        <div className="relative pt-24">
          <Analytics />
        </div>
      </>)}
    </div>
  );
}

export default Index;
