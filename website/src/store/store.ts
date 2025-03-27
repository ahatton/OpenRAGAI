import { configureStore } from '@reduxjs/toolkit'
import { alertSlice } from './alertSlice'

export const store = configureStore({
  reducer: {
    alerts: alertSlice.reducer,
  },
})
