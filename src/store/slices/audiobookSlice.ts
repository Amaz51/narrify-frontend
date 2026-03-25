import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { audiobookApi, Audiobook, AudiobookDetail } from '@/lib/api/audiobooks';

interface AudiobookState {
    audiobooks: Audiobook[];
    currentAudiobook: AudiobookDetail | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: AudiobookState = {
    audiobooks: [],
    currentAudiobook: null,
    isLoading: false,
    error: null,
};

export const fetchAudiobooks = createAsyncThunk(
    'audiobook/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const data = await audiobookApi.list();
            return data.results;
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Failed to fetch audiobooks.'
            );
        }
    }
);

export const fetchAudiobookById = createAsyncThunk(
    'audiobook/fetchById',
    async (id: number, { rejectWithValue }) => {
        try {
            return await audiobookApi.getById(id);
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Failed to fetch audiobook.'
            );
        }
    }
);

export const updateAudiobook = createAsyncThunk(
    'audiobook/update',
    async ({ id, data }: { id: number; data: Partial<AudiobookDetail> }, { rejectWithValue }) => {
        try {
            return await audiobookApi.update(id, data);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to update audiobook.');
        }
    }
);

export const deleteAudiobook = createAsyncThunk(
    'audiobook/delete',
    async (id: number, { rejectWithValue }) => {
        try {
            await audiobookApi.delete(id);
            return id;
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.detail || 'Failed to delete audiobook.'
            );
        }
    }
);

const audiobookSlice = createSlice({
    name: 'audiobook',
    initialState,
    reducers: {
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAudiobooks.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAudiobooks.fulfilled, (state, action) => {
                state.isLoading = false;
                state.audiobooks = action.payload;
            })
            .addCase(fetchAudiobooks.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        builder.addCase(fetchAudiobookById.fulfilled, (state, action) => {
            state.currentAudiobook = action.payload;
        });

        builder.addCase(updateAudiobook.fulfilled, (state, action) => {
            state.currentAudiobook = action.payload;
            // Sync the list entry too
            const idx = state.audiobooks.findIndex((a) => a.id === action.payload.id);
            if (idx !== -1) {
                state.audiobooks[idx] = { ...state.audiobooks[idx], ...action.payload };
            }
        });

        builder.addCase(deleteAudiobook.fulfilled, (state, action) => {
            state.audiobooks = state.audiobooks.filter(
                (a) => a.id !== action.payload
            );
        });
    },
});

export const { clearError } = audiobookSlice.actions;
export default audiobookSlice.reducer;
