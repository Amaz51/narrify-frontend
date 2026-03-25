import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import audiobookReducer from './slices/audiobookSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        audiobook: audiobookReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // allow File objects in wizard state (Zustand)
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
