import axios from 'axios';

export const getVRF = async(user:string) => {
    let data = null;
    await axios.post('https://soltoons-api.vercel.app/api/assign-vrf', {
        user,
        network: process.env.REACT_APP_NETWORK==="devnet"?"devnet":"mainnet"
    }).then(res => {
        if (res.data.vrf) {
            data = res.data.vrf;
        }
    }).catch(async(err) => {
        return null;
    });

    return data
   
}