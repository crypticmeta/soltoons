import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { hooks, Store } from '../../data';
import { useSelector } from 'react-redux';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import useSound from 'use-sound';
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
      //sound
      const [playWin, stopWin] = useSound('/assets/audio/win.mp3', {
        volume: 1,
      });
      const [playSlide, stopSlide] = useSound('/assets/audio/slide.mp3', {
        volume: 1,
      });
      //rive
      const STATE_MACHINE_NAME = 'State Machine 1';
      const INPUT_NAME = 'Trigger 1';
      const params = {
        src: '/assets/rive/loading.riv',
        autoplay: true,
        stateMachines: STATE_MACHINE_NAME,
      };
      const { RiveComponent, rive } = useRive(params);
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
     useEffect(() => {
       if (leftHold || rightHold) {
         let newX = x;
         if (leftHold && step < 3) {
           newX = x - 2;
           if (newX >= -5 && newX <= 85) {
             playSlide();
             console.log('playing sound');
           } else {
             stopSlide.stop();
           }
         } else if (rightHold && !step) {
           newX = x + 2;
           if (newX >= -5 && newX <= 85) {
             playSlide();
             console.log('playing sound');
           } else {
             stopSlide.stop();
           }
         }
       } else {
         stopSlide.stop();
       }
     }, [leftHold, rightHold, x, step]);
  
      useEffect(() => {
        if (x <= -9 && result?.status === 'success') {
          //('setting leftHold false and moving to step 2 for small screen');
          setLeftHold(false);
          setStep(3);
        }
        if (result?.status === 'success')
          setStyleX({ transform: `translateX(${x}%)`, zIndex: 10, animationName: 'none' });
        else setStyleX({ transform: `translateX(${x}%)`, zIndex: 1, animationName: 'none' });
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
        if (result && result.status === 'waiting')
          setStyleY({ transform: `translateY(${y}%)`, animationName: 'vertical' });
        else setStyleY({ transform: `translateY(${y}%)`, animationName: 'none' });
        // if (y !== 0)
        //   setTimeout(() => {
        //     setY(0);
        //   }, 2000);
      };

      useEffect(() => {
        movedown();
      }, [y]);

      useEffect(() => {
        let interval: any;
        let newX = x - 2;
        if (leftHold && step < 3)
          interval = setInterval(() => {
            if (newX >= -10 && newX <= 85) {
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
            if (newX >= -10 && newX <= 85) {
              setX(newX);
              newX = newX - 2;
            }
          }, 100);

        return () => clearInterval(interval);
      }, [rightHold, x]);

      useEffect(() => {
        if (fireInput) {
          fireInput?.fire();
          setTimeout(() => {
            fireInput?.fire();
          }, 600);
        }
      }, [fireInput, rive]);

      useEffect(() => {
        if (result.status === 'claimed') {
          fireInput?.fire();
          setStyleReward({ animationName: 'none' });
          setStyleRewardItem({ animationName: 'none' });
          setStep(0);
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
             playWin();
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

      return (
        <div className="w-full lg:w-9/12 bg-red justify-center items-center py-16 lg:py-0 flex md:hidden bg-red-00">
          <div id="game" className="relative">
            <img className={`w-[300px]`} src="/assets/images/body.png" alt="" />
            <div id="screen" className={`absolute top-[35px] left-[35px] bg-red-00 overflow-hidden`}>
              <img className={`w-[230px]`} src="/assets/images/inside_machine.png" alt="" />

              <div className={`bg-gray-900 top-[0px] absolute h-[10px]  w-[87%] left-[20px] p-1 z-[10]`}></div>
              <div id="claw" style={styleX} className="absolute bg-green-00 w-[85%] top-[10px] left-[25px]">
                <div className="relative">
                  <img className="w-[40px] absolute z-[1]" src="/assets/images/claw_base.png" alt="" />
                  <div
                    id="pipe"
                    style={styleY}
                    className="absolute  bg-red-00 h-[183px]  pl-[15px] top-[-70px] overflow-hidden"
                  >
                    <img className="  w-[10px]" src="/assets/images/pipe.png" alt="" />
                    <img
                      className="w-[30px] ml-[-6.0px] mt-[-2px] "
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
                        className="w-[20px] ml-[-3.5px] mt-[-50%] rotate-45 "
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
                className={`absolute h-full bg-green-00 w-[90%] z-[6] bottom-[7px] left-[12px] overflow-hidden`}
              >
                <RiveComponent className="bg-red-00 bg-opacity-40 h-[108%]" />
              </div>
              <div id="container" className="absolute bottom-[8px] z-[7] left-[10px] bg-pink-00">
                <img alt="" src="/assets/images/container.png" className="bg-green-00 w-[30px]" />
              </div>
              <div className="absolute top-0 z-[3] cursor-pointer">
                <img src="/assets/images/glass.png" alt="" />
              </div>
            </div>
            <div id="buttons" className={`p-0 bg-red-00 absolute top-[172px] left-[80px] w-[50%]`}>
              <div className="relative flex justify-around px-2 py-1 bg-red-00 bg-opacity-70">
                <img
                  className="w-[15px] bg-red-00 cursor-pointer"
                  onClick={() => !rightHold && setLeftHold(!leftHold)}
                  src={`${leftHold ? '/assets/images/left_pushed.png' : '/assets/images/left_button_default.png'}`}
                  alt=""
                />
                <img
                  className="w-[25px] cursor-pointer"
                  src={'/assets/images/play_default.png'}
                  onClick={() => {
                    api.handleCommand(`user play 1 ${amount}`);
                  }}
                  alt=""
                />
                <img
                  className="w-[15px] cursor-pointer"
                  src={`${rightHold ? '/assets/images/right_pushed.png' : '/assets/images/right_button_default.png'}`}
                  onClick={() => !leftHold && setRightHold(!rightHold)}
                  alt=""
                />
              </div>
            </div>
            <div id="texts" className="-m-[6px] bg-red-00 bg-opacity-60 absolute top-[220px] left-[30px] w-[28%]">
              <div className="relative flex justify-between  bg-green-00 bg-opacity-70">
                <div className="text-center bg-yello relative">
                  <img alt="" src="/assets/images/collect.png" />
                  {reward && step === 4 && (
                    <img
                      onClick={handleModalOpen}
                      className="w-[20px] z-20 absolute bottom-[5px] left-[30px] cursor-pointer"
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
