import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authAPI } from '@/lib/api'
import { AuthState } from '@/types'

const initialState: AuthState = { user: null, token: null, loading: false, error: null }

export const loginThunk = createAsyncThunk('auth/login', async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const res = await authAPI.login(email, password)
    return res.data.data
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

export const registerThunk = createAsyncThunk('auth/register', async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue }) => {
  try {
    const res = await authAPI.register(name, email, password)
    return res.data.data
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed')
  }
})

export const loadMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return rejectWithValue('No token')
    const res = await authAPI.me()
    return { user: res.data.data, token }
  } catch (err: any) {
    return rejectWithValue('Session expired')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => { state.user = action.payload },
    setCredentials: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      if (typeof window !== 'undefined') localStorage.setItem('token', action.payload.token)
    },
    logout: (state) => {
      state.user = null; state.token = null
      if (typeof window !== 'undefined') localStorage.removeItem('token')
    },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(loginThunk.fulfilled, (s, a) => {
        s.loading = false; s.user = a.payload.user; s.token = a.payload.token
        if (typeof window !== 'undefined') localStorage.setItem('token', a.payload.token)
      })
      .addCase(loginThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(registerThunk.pending, (s) => { s.loading = true; s.error = null })
      .addCase(registerThunk.fulfilled, (s, a) => {
        s.loading = false; s.user = a.payload.user; s.token = a.payload.token
        if (typeof window !== 'undefined') localStorage.setItem('token', a.payload.token)
      })
      .addCase(registerThunk.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(loadMeThunk.pending, (s) => { s.loading = true })
      .addCase(loadMeThunk.fulfilled, (s, a) => {
        s.loading = false; s.user = a.payload.user; s.token = a.payload.token
      })
      .addCase(loadMeThunk.rejected, (s) => {
        s.loading = false; s.user = null; s.token = null
        if (typeof window !== 'undefined') localStorage.removeItem('token')
      })
  },
})

export const { setCredentials, logout, clearError,setUser } = authSlice.actions
export default authSlice.reducer
