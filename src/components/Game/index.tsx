import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
const TOKENMINT = new PublicKey('So11111111111111111111111111111111111111112');
//@ts-ignore
function Game({ amount, setAmount }) {
  const [x, setX] = useState(0);
  const [styleX, setStyleX] = useState({ transform: "translateX(50%)" })
  const [leftHold, setLeftHold] = useState(false)
  const [rightHold, setRightHold] = useState(false);

  useEffect(() => {
    setStyleX({ transform: `translateX(${x}%)` });
  }, [x])

  useEffect(() => {
    let interval:any;
    let newX = x - 2;
    if(leftHold)
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
  
  
  
  return (
    <div className="w-full lg:w-9/12 bg-red center py-16 lg:py-0">
      <div id="game" className="relative">
        <img className="w-[500px]" src="/assets/images/body.png" />
        <div id="screen" className="absolute top-[60px] left-[60px] bg-red-00 overflow-hidden">
          <img className="w-[380px]" src="/assets/images/inside_machine.png" />

          <div className="bg-gray-900 top-[0px] absolute h-[10px]  w-[87%] left-[25px] p-1 z-[10]"></div>
          <div id="claw" style={styleX} className="absolute z-[1] bg-green-00 w-[85%] top-[10px] left-[25px]">
            <div className="relative">
              <img className="w-[50px] absolute z-[1]" src="/assets/images/claw_base.png" />
              <div id="pipe" className="absolute  bg-red-00 h-[150px]  left-[20px] top-[-60px]">
                <img className="  w-[10px]" src="/assets/images/pipe.png" />
                <img className="w-[30px] ml-[-6.5px] mt-[-2px] " src="/assets/images/claw_open.png" />
              </div>
            </div>
          </div>
          <div id="prizes" className="absolute bg-green-00 w-[90%] z-[2] bottom-[15px] left-[20px] overflow-hidden">
            <div className="relative flex w-full">
              <img className="w-full " src="/assets/images/prizes.png" />
            </div>
          </div>
          <div className="absolute top-0 z-[3]">
            <img src="/assets/images/glass.png" />
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
            <img className="w-[30px]" src="/assets/images/play_default.png" alt="" />
            <img
              className="w-[20px] cursor-pointer"
              src={`${rightHold ? '/assets/images/right_pushed.png' : '/assets/images/right_button_default.png'}`}
              onMouseDown={() => setRightHold(true)}
              onMouseUp={() => setRightHold(false)}
              alt=""
            />
          </div>
        </div>
        <div id="texts" className="p-3 bg-red-0 bg-opacity-30 absolute top-[350px] left-[40px] w-[40%]">
          <div className="relative flex justify-between  bg-green-00 bg-opacity-70">
            <div className="text-center bg-yellow-0 w-9/12">
              <div className="text-center font-extrabold">Bet Amount</div>
              <div className="text-sm font-bold">{amount} SOL</div>
            </div>
            <div className="text-center center uppercase font-extrabold text-2xl">GO</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Game;
