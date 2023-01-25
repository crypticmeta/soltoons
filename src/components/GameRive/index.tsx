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
    volume: sound ? 0.01 : 0,
  });
  //rive
  const STATE_MACHINE_NAME = 'State Machine 1';
  const params = {
    src: '/assets/rive/game.riv',
    autoplay: true,
    stateMachines: STATE_MACHINE_NAME,
  };
  const { RiveComponent, rive } = useRive(params);
  const refreshInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Refresh'); //trigger
  const xAxisInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'xAxis'); //number 0-200
  const loadingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Loading'); //boolean
  const moveRightInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'moveRight'); //boolean
  const moveLeftInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'moveLeft'); //boolean
  const resultInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Result'); //number 0-7
  const posInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'pos'); //number 0/100
  //api
  const api = hooks.useApi();
  const [x, setX] = useState(50);
  const [leftHold, setLeftHold] = useState(false);
  const [rightHold, setRightHold] = useState(false);

  //@ts-ignore
  const result = useSelector((store: Store) => store.gameState.result);

  useEffect(() => {
    if (result.status === 'waiting') {
      if (loadingInput) {
        loadingInput.value = true;
      }
    } else if (result.status === 'success') {
      if (loadingInput) loadingInput.value = false;
      if (result?.userWon) {
        // console.log('userWon')
        if (posInput) posInput.value = 100;
        // console.log('pos set')
        if (resultInput) {
          //@ts-ignore
          resultInput.value = plushies[result?.multiplier || '0.3'].result;
        }
        // console.log("result set")
        //@ts-ignore
        // console.log(plushies[result?.multiplier || "0.3"].result, 'RESULT NUMBER')
        setStep(1);
      }
    } else {
      if (loadingInput) loadingInput.value = false;
    }
  }, [loadingInput, posInput, result, resultInput, setStep]);

  useEffect(() => {
    if (step === 1) {
      setTimeout(() => {
        if (result?.userWon && Number(result.multiplier) >= 1) playWin();
        if (result?.userWon && Number(result.multiplier) < 1) playNeutral();
        setStep(2);
      }, 2000);
    }
    return () => {};
  }, [playNeutral, playWin, result.multiplier, result?.userWon, setStep, step]);

  useEffect(() => {
    if (leftHold || rightHold) {
      let newX = x;
      if (leftHold && step < 3) {
        newX = x - 0.1;
        if (newX >= 0 && newX <= 100) {
          if (moveLeftInput) moveLeftInput.value = true; //move left button in rive
          playSlide();
        } else {
          stopSlide.stop();
        }
      } else if (rightHold && !step) {
        newX = x + 0.1;
        if (newX >= 0 && newX <= 100) {
          playSlide();
          if (moveRightInput) moveRightInput.value = true; //move right button in rive
        } else {
          stopSlide.stop();
        }
      }
    } else {
      if (moveLeftInput) moveLeftInput.value = false; //disable move button in rive
      if (moveRightInput) moveRightInput.value = false; // disable move button in rive
      stopSlide.stop();
    }
  }, [leftHold, rightHold, x, step, moveLeftInput, playSlide, stopSlide, moveRightInput]);

  useEffect(() => {
    let interval: any;
    let newX = x - 0.1;
    if (leftHold && posInput && posInput?.value === 0)
      interval = setInterval(() => {
        if (newX >= 0 && newX <= 100) {
          setX(newX);
          if (xAxisInput) xAxisInput.value = newX;
          newX = newX - 0.1;
        }
      }, 1);

    return () => {
      clearInterval(interval);
    };
  }, [leftHold, posInput, step, x, xAxisInput]);

  useEffect(() => {
    let interval: any;
    let newX = x + 0.1;
    if (rightHold && posInput && posInput?.value === 0)
      interval = setInterval(() => {
        if (newX >= 0 && newX <= 100) {
          setX(newX);
          if (xAxisInput) xAxisInput.value = newX;
          newX = newX + 0.1;
        }
      }, 1);

    return () => {
      clearInterval(interval);
    };
  }, [posInput, rightHold, step, x, xAxisInput]);

  //rive movement after getting collecting rewards

  useEffect(() => {
    if (result.status === 'claimed') {
      console.log('claimed');
      setStep(0);
      if (posInput) posInput.value = 0; //set pos 0
      if (resultInput) resultInput.value = 0; //set reward 0
      if (refreshInput) refreshInput.fire(); //fire refresh
    }
  }, [posInput, refreshInput, result, resultInput, setStep]);

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
    if (moveLeftInput?.value) moveLeftInput.value = false;
    if (moveRightInput?.value) moveRightInput.value = false;
    setLeftHold(false);
    setRightHold(false);
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
  }, []);

  useEffect(() => {
    if (xAxisInput) {
      xAxisInput.value = x;
    }
  }, [rive, xAxisInput, x]);

  return (
    <div className="w-full md:w-8/12 lg:w-9/12 bg-green-00 lg:bg-red-00 md:flex justify-center md:items-center relative">
      <div id="game" className="relative w-full h-30vh md:h-80vh bg-indigo-00 lg:h-80vh center">
        <RiveComponent className="w-full h-[80%] md:h-[100%] bg-blue-00" />
        <div
          onClick={() => step === 1 && api.handleCommand('collect reward')}
          className="bg-red-00 h-[10%] w-[15%] lg:w-[10%] absolute z-[1] bottom-10 lg:bottom-5 left-[20%] md:left-[17%] lg:left-[27%]"
        ></div>
        <div
          onMouseDown={() => setLeftHold(true)}
          onMouseUp={() => setLeftHold(false)}
          onTouchStart={() => !rightHold && setLeftHold(!leftHold)}
          className="bg-red-00 h-[5%] w-[7%] lg:w-[5%] absolute z-[1] bottom-[30%] md:bottom-[29%] lg:bottom-[25%] left-[40%] md:left-[40%] lg:left-[42%]"
        ></div>
        <div
          onMouseDown={() => setRightHold(true)}
          onMouseUp={() => setRightHold(false)}
          onTouchStart={() => !leftHold && setRightHold(!rightHold)}
          className="bg-green-00 h-[5%] w-[7%] lg:w-[5%] absolute z-[1] bottom-[30%] md:bottom-[29%] lg:bottom-[25%] left-[50%] md:left-[55%] lg:left-[53%]"
        ></div>
      </div>
    </div>
  );
}

export default Game;
