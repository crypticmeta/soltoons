import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { hooks, Store, thunks } from '../../data';
import { useSelector } from 'react-redux';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import useSound from 'use-sound';
const TOKENMINT = new PublicKey('So11111111111111111111111111111111111111112');

    const plushies = {
      '0.0': { img: '' },
      '0.3': { img: '/assets/images/bwbanana.png' },
      '0.8': { img: '/assets/images/bwskull.png' },
      '1.0': { img: '/assets/images/bwcap.png' },
      '2.0': { img: '/assets/images/bwtoobs.png' },
      '5.0': { img: '/assets/images/bwsnake.png' },
      '8.0': { img: '/assets/images/banana.png' },
      '10.0': { img: '/assets/images/skull.png' },
      '25.0': { img: '/assets/images/cap.png' },
      '50.0': { img: '/assets/images/toobs.png' },
      '100.0': { img: '/assets/images/snake.png' },
    };
//@ts-ignore
function Game({ amount, setAmount, step, setStep, handleModalOpen }) {
  //rive
  const STATE_MACHINE_NAME = 'State Machine 1';
  const INPUT_NAME = 'Trigger 1';
  const params = {
    src: '/assets/rive/loading.riv',
    autoplay: true,
    stateMachines: STATE_MACHINE_NAME,
  };
  const { RiveComponent, rive } = useRive(params);
  // console.log(rive, 'rive')
  const fireInput = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_NAME);
  //api
  const api = hooks.useApi();
  const [x, setX] = useState(0);
  const [styleX, setStyleX] = useState({ transform: 'translateX(0%)', zIndex: 1, animationName: 'none' });
  const [y, setY] = useState(0);
  const [styleY, setStyleY] = useState({ transform: 'translateY(0%)', animationName: 'none' });
  const [styleReward, setStyleReward] = useState({ animationName: 'none' });
  const [styleRewardItem, setStyleRewardItem] = useState({ animationName: 'none' });
  const [leftHold, setLeftHold] = useState(false);
  const [rightHold, setRightHold] = useState(false);

  const [reward, setReward] = useState('');

  const result = useSelector((store: Store) => store.gameState.result);
  const user = useSelector((store: Store) => store.gameState.user);
  const logs = useSelector((store: Store) => store.HUDLogger.logs);

  useEffect(() => {
    if (x <= -4 && result?.status === 'success') {
      console.log('setting leftHold false and moving to step 2')
      setLeftHold(false);
      setStep(3)
    }
    if (result?.status === 'success') setStyleX({ transform: `translateX(${x}%)`, zIndex: 10, animationName: 'none' });
    else setStyleX({ transform: `translateX(${x}%)`, zIndex: 1, animationName: 'none' });
  }, [result, x]);

  useEffect(() => {
    if (result.status === 'waiting') {
      if (x < 0) {
        setX(0)
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
        // console.log(newX, 'new x value');
        if (newX >= -5 && newX <= 85) {
          // console.log('new x is valid');
          setX(newX);
          newX = newX - 2;
        }
      }, 100);

    return () => clearInterval(interval);
  }, [rightHold, x]);

  //rive movement after loading user
  useEffect(() => {
    if (fireInput) {
      // console.log('fire');
      fireInput?.fire();
      setTimeout(() => {
        // console.log('fire 2');
        fireInput?.fire();
      }, 600);
   }
  }, [fireInput, rive]);

  //rive movement after getting collecting rewards

  useEffect(() => {
    if (result.status === 'claimed') {
      fireInput?.fire();
      setStyleReward({ animationName: 'none' });
      setStyleRewardItem({ animationName: 'none' });
      setStep(0);
      //@ts-ignore
      setReward('');
      setTimeout(() => {
        fireInput?.fire();
        setTimeout(() => {
          fireInput?.fire();
        }, 500);
      }, 2000);
    }
  }, [result, fireInput]);

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
  }, [reward, step])
  

  // console.log(step, 'step');
  // console.log(styleReward, 'reward style animation check');
  // console.log(styleRewardItem, 'reward style item animation check');
  // console.log(styleX, 'claw X style');
  
  console.log(reward, step, 'reward, step');
  // console.log(x, styleX)
  return (
    <div className="w-full lg:w-9/12 bg-red justify-center items-center py-16 lg:py-0 hidden 2xl:hidden md:flex">
      <div id="game" className="relative">
        <img className="w-[500px]" src="/assets/images/body.png" alt="" />
        <div id="screen" className="absolute top-[60px] left-[60px] bg-red-00 overflow-hidden">
          <img className="w-[380px]" src="/assets/images/inside_machine.png" alt="" />
          <div className="bg-gray-900 top-[0px] absolute h-[10px]  w-[87%] left-[25px] p-1 z-[10]"></div>
          <div id="claw" style={styleX} className="absolute bg-green-00 w-[85%] top-[10px] left-[25px]">
            <div className="relative ">
              <img className="w-[50px] absolute z-[1]" src="/assets/images/claw_base.png" alt="" />
              <div
                id="pipe"
                style={styleY}
                className="absolute  bg-red-00 h-[253px]  pl-[20px] top-[-60px] overflow-hidden"
              >
                <img className="  w-[10px]" src="/assets/images/pipe.png" alt="" />
                <img
                  className="w-[30px] ml-[-10px] mt-[-2px] "
                  src={`${reward ? '/assets/images/claw_closed.png' : '/assets/images/claw_open.png'}`}
                  alt=""
                />
                <div
                  id="reward"
                  style={styleReward}
                  onAnimationEnd={() => {
                    //@ts-ignore
                    setStyleReward({ animationName: 'none', transform: 'translateY(100%)' });
                  }}
                  className="relative bg-red-00 bg-opacity-25 w-full h-[100%]"
                >
                  <img
                    style={styleRewardItem}
                    className="w-[40px] ml-[-6.5px] mt-[-50%] rotate-45 "
                    //@ts-ignore
                    src={reward}
                    // src={plushies['100.0'].img}
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            id="prizes"
            className="absolute bg-green-00 w-[100%] z-[6] bottom-[15px] left-[0px] h-full overflow-hidden"
          >
            <RiveComponent className="bg-red-00 bg-opacity-40 h-[108%]" />
          </div>
          <div id="container" className="absolute bottom-[13px] z-[7] left-[18px] bg-pink-00">
            <img alt="" src="/assets/images/container.png" className="bg-green-00 w-[40px]" />
          </div>
          <div className="absolute top-0 z-[10] cursor-pointer">
            <img src="/assets/images/glass.png" alt="" />
          </div>
        </div>
        <div id="buttons" className="p-3 bg-red-00 absolute top-[280px] left-[120px] w-[50%]">
          <div className="relative flex justify-evenly px-16 py-1 bg-red-00 bg-opacity-70">
            <img
              className="w-[20px] bg-red-00 cursor-pointer"
              onMouseDown={() => setLeftHold(true)}
              onMouseUp={() => setLeftHold(false)}
              src={`${leftHold ? '/assets/images/left_pushed.png' : '/assets/images/left_button_default.png'}`}
              alt=""
            />
            <img
              className="w-[30px] cursor-pointer"
              src={'/assets/images/play_default.png'}
              onClick={() => {
                api.handleCommand(`user play 1 ${amount}`);
              }}
              alt=""
            />
            <img
              className="w-[20px] cursor-pointer"
              src={`${rightHold ? '/assets/images/right_pushed.png' : '/assets/images/right_button_default.png'}`}
              onMouseDown={() => setRightHold(true)}
              onMouseUp={() => setRightHold(false)}
              alt=""
            />
          </div>
        </div>
        <div id="texts" className="py-2 bg-red-00 bg-opacity-60 absolute top-[350px] left-[40px] w-[28%]">
          <div className="relative flex justify-between  bg-green-00 bg-opacity-70">
            <div className="text-center bg-yello relative">
              <img alt="" src="/assets/images/collect.png" />

              {reward && step === 4 && (
                <img
                  onClick={handleModalOpen}                  
                  className="w-[30px] z-20 absolute bottom-[10px] left-[55px] cursor-pointer"
                  //@ts-ignore
                  src={reward}
                  // src={plushies['50.0'].img}
                  alt=""
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Game;
