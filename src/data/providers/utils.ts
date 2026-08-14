import axios from 'axios';

export const getVRF = async (user: string) => {
  const gameApi = process.env.REACT_APP_GAME_API;
  if (!gameApi) return null;

  try {
    const response = await axios.post(`${gameApi}/api/assign-vrf`, {
      user,
      network: process.env.REACT_APP_NETWORK === 'mainnet-beta' ? 'mainnet' : 'devnet',
    });

    return response.data.vrf ?? null;
  } catch {
    return null;
  }
};
