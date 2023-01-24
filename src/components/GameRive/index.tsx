import { useState, useEffect } from 'react';
import { hooks, Store } from '../../data';
import { useSelector } from 'react-redux';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import useSound from 'use-sound';

const plushies = {
  '0.0': { img: '' },
  '0.3': { img: '/assets/images/bwbanana.png', result: 1 },
  '0.5': { img: '/assets/images/bwtoobs.png', result: 2 },
  '0.8': { img: '/assets/images/bwcap.png', result: 3 },
  '1.0': { img: '/assets/images/skull.png', result: 4 },
  '2.0': { img: '/assets/images/banana.png', result: 5 },
  '5.0': { img: '/assets/images/cap.png', result: 6 },
  '8.0': { img: '/assets/images/toobs.png', result: 7 },
  '10.0': { img: '/assets/images/snake.png', result: 8 },
};

//@ts-ignore
function Game({ amount, step, setStep, handleModalOpen, sound }) {
  //sound
  const [playWin, stopWin] = useSound('/assets/audio/win.mp3', {
    volume: sound ? 1 : 0,
  });
  const [playNeutral] = useSound('/assets/audio/reward.m4a', {
    volume: sound ? 0.7 : 0,
  });
  const [playSlide, stopSlide] = useSound('/assets/audio/slide.mp3', {
    volume: sound ? 0.7 : 0,
  });
  //rive
  const STATE_MACHINE_NAME = 'State Machine 1';
  const INPUT_NAME = 'Number 1';
  const params = {
    src: '/assets/rive/game.riv',
    autoplay: true,
    stateMachines: STATE_MACHINE_NAME,
  };
  const { RiveComponent, rive } = useRive(params);
  // const fireInput = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_NAME);
  const refreshInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Refresh'); //trigger
  const xAxisInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'xAxis'); //number 0-200
  const loadingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Loading'); //boolean
  const moveRightInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'moveRight'); //boolean
  const moveLeftInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'moveLeft'); //boolean
  const resultInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Result'); //number 0-7
  const posInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'pos'); //number 0/100
  //api
  const api = hooks.useApi();
  const [x, setX] = useState(30);
  const [styleX, setStyleX] = useState({ transform: 'translateX(0%)', zIndex: 1, animationName: 'none' });
  const [y, setY] = useState(0);
  const [styleY, setStyleY] = useState({ transform: 'translateY(0%)', animationName: 'none' });
  const [styleReward, setStyleReward] = useState({ animationName: 'none' });
  const [styleRewardItem, setStyleRewardItem] = useState({ animationName: 'none' });
  const [leftHold, setLeftHold] = useState(false);
  const [rightHold, setRightHold] = useState(false);

  const [reward, setReward] = useState('');

  //@ts-ignore
  const result = useSelector((store: Store) => store.gameState.result);

  useEffect(() => {
    if (x <= -4 && result?.status === 'success') {
      // ('setting leftHold false and moving to step 2')
      setLeftHold(false);
      setStep(3);
    }
    if (result?.status === 'success') {
      setStyleX({ transform: `translateX(${x}%)`, zIndex: 10, animationName: 'none' });
    } else {
      setStyleX({ transform: `translateX(${x}%)`, zIndex: 1, animationName: 'none' });
    }
  }, [result, x]);

  useEffect(() => {
    if (result.status === 'waiting') {
      if (x < 0) {
        setX(0);
      }
      setY(30);
    } else {
      setY(0);
    }
  }, [result]);

  const movedown = () => {
    if (result && result.status === 'waiting') setStyleY({ transform: `translateY(${y}%)`, animationName: 'vertical' });
    else setStyleY({ transform: `translateY(${y}%)`, animationName: 'none' });
  };

  useEffect(() => {
    movedown();
  }, [y]);

  useEffect(() => {
    if (leftHold || rightHold) {
      let newX = x;
      if (leftHold && step < 3) {
        newX = x - 2;
        if (newX >= -5 && newX <= 85) {
          playSlide();
        } else {
          stopSlide.stop();
        }
      } else if (rightHold && !step) {
        newX = x + 2;
        if (newX >= -5 && newX <= 85) {
          playSlide();
        } else {
          stopSlide.stop();
        }
      }
    } else {
      stopSlide.stop();
    }
  }, [leftHold, rightHold, x, step]);

  useEffect(() => {
    let interval: any;
    let newX = x - 2;
    if (leftHold && step < 3)
      interval = setInterval(() => {
        if (newX >= -5 && newX <= 85) {
          setX(newX);
          newX = newX - 2;
        }
      }, 100);

    return () => clearInterval(interval);
  }, [leftHold, x]);

  useEffect(() => {
    let interval: any;
    let newX = x + 2;
    if (rightHold && !step)
      interval = setInterval(() => {
        if (newX >= -5 && newX <= 85) {
          setX(newX);
          newX = newX - 2;
        }
      }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [rightHold, x]);

  //rive movement after loading user
  //TODO: Fire default values
  // useEffect(() => {
  //   if (fireInput) {
  //     fireInput.value=1;
  //     setTimeout(() => {
  //       fireInput.value=2;
  //       // playLoaded()
  //     }, 1000);
  //  }
  // }, [fireInput, rive]);

  //rive movement after getting collecting rewards

  useEffect(() => {
    if (result.status === 'claimed') {
      //TODO: fire refresh
      // if(fireInput)
      // fireInput.value=3;
      setStyleReward({ animationName: 'none' });
      setStyleRewardItem({ animationName: 'none' });
      setStep(0);
      //@ts-ignore
      setReward('');
      //TODO: fire refresh
      // if(fireInput)
      // setTimeout(() => {
      //   fireInput.value=4
      //   // fireInput?.fire();
      //   setTimeout(() => {
      //     fireInput.value=2
      //     // fireInput?.fire();
      //   }, 500);
      // }, 2000);
    }
  }, [result]);

  //claw movement after getting results

  useEffect(() => {
    if (result && result?.status === 'success' && result?.userWon) {
      setStep(1);
    }
  }, [result]);

  useEffect(() => {
    if (step === 1) {
      setStyleY({ transform: `translateY(30%)`, animationName: 'none' });
      setTimeout(() => {
        //@ts-ignore
        setReward(plushies[result?.multiplier || '0.0'].img);
      }, 600);
    } else if (step === 2) {
      setLeftHold(true);
    } else if (step === 3) {
      setStyleReward({ animationName: 'freefall' });
      setStyleRewardItem({ animationName: 'freefallItem' });
      setTimeout(() => {
        if (result?.userWon && Number(result.multiplier) >= 1) playWin();
        if (result?.userWon && Number(result.multiplier) < 1) playNeutral();
        setStep(4);
      }, 2000);
    } else if (step === 4 && !result?.userWon) {
      setTimeout(() => {
        setStep(0);
      }, 3000);
    }

    return () => {};
  }, [step, result, y, setStep]);

  useEffect(() => {
    if (reward && step === 1) {
      setTimeout(() => {
        setStyleY({ transform: `translateY(0%)`, animationName: 'none' });
        setTimeout(() => {
          setStep(2);
        }, 600);
      }, 600);
    }
  }, [reward, step]);

  function handleKeyDown(e: any) {
    if (e.code === 'Enter') {
      api.handleCommand(`user play 1 ${amount}`);
    }
    if (e.code === 'ArrowRight') {
      setRightHold(true);
    }
    if (e.code === 'ArrowLeft') {
      setLeftHold(true);
    }
  }
  function handleKeyUp(e: any) {
    setLeftHold(false);
    setRightHold(false);
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
  }, []);
  return (
    <div className="w-full md:w-8/12 lg:w-9/12 bg-green-00 lg:bg-red-00 md:flex justify-center md:items-center">
      <div id="game" className="relative w-full h-30vh md:h-80vh bg-indigo-00 lg:h-80vh center">
        <RiveComponent className="w-full h-[80%] md:h-[100%] bg-blue-00" />
      </div>
    </div>
  );
}

export default Game;
