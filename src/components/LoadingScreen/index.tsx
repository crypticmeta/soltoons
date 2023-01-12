import React from 'react'

function index(props:any) {
  return (
    <div style={props.style} id="loading" className="absolute z-50 h-screen w-full bg-yellow-700 text-white center">
      <div className='bg-red-0 w-[500px] rotate-90'>
        <img src="/assets/images/coin-transparent.gif" alt="loading..." />
      </div>
    </div>
  );
}

export default index