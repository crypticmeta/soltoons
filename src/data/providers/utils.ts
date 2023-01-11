import axios from 'axios';

export const getVRF = async(user:string) => {
    let data = null;
    await axios.post('https://soltoons-api.vercel.app/api/assign-vrf', {
        user,
        network: process.env.REACT_APP_NETWORK
    }).then(res => {
        if (res.data.vrf) {
            data = res;
            console.log("VRF assigned is ", data)
        }
    }).catch(async(err) => {
        return null;
    });

    return data
   
}