import React from 'react';
import { Provider, useDispatch } from 'react-redux';
import { ThunkDispatch } from '../types';
import useApi, { ApiProvider } from './providers/ApiProvider';
import store from './store';
import { setUserBalance, setLoading, setUser, setResult, setVaultBalance, setDiscount, setUserVaultBalance, setTokenmint, setTokenEscrow } from './store/gameStateReducer';
import { log } from './store/hudLoggerReducer';

const DataLayer: React.FC<React.PropsWithChildren> = (props) => (
  // Store must be provided before ApiProvider so that ApiProvider can dispatch results.
  <Provider store={store}>
    <ApiProvider>{props.children} </ApiProvider>
  </Provider>
);

const useThunkDispatch = (): ThunkDispatch => useDispatch();

export const hooks = {
  useApi,
  useThunkDispatch,
};

export const thunks = {
  log,
  setUserBalance,
  setUserVaultBalance,
  setLoading,
  setUser,
  setResult,
  setVaultBalance,
  setTokenmint,
  setTokenEscrow,
  setDiscount
};

export type Store = ReturnType<typeof store.getState>;

export default DataLayer;
