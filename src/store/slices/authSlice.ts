import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';
import { authApi, UserProfile, LoginPayload, RegisterPayload, UpdateProfilePayload } from '@/lib/api/auth';

interface AuthState {
    user: UserProfile | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

function getInitialTokens() {
    if (typeof window === 'undefined') return { access: null, refresh: null };
    return {
        access: Cookies.get('access_token') || null,
        refresh: Cookies.get('refresh_token') || null,
    };
}

const tokens = getInitialTokens();

const initialState: AuthState = {
    user: null,
    accessToken: tokens.access,
    refreshToken: tokens.refresh,
    isAuthenticated: !!tokens.access,
    isLoading: false,
    error: null,
};

export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials: LoginPayload, { rejectWithValue }) => {
        try {
            const data = await authApi.login(credentials);
            Cookies.set('access_token', data.access, { expires: 1 });
            Cookies.set('refresh_token', data.refresh, { expires: 7 });
            return data;
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Invalid credentials.'
            );
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (payload: RegisterPayload, { rejectWithValue }) => {
        try {
            const data = await authApi.register(payload);
            Cookies.set('access_token', data.access, { expires: 1 });
            Cookies.set('refresh_token', data.refresh, { expires: 7 });
            return data;
        } catch (err: any) {
            const errData = err.response?.data;
            const message =
                typeof errData === 'string'
                    ? errData
                    : errData?.detail ||
                      Object.values(errData || {})
                          .flat()
                          .join(' ') ||
                      'Registration failed.';
            return rejectWithValue(message);
        }
    }
);

export const fetchUserProfile = createAsyncThunk(
    'auth/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            return await authApi.getProfile();
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Failed to fetch profile.'
            );
        }
    }
);

export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (payload: UpdateProfilePayload, { rejectWithValue }) => {
        try {
            return await authApi.updateProfile(payload);
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Failed to update profile.'
            );
        }
    }
);

export const googleLogin = createAsyncThunk(
    'auth/googleLogin',
    async (credential: string, { rejectWithValue }) => {
        try {
            const data = await authApi.googleAuth(credential);
            Cookies.set('access_token', data.access, { expires: 1 });
            Cookies.set('refresh_token', data.refresh, { expires: 7 });
            return data;
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Google sign-in failed.'
            );
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { getState }) => {
        const state = getState() as { auth: AuthState };
        const refresh = state.auth.refreshToken;
        try {
            if (refresh) await authApi.logout(refresh);
        } catch {
            // ignore API errors on logout
        }
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError(state) {
            state.error = null;
        },
        setTokens(
            state,
            action: PayloadAction<{ access: string; refresh: string }>
        ) {
            state.accessToken = action.payload.access;
            state.refreshToken = action.payload.refresh;
            state.isAuthenticated = true;
            Cookies.set('access_token', action.payload.access, { expires: 1 });
            Cookies.set('refresh_token', action.payload.refresh, {
                expires: 7,
            });
        },
    },
    extraReducers: (builder) => {
        // login
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.accessToken = action.payload.access;
                state.refreshToken = action.payload.refresh;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // register
        builder
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.accessToken = action.payload.access;
                state.refreshToken = action.payload.refresh;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // google login
        builder
            .addCase(googleLogin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(googleLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.accessToken = action.payload.access;
                state.refreshToken = action.payload.refresh;
            })
            .addCase(googleLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // fetch profile
        builder.addCase(fetchUserProfile.fulfilled, (state, action) => {
            state.user = action.payload;
        });

        // update profile
        builder
            .addCase(updateProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // logout
        builder.addCase(logoutUser.fulfilled, (state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
        });
    },
});

export const { clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;
