import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ExtraSectionKey } from '@lib/models';

interface SlideshowState {
  currentSlideIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  preferKokoroAudio: boolean;
  activeExtra: ExtraSectionKey | null;
  extraSlideIndex: number;
}

const initialState: SlideshowState = {
  currentSlideIndex: 0,
  isPlaying: false,
  isMuted: false,
  preferKokoroAudio: true,
  activeExtra: null,
  extraSlideIndex: 0,
};

export interface NextSlidePayload {
  totalSlides: number;
  mainLastIndex?: number;
}

const slideshowSlice = createSlice({
  name: 'slideshow',
  initialState,
  reducers: {
    goToSlide: (state, action: PayloadAction<number>) => {
      state.currentSlideIndex = Math.max(action.payload, 0);
      state.activeExtra = null;
      state.extraSlideIndex = 0;
    },
    nextSlide: (state, action: PayloadAction<number | NextSlidePayload>) => {
      const totalSlides =
        typeof action.payload === 'number' ? action.payload : action.payload.totalSlides;
      const mainLastIndex =
        typeof action.payload === 'number'
          ? Math.max(totalSlides - 1, 0)
          : (action.payload.mainLastIndex ?? Math.max(totalSlides - 1, 0));
      state.currentSlideIndex = Math.min(state.currentSlideIndex + 1, mainLastIndex);
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
    openExtraSection: (state, action: PayloadAction<ExtraSectionKey>) => {
      state.activeExtra = action.payload;
      state.extraSlideIndex = 0;
      state.isPlaying = false;
    },
    closeExtraSection: (state) => {
      state.activeExtra = null;
      state.extraSlideIndex = 0;
    },
    nextExtraSlide: (state, action: PayloadAction<number>) => {
      const lastIndex = Math.max(action.payload - 1, 0);
      state.extraSlideIndex = Math.min(state.extraSlideIndex + 1, lastIndex);
    },
    prevExtraSlide: (state) => {
      state.extraSlideIndex = Math.max(state.extraSlideIndex - 1, 0);
    },
    resetPlayer: (state) => {
      state.currentSlideIndex = 0;
      state.isPlaying = true;
      state.activeExtra = null;
      state.extraSlideIndex = 0;
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
  openExtraSection,
  closeExtraSection,
  nextExtraSlide,
  prevExtraSlide,
  resetPlayer,
} = slideshowSlice.actions;

export default slideshowSlice.reducer;
