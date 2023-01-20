import axios from 'axios';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react'
import { tokenInfoMap } from '../../data/providers/tokenProvider';

function Index() {
    const [events, setEvents] = useState<any>([ ]);
     const getRecentPlays = useCallback(async () => {
         try {
           const to_date=moment().format('YYYY-MM-DD')
           const from_date= moment().subtract(1, 'day').format('YYYY-MM-DD')
         const res = await axios.post("https://soltoons-api.vercel.app/api/get-recent-plays", {from_date, to_date})
        //  const body = await res.data.json();

           if (res.data?.events) {
             console.log(res.data.events, 'EVE')
           setEvents(res.data.events);
         } else {
           setEvents([]);
         }
       } catch (error) {
         console.error(error);
         setEvents([]);
       }
     }, []);
    
    useEffect(() => {
      getRecentPlays()
    }, [])
  return (
    <div className="h-screen p-6 lg:px-24 ">
      <div className="text-center text-lg tracking-wider center font-bold pb-4 uppercase">
        <p className="px-4 py-2 bg-brand_yellow  border-4 border-black">24 Hour Stat ({events.length} Rounds Played)</p>
      </div>
      {events.length ? (
        <div className="h-80vh overflow-y-scroll px-6 small-scrollbar">
          {events &&
            events.length &&
            events
              .sort((a: any, b: any) => b.time - a.time)
              .filter((a: any) => a.properties.network !== 'devnet')
              .map((item: any) => (
                <div key={item.properties.id + item.time}>
                  <a
                    target={'_blank'}
                    href={`https://explorer.solana.com/tx/${item.properties.id}`}
                    className={`${
                      item.properties.multiplier !== 0
                        ? item.properties.multiplier >= 1
                          ? ' bg-brand_yellow font-bold'
                          : ' bg-blue-400 font-light'
                        : ' bg-gray-400 font-light'
                    } p-3 mb-3 rounded shadow-xl flex bg-opacity-70 justify-between hover:bg-opacity-100`}
                    rel="noreferrer"
                  >
                    <div className="flex w-8/12">
                      <p className="w-2/12">
                        {item.properties.walletId.substring(0, 4)}...
                        {item.properties.walletId.substring(
                          item.properties.walletId.length - 4,
                          item.properties.walletId.length
                        )}
                      </p>
                      <p className="w-2/12">
                        Bet {item.properties.bet / Math.pow(10, tokenInfoMap.get(item.properties.mint)?.decimals || 9)}{' '}
                        {tokenInfoMap.get(item.properties.mint)?.symbol}
                      </p>
                      <p className="w-2/12">
                        {item.properties.multiplier === 0
                          ? 'And lost '
                          : ('And Won ' +
                          (item.properties.change /
                          Math.pow(10, tokenInfoMap.get(item.properties.mint)?.decimals || 9)) + " " +
                            tokenInfoMap.get(item.properties.mint)?.symbol)}{' '}
                        {/* {tokenInfoMap.get(item.properties.mint)?.symbol} */}
                      </p>
                    </div>
                    <p className="w-1/12 text-2xl font-bold text-right">{item.properties.multiplier}x</p>
                    {/* <p>{item.properties.id.substring(0, 7)}</p> */}
                  </a>
                </div>
              ))}
        </div>
      ) : (
        <div className="text-white text-center">NONE</div>
      )}
    </div>
  );
}

export default Index