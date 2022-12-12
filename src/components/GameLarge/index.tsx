import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { hooks, Store, thunks } from '../../data';
import { useSelector } from 'react-redux';
const TOKENMINT = new PublicKey('So11111111111111111111111111111111111111112');
//@ts-ignore
function Game({ amount, setAmount }) {
  const api = hooks.useApi();
  const [x, setX] = useState(0);
  const [styleX, setStyleX] = useState({ transform: 'translateX(0%)' });
  const [y, setY] = useState(0);
  const [styleY, setStyleY] = useState({ transform: 'translateY(0%)', animationName: 'none' });
  const [leftHold, setLeftHold] = useState(false);
  const [rightHold, setRightHold] = useState(false);

  const result = useSelector((store: Store) => store.gameState.result);

  const plushies = {
    '0.0': { img: '' },
    '0.5': { img: '/assets/images/Assets-03.png' },
    '0.2': { img: '/assets/images/Assets-03.png' },
    '0.8': { img: '/assets/images/Assets-03.png' },
    '1.0': { img: '/assets/images/Assets-04.png' },
    '1.5': { img: '/assets/images/Assets-04.png' },
    '2.0': { img: '/assets/images/Assets-06.png' },
    '3.0': { img: '/assets/images/Assets-06.png' },
    '5.0': { img: '/assets/images/Assets-07.png' },
  };

  useEffect(() => {
    setStyleX({ transform: `translateX(${x}%)` });
  }, [x]);

  useEffect(() => {
    if (result.status === 'waiting') {
      setY(50);
    } else {
      setY(0);
    }
  }, [result]);

  const movedown = () => {
    if (result && result.status === 'waiting') setStyleY({ transform: `translateY(${y}%)`, animationName: 'vertical' });
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
    if (leftHold)
      interval = setInterval(() => {
        console.log(newX, 'new x value');
        if (newX >= 0 && newX <= 85) {
          console.log('new x is valid');
          setX(newX);
          newX = newX - 2;
        }
      }, 100);

    return () => clearInterval(interval);
  }, [leftHold, x]);

  useEffect(() => {
    let interval: any;
    let newX = x + 2;
    if (rightHold)
      interval = setInterval(() => {
        console.log(newX, 'new x value');
        if (newX >= 0 && newX <= 85) {
          console.log('new x is valid');
          setX(newX);
          newX = newX - 2;
        }
      }, 100);

    return () => clearInterval(interval);
  }, [rightHold, x]);

  console.log(result, 'result');

  return (
    <div className="w-full lg:w-9/12 bg-red-00 justify-center items-center py-16 lg:py-0 hidden 2xl:flex">
      <div id="game" className="relative">
        <img className="w-[700px]" src="/assets/images/body.png" alt="" />
        <div id="screen" className="absolute top-[80px] left-[80px] bg-red-00 overflow-hidden">
          <img className="w-[560px]" src="/assets/images/inside_machine.png" alt="" />

          <div className="bg-gray-900 top-[0px] absolute h-[12px]  w-[87%] left-[35px] p-1 z-[10]"></div>
          <div id="claw" style={styleX} className="absolute z-[1] bg-green-00 w-[85%] top-[10px] left-[35px]">
            <div className="relative">
              <img className="w-[80px] absolute z-[1]" src="/assets/images/claw_base.png" alt="" />
              <div id="pipe" style={styleY} className="absolute  bg-red-00 h-[150px]  left-[35px] top-[-50px]">
                <img className="  w-[10px]" src="/assets/images/pipe.png" alt="" />
                <img
                  className="w-[40px] ml-[-15px] mt-[-2px] "
                  src={`${
                    result && result.status === 'success'
                      ? '/assets/images/claw_closed.png'
                      : '/assets/images/claw_open.png'
                  }`}
                  alt=""
                />
                <div className="relative w-full ">
                  <img
                    className="w-[60px] z-50 ml-[-6.5px] mt-[-50%] rotate-45 "
                    //@ts-ignore
                    src={plushies[result?.multiplier || '0.0'].img}
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
          <div id="prizes" className="absolute bg-green-00 w-[90%] z-[2] bottom-[23px] left-[28px] overflow-hidden">
            <div className="relative flex w-full">
              <img className="w-full " src="/assets/images/prizes.png" alt="" />
            </div>
          </div>
          <div className="absolute top-0 z-[3] cursor-pointer">
            <img src="/assets/images/glass.png" alt="" />
          </div>
        </div>
        <div id="buttons" className="p-3 bg-red-00 absolute top-[400px] left-[170px] w-[50%]">
          <div className="relative flex justify-evenly px-16 py-1 bg-red-00 bg-opacity-70">
            <img
              className="w-[25px] bg-red-00 cursor-pointer"
              onMouseDown={() => setLeftHold(true)}
              onMouseUp={() => setLeftHold(false)}
              src={`${leftHold ? '/assets/images/left_pushed.png' : '/assets/images/left_button_default.png'}`}
              alt=""
            />
            <img
              className="w-[35px] cursor-pointer"
              src={'/assets/images/play_default.png'}
              onClick={() => {
                api.handleCommand(`user play 1 ${amount}`);
              }}
              alt=""
            />
            <img
              className="w-[25px] cursor-pointer"
              src={`${rightHold ? '/assets/images/right_pushed.png' : '/assets/images/right_button_default.png'}`}
              onMouseDown={() => setRightHold(true)}
              onMouseUp={() => setRightHold(false)}
              alt=""
            />
          </div>
        </div>
        <div id="texts" className="p-3 bg-red-0 bg-opacity-30 absolute top-[508px] left-[40px] w-[40%]">
          <div className="relative flex justify-between  bg-green-00 bg-opacity-70">
            <div className="text-center bg-yellow-00 w-[65%]">
              <div className="text-center font-extrabold">Bet Amount</div>
              <div className="flex justify-center bg-green-00 items-center  text-sm font-bold ">
                <input
                  className=" bg-transparent w-[35%] focus:outline-none"
                  onChange={(e) => setAmount(e.target.value)}
                  value={amount}
                />
                <span> SOL</span>
              </div>
            </div>
            <div
              className="text-center center uppercase font-extrabold text-2xl cursor-pointer"
              onClick={() => {
                api.handleCommand(`user play 1 ${amount}`);
              }}
            >
              GO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Game;
