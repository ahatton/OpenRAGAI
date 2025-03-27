import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type AlertState = {
  errorAlerts: string[]
  successAlerts: string[]
}

const initialState: AlertState = {
  errorAlerts: [],
  successAlerts: [],
}

export const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addErrorAlert: (state, action: PayloadAction<string>) => {
      state.errorAlerts.push(action.payload)
    },
    addSuccessAlert: (state, action: PayloadAction<string>) => {
      state.successAlerts.push(action.payload)
    },
    removeErrorAlert: (state, action: PayloadAction<string>) => {
      state.errorAlerts = state.errorAlerts.filter(
        (alert) => alert !== action.payload,
      )
    },
    removeSuccessAlert: (state, action: PayloadAction<string>) => {
      state.successAlerts = state.successAlerts.filter(
        (alert) => alert !== action.payload,
      )
    },
  },
})

export const addAndRemoveErrorAlert = (message: string) => {
  return (dispatch: any) => {
    dispatch(addErrorAlert(message))
    setTimeout(() => {
      dispatch(removeErrorAlert(message))
    }, 6000)
  }
}

export const addAndRemoveSuccessAlert = (message: string) => {
  return (dispatch: any) => {
    dispatch(addSuccessAlert(message))
    setTimeout(() => {
      dispatch(removeSuccessAlert(message))
    }, 6000)
  }
}

export const {
  addErrorAlert,
  addSuccessAlert,
  removeErrorAlert,
  removeSuccessAlert,
} = alertSlice.actions
