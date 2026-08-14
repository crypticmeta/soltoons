import { useState, useEffect, useCallback } from 'react';
import { Store } from '../../data';
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
function Game({ step, setStep, handleModalOpen, sound, demoResult, isDemo, demoRunning, onDemoPlay, x, setX }) {
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
  const { RiveComponent, rive } = useRive(params, { fitCanvasToArtboardHeight: true });
  const refreshInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Refresh'); //trigger
  const xAxisInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'xAxis'); //number 0-200
  const loadingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Loading'); //boolean
  const moveRightInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'moveRight'); //boolean
  const moveLeftInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'moveLeft'); //boolean
  const resultInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'Result'); //number 0-7
  const posInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'pos'); //number 0/100
  const [leftHold, setLeftHold] = useState(false);
  const [rightHold, setRightHold] = useState(false);

  //@ts-ignore
  const chainResult = useSelector((store: Store) => store.gameState.result);
  const result = demoResult ?? chainResult;
  const canMove = step === 0 && result.status !== 'waiting' && result.status !== 'success' && !demoRunning;

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
    if (canMove && (leftHold || rightHold)) {
      if (moveLeftInput) moveLeftInput.value = leftHold;
      if (moveRightInput) moveRightInput.value = rightHold;
      playSlide();
    } else {
      if (moveLeftInput) moveLeftInput.value = false; //disable move button in rive
      if (moveRightInput) moveRightInput.value = false; // disable move button in rive
      stopSlide.stop();
    }
  }, [canMove, leftHold, moveLeftInput, moveRightInput, playSlide, rightHold, stopSlide]);

  useEffect(() => {
    if (!canMove || (!leftHold && !rightHold)) return;

    const direction = leftHold ? -1 : 1;
    const interval = window.setInterval(() => {
      setX((currentX: number) => Math.max(0, Math.min(100, currentX + direction)));
    }, 20);

    return () => window.clearInterval(interval);
  }, [canMove, leftHold, rightHold, setX]);

  const nudgeClaw = useCallback(
    (direction: -1 | 1) => {
      if (!canMove) return;
      setX((currentX: number) => Math.max(0, Math.min(100, currentX + direction * 12.5)));
    },
    [canMove, setX]
  );

  //rive movement after getting collecting rewards

  useEffect(() => {
    if (result.status === 'claimed') {
      setStep(0);
      if (posInput) posInput.value = 0; //set pos 0
      if (resultInput) resultInput.value = 0; //set reward 0
      if (refreshInput) refreshInput.fire(); //fire refresh
    }
  }, [posInput, refreshInput, result, resultInput, setStep]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Enter') {
      if (isDemo) onDemoPlay();
    }
    if (e.code === 'ArrowRight') {
      if (canMove) setRightHold(true);
    }
    if (e.code === 'ArrowLeft') {
      if (canMove) setLeftHold(true);
    }
  }, [canMove, isDemo, onDemoPlay]);

  const handleKeyUp = useCallback(() => {
    if (moveLeftInput?.value) moveLeftInput.value = false;
    if (moveRightInput?.value) moveRightInput.value = false;
    setLeftHold(false);
    setRightHold(false);
  }, [moveLeftInput, moveRightInput]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (xAxisInput) {
      xAxisInput.value = x;
    }
  }, [rive, xAxisInput, x]);

  return (
    <div className="w-full md:w-8/12 lg:w-9/12 md:flex justify-center md:items-center relative">
      <div
        id="game"
        className="relative w-full xl:w-10/12 2xl:w-11/12 2xl:max-w-[1920px] 2xl:max-h-[1080px] center"
      >
        <RiveComponent className="w-full h-full " />
        <div
          onClick={() => result?.userWon && handleModalOpen()}
          className={`h-[10%]  ${
            result?.userWon ? ' cursor-pointer  glow ' : ''
          } w-[15%] lg:w-[10%] xl:w-[13%] 2xl:w-[20%] absolute z-[1] bottom-[5%] left-[17%] md:left-[17%] lg:left-[17%] xl:left-[17%] 2xl:left-[15%]`}
        ></div>
        <button
          type="button"
          aria-label="Move claw left"
          aria-pressed={leftHold}
          disabled={!canMove}
          onPointerDown={() => !rightHold && setLeftHold(true)}
          onPointerUp={() => setLeftHold(false)}
          onPointerCancel={() => setLeftHold(false)}
          onPointerLeave={() => setLeftHold(false)}
          onBlur={() => setLeftHold(false)}
          onClick={() => nudgeClaw(-1)}
          className="absolute bottom-[28%] left-[40%] z-[1] h-[5%] w-[7%] cursor-pointer touch-none rounded-full border-0 bg-transparent focus:outline-none focus-visible:ring-4 focus-visible:ring-white disabled:cursor-not-allowed md:bottom-[27%] lg:w-[5%]"
        />
        <button
          type="button"
          aria-label="Move claw right"
          aria-pressed={rightHold}
          disabled={!canMove}
          onPointerDown={() => !leftHold && setRightHold(true)}
          onPointerUp={() => setRightHold(false)}
          onPointerCancel={() => setRightHold(false)}
          onPointerLeave={() => setRightHold(false)}
          onBlur={() => setRightHold(false)}
          onClick={() => nudgeClaw(1)}
          className="absolute bottom-[28%] left-[55%] z-[1] h-[5%] w-[7%] cursor-pointer touch-none rounded-full border-0 bg-transparent focus:outline-none focus-visible:ring-4 focus-visible:ring-white disabled:cursor-not-allowed md:bottom-[27%] lg:w-[5%]"
        />
      </div>
    </div>
  );
}

export default Game;
