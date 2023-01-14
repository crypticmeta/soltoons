import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import _ from 'lodash';
import { GameTypeValue } from '../../api';

interface Balances {
  sol?: number;
  token?: number;
}

// Define a type for the slice state
export interface GameState {
  /**
   * The latest known balance of the user's wallet.
   */
  userBalances: Balances;
  /**
   * Boolean indicating whether a load is in progress.
   */
  loading: boolean;
  /**
   * The current mode tha the game is being played with.
   */
  gameMode: GameTypeValue;
  user: any;
  result: any;
  vaultBalance: number;
  userVaultBalance: number;
  tokenmint: string;
  tokenEscrow: {
    publicKey: string;
    balance: number;
  }
}

/**
 * The initial {@linkcode GameState} to set in the data slice.
 */
const initialState: GameState = {
  loading: false,
  gameMode: GameTypeValue.CLAW,
  tokenmint: "CFp7pM2TE1S8WGQo7Wb9qvLogYfTkEJruanSbkFFfEtn",
  tokenEscrow: {
    publicKey: "",
    balance: 0
  },
  userBalances: {},
  user: {},
  result: {},
  vaultBalance: 0,
  userVaultBalance: 0,
};

/**
 * A data slice to control the Ecosystem feature.
 */
const gameStateSlice = createSlice({
  name: 'gameStateSlice',
  initialState: initialState,
  reducers: {
    setUserBalance: (state: GameState, action: PayloadAction<Balances | undefined>) => {
      if (action.payload) {
        // If ribs value changed, update.
        if (!_.isUndefined(action.payload.token)) state.userBalances.token = action.payload.token;
        else state.userBalances.token = 0;
        // If sol value changed, update.
        if (!_.isUndefined(action.payload.sol)) state.userBalances.sol = action.payload.sol;
      } else {
        // Clear user balances.
        state.userBalances.sol = undefined;
        state.userBalances.token = undefined;
      }
    },
    setLoading: (state: GameState, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setTokenEscrow: (state: GameState, action: PayloadAction<{
      publicKey: string;
      balance: number;
    }>) => {
      state.tokenEscrow = action.payload
    },
    setUser: (state: GameState, action: PayloadAction<any>) => {
      state.user = action.payload
    },
    setResult: (state: GameState, action: PayloadAction<any>) => {
      state.result = action.payload
    },
    setVaultBalance: (state: GameState, action: PayloadAction<any>) => {
      state.vaultBalance = action.payload
    },
    setUserVaultBalance: (state: GameState, action: PayloadAction<any>) => {
      state.userVaultBalance = action.payload
    },
    setTokenmint: (state: GameState, action: PayloadAction<string>) => {
      state.tokenmint = action.payload
    },
  },
});

export const { setUserBalance, setLoading, setUser, setResult, setVaultBalance, setUserVaultBalance, setTokenmint, setTokenEscrow } = gameStateSlice.actions;
export default gameStateSlice.reducer;
