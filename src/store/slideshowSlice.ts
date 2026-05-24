import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SlideshowState {
  currentSlideIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  preferKokoroAudio: boolean;
}

const initialState: SlideshowState = {
  currentSlideIndex: 0,
  isPlaying: false,
  isMuted: false,
  preferKokoroAudio: true,
};

const slideshowSlice = createSlice({
  name: 'slideshow',
  initialState,
  reducers: {
    goToSlide: (state, action: PayloadAction<number>) => {
      state.currentSlideIndex = Math.max(action.payload, 0);
    },
    nextSlide: (state, action: PayloadAction<number>) => {
      const lastIndex = Math.max(action.payload - 1, 0);
      state.currentSlideIndex = Math.min(state.currentSlideIndex + 1, lastIndex);
    },
    prevSlide: (state) => {
      state.currentSlideIndex = Math.max(state.currentSlideIndex - 1, 0);
    },
    togglePlay: (state, action: PayloadAction<boolean | undefined>) => {
      if (action.payload !== undefined) {
        state.isPlaying = action.payload;
      } else {
        state.isPlaying = !state.isPlaying;
      }
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    toggleAudioMode: (state) => {
      state.preferKokoroAudio = !state.preferKokoroAudio;
    },
    resetPlayer: (state) => {
      state.currentSlideIndex = 0;
      state.isPlaying = false;
    },
  },
});

export const {
  goToSlide,
  nextSlide,
  prevSlide,
  togglePlay,
  toggleMute,
  toggleAudioMode,
  resetPlayer,
} = slideshowSlice.actions;

export default slideshowSlice.reducer;
