import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store/index';
import { togglePlay, nextSlide } from '@store/slideshowSlice';
import type { Slide } from '@lib/models';

interface UseTTSProps {
  slide: Slide | null;
  isAudioReady: boolean;
}

export function useTTS({ slide }: UseTTSProps) {
  const dispatch = useAppDispatch();
  const { isPlaying, isMuted, preferKokoroAudio } = useAppSelector(
    (state) => state.slideshow
  );

  const [activeMode, setActiveMode] = useState<'idle' | 'kokoro' | 'browser'>('idle');
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slideIdRef = useRef<string | null>(null);

  // Helper to completely stop active speech/audio
  const stopAllPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setActiveMode('idle');
  }, []);

  // Handle slide completion and advance
  const handlePlaybackFinished = useCallback(() => {
    stopAllPlayback();
    dispatch(togglePlay(false));
    // Brief delay before advancing to next slide
    setTimeout(() => {
      // Advance to next slide. We use a high boundary of 999 since slice checks bounds
      dispatch(nextSlide(999));
    }, 800);
  }, [dispatch, stopAllPlayback]);

  // Main playback logic
  const playSlideAudio = useCallback(() => {
    const activeSlide = slide;
    if (!activeSlide || activeSlide.type === 'link_cards') {
      stopAllPlayback();
      return;
    }

    stopAllPlayback();
    setError(null);

    // Try Kokoro first if preferred and available
    if (preferKokoroAudio && activeSlide.audio_url) {
      const audio = new Audio(activeSlide.audio_url);
      audio.muted = isMuted;
      audioRef.current = audio;
      setActiveMode('kokoro');

      audio.onplay = () => {
        dispatch(togglePlay(true));
      };
      audio.onended = () => {
        handlePlaybackFinished();
      };
      audio.onerror = () => {
        // Fallback to browser if mp3 fails
        setActiveMode('idle');
        playBrowserSpeech();
      };

      audio.play().catch(() => {
        setError('Auto-play blocked or audio load failed.');
        dispatch(togglePlay(false));
      });
      return;
    }

    // Fallback to Browser Speech Synthesis
    playBrowserSpeech();

    function playBrowserSpeech() {
      if (!activeSlide || !activeSlide.body) {
        return;
      }

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser text-to-speech is unsupported.');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(activeSlide.body);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;

      utterance.onstart = () => {
        dispatch(togglePlay(true));
        setActiveMode('browser');
      };
      utterance.onend = () => {
        handlePlaybackFinished();
      };
      utterance.onerror = () => {
        dispatch(togglePlay(false));
        setActiveMode('idle');
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [slide, preferKokoroAudio, isMuted, handlePlaybackFinished, stopAllPlayback, dispatch]);

  // Handle play/pause commands from slice
  useEffect(() => {
    if (!slide || slide.type === 'link_cards') {
      return;
    }

    if (isPlaying) {
      if (activeMode === 'idle') {
        playSlideAudio();
      } else if (activeMode === 'kokoro' && audioRef.current) {
        audioRef.current.play().catch(() => {});
      } else if (activeMode === 'browser' && typeof window !== 'undefined' && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } else {
      if (activeMode === 'kokoro' && audioRef.current) {
        audioRef.current.pause();
      } else if (activeMode === 'browser' && typeof window !== 'undefined' && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    }
  }, [isPlaying, slide, activeMode, playSlideAudio]);

  // Sync mute state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle active slide changes
  useEffect(() => {
    if (!slide) {
      stopAllPlayback();
      return;
    }

    // Stop if switching to a new slide
    if (slideIdRef.current !== slide.id) {
      slideIdRef.current = slide.id;
      stopAllPlayback();
      
      // If we were playing, start playing the new slide automatically
      if (isPlaying) {
        playSlideAudio();
      }
    }
  }, [slide, isPlaying, playSlideAudio, stopAllPlayback]);

  // Handle on-the-fly Kokoro audio url loads
  useEffect(() => {
    // If the slide's audio url gets populated in real-time, and we are currently
    // playing fallback browser speech, seamlessly swap to the higher quality audio file
    if (
      isPlaying &&
      activeMode === 'browser' &&
      slide?.audio_url &&
      preferKokoroAudio
    ) {
      stopAllPlayback();
      playSlideAudio();
    }
  }, [slide?.audio_url, isPlaying, activeMode, preferKokoroAudio, playSlideAudio, stopAllPlayback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, [stopAllPlayback]);

  return {
    isPlaying,
    isMuted,
    activeMode,
    error,
    stop: stopAllPlayback,
  };
}
