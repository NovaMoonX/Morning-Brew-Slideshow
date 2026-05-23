import { create } from 'zustand';

interface SlideshowStore {
currentSlideIndex: number;
isAutoPlayEnabled: boolean;
preferKokoroAudio: boolean;
setCurrentSlideIndex: (index: number) => void;
nextSlide: (length: number) => void;
previousSlide: (length: number) => void;
toggleAutoPlay: () => void;
togglePreferKokoroAudio: () => void;
reset: () => void;
}

export const useSlideshowStore = create<SlideshowStore>((set) => ({
currentSlideIndex: 0,
isAutoPlayEnabled: false,
preferKokoroAudio: true,
setCurrentSlideIndex: (index) => {
set({ currentSlideIndex: Math.max(index, 0) });
},
nextSlide: (length) => {
set((state) => {
const lastIndex = Math.max(length - 1, 0);
const nextIndex = Math.min(state.currentSlideIndex + 1, lastIndex);
const result = { currentSlideIndex: nextIndex };
return result;
});
},
previousSlide: (length) => {
set((state) => {
const lastIndex = Math.max(length - 1, 0);
const prevIndex = Math.max(state.currentSlideIndex - 1, 0);
const boundedIndex = Math.min(prevIndex, lastIndex);
const result = { currentSlideIndex: boundedIndex };
return result;
});
},
toggleAutoPlay: () => {
set((state) => {
const result = { isAutoPlayEnabled: !state.isAutoPlayEnabled };
return result;
});
},
togglePreferKokoroAudio: () => {
set((state) => {
const result = { preferKokoroAudio: !state.preferKokoroAudio };
return result;
});
},
reset: () => {
set({
currentSlideIndex: 0,
isAutoPlayEnabled: false,
preferKokoroAudio: true,
});
},
}));
