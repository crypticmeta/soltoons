import Sidebar from '../../components/Sidebar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import LoadingScreen from "../../components/LoadingScreen"
import Analytics from '../../components/Analytics';
import GameRive from '../../components/GameRive';

import Countdown from 'react-countdown';
import { FaDiscord, FaTwitter } from 'react-icons/fa';
import { useWallet } from '@solana/wallet-adapter-react';

const onchainEnabled = process.env.REACT_APP_ENABLE_ONCHAIN === 'true';

const demoPrizes = [
  { multiplier: '0.3', label: 'Banana sticker' },
  { multiplier: '0.5', label: 'Toobs' },
  { multiplier: '0.8', label: 'Arcade cap' },
  { multiplier: '1.0', label: 'Skull plushie' },
  { multiplier: '2.0', label: 'Golden banana' },
  { multiplier: '5.0', label: 'Golden cap' },
  { multiplier: '8.0', label: 'Golden toobs' },
  { multiplier: '10.0', label: 'Golden snake' },
];

type DemoResult = {
  status: 'claimed' | 'waiting' | 'success';
  userWon?: boolean;
  multiplier?: string;
  label?: string;
};

function Index() {
  const { connected } = useWallet();
  const demoMode = !onchainEnabled || !connected;
  const [amount, setAmount] = useState(1);
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
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoMessage, setDemoMessage] = useState('Move the claw, then drop it. No wallet or funds required.');
  const [clawPosition, setClawPosition] = useState(50);
  const demoTimers = useRef<number[]>([]);

  useEffect(() => {
    setSound(localStorage.getItem('soltoons-sound') === 'true');
  }, []);

  useEffect(
    () => () => {
      demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  useEffect(() => {
    if (!connected || !onchainEnabled) return;

    demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    demoTimers.current = [];
    setDemoResult(null);
    setDemoRunning(false);
    setDemoMessage('Move the claw, then drop it. No wallet or funds required.');
  }, [connected]);

  const playDemo = useCallback(() => {
    if (demoRunning) return;

    demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    demoTimers.current = [];

    const prizeIndex = Math.min(
      demoPrizes.length - 1,
      Math.max(0, Math.round((clawPosition / 100) * (demoPrizes.length - 1)))
    );
    const prize = demoPrizes[prizeIndex];

    setDemoRunning(true);
    setDemoMessage('The claw is moving...');
    setStep(0);
    setDemoResult({ status: 'claimed' });

    demoTimers.current.push(
      window.setTimeout(() => setDemoResult({ status: 'waiting' }), 150),
      window.setTimeout(
        () =>
          setDemoResult({
            status: 'success',
            userWon: true,
            multiplier: prize.multiplier,
            label: prize.label,
          }),
        1100
      ),
      window.setTimeout(() => {
        setDemoMessage(`You grabbed ${prize.label} — ${prize.multiplier}x demo prize.`);
        setDemoRunning(false);
      }, 3300)
    );
  }, [clawPosition, demoRunning]);

  // Renderer callback with condition
  const renderer = ({ days, hours, minutes, seconds, completed }:any) => {
    if (!completed) {
      return (
        <div className="center min-h-screen">
          <div className="w-full bg-red-00 flex-col center">
            <div className=" text-2xl md:text-3xl 2xl:text-5xl bg-brand_yellow p-3 rounded-xl shadow-2xl font-extrabold font-sans flex space-x-1 md:space-x-6">
              <span>{days} D</span>
              <span>:</span>
              <span>{hours} H</span>
              <span>:</span>
              <span>{minutes} m</span>
              <span>:</span>
              <span>{seconds} sec</span>
            </div>
            <div className="center my-6 space-x-4 md:space-x-6">
              <div className="bg-brand_yellow rounded-full w-[40px] h-[40px] text-xl center cursor-pointer hover:bg-yellow-800">
                <a href="https://twitter.com/SoltoonsArcade" target={'_blank'} rel="noreferrer">
                  <FaTwitter />
                </a>
              </div>
              <div className="bg-brand_yellow rounded-full w-[40px] h-[40px] text-xl center cursor-pointer hover:bg-yellow-800">
                <a href="https://t.co/7z4OVkI6DX" target={'_blank'} rel="noreferrer">
                  <FaDiscord />
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative no-scrollbar">
      <Countdown date={new Date('10 February 2023 21:00:00 UTC ')} zeroPadDays={2} zeroPadTime={2} renderer={renderer} />
      {new Date() > new Date("10 February 2023 21:00:00 UTC ") && (<>
        {splash ? <LoadingScreen style={style} /> : <></>}
        <div className=" flex  relative 2xl:justify-center items-center">
          <div className="2xl:max-w-[1920px] 2xl:max-h-[1080px] w-full  h-screen items-center flex flex-wrap bg-yellow-00 min-h-[120vh] lg:max-h-screen  md:min-h-[100vh]">
            <GameRive
              step={step}
              setStep={setStep}
              handleModalOpen={handleModalOpen}
              sound={sound}
              demoResult={demoMode ? demoResult : null}
              isDemo={demoMode}
              demoRunning={demoRunning}
              onDemoPlay={playDemo}
              x={clawPosition}
              setX={setClawPosition}
            />
            <Sidebar
              amount={amount}
              setAmount={setAmount}
              step={step}
              setStep={setStep}
              handleModalClose={handleModalClose}
              openModal={openModal}
              sound={sound}
              setSound={setSound}
              demoResult={demoResult}
              demoRunning={demoRunning}
              demoMessage={demoMessage}
              onDemoPlay={playDemo}
              onchainEnabled={onchainEnabled}
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
