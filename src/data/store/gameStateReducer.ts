import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import _ from 'lodash';
import { GameTypeValue } from '../../api';

interface Balances {
  sol?: number;
  ribs?: number;
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
}

/**
 * The initial {@linkcode GameState} to set in the data slice.
 */
const initialState: GameState = {
  loading: false,
  gameMode: GameTypeValue.TWENTY_SIDED_DICE_ROLL,
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
        if (!_.isUndefined(action.payload.ribs)) state.userBalances.ribs = action.payload.ribs;
        else state.userBalances.ribs = 0;
        // If sol value changed, update.
        if (!_.isUndefined(action.payload.sol)) state.userBalances.sol = action.payload.sol;
      } else {
        // Clear user balances.
        state.userBalances.sol = undefined;
        state.userBalances.ribs = undefined;
      }
    },
    setLoading: (state: GameState, action: PayloadAction<boolean>) => {
      console.log('setting loading = ', action.payload)
      state.loading = action.payload
    },
    setUser: (state: GameState, action: PayloadAction<any>) => {
      // console.log('setting user = ', action.payload)
      state.user = action.payload
    },
    setResult: (state: GameState, action: PayloadAction<any>) => {
      console.log('setting result = ', action.payload)
      state.result = action.payload
    },
    setVaultBalance: (state: GameState, action: PayloadAction<any>) => {
      console.log('setting vault balance = ', action.payload)
      state.vaultBalance = action.payload
    },
    setUserVaultBalance: (state: GameState, action: PayloadAction<any>) => {
      console.log('setting user vault balance = ', action.payload)
      state.vaultBalance = action.payload
    },
  },
});

export const { setUserBalance, setLoading, setUser, setResult, setVaultBalance, setUserVaultBalance } = gameStateSlice.actions;
export default gameStateSlice.reducer;
