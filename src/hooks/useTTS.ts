import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import { speakableText } from '@components/SlideBody';
import type { Slide } from '@lib/models';

interface UseTTSProps {
  slide: Slide | null;
  totalSlides: number;
  isAudioReady: boolean;
}

import { estimateDurationMs, MIN_READ_DURATION_MS } from '@lib/slideshow/timing';

export function useTTS({ slide, totalSlides }: UseTTSProps) {
  const dispatch = useAppDispatch();
  const { isPlaying, isMuted, preferKokoroAudio } = useAppSelector(
    (state) => state.slideshow
  );

  const [activeMode, setActiveMode] = useState<'idle' | 'kokoro' | 'browser'>('idle');
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slideIdRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAllPlayback = useCallback(() => {
    clearTimer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setActiveMode('idle');
  }, [clearTimer]);

  const advanceSlide = useCallback(() => {
    dispatch(nextSlide(totalSlides));
  }, [dispatch, totalSlides]);

  const scheduleAdvance = useCallback(
    (delayMs: number) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        stopAllPlayback();
        advanceSlide();
      }, delayMs);
    },
    [advanceSlide, clearTimer, stopAllPlayback]
  );

  const playBrowserSpeech = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser text-to-speech is unsupported.');
        scheduleAdvance(estimateDurationMs(text));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.volume = isMuted ? 0 : 1;

      utterance.onstart = () => {
        setActiveMode('browser');
      };
      utterance.onend = () => {
        stopAllPlayback();
        advanceSlide();
      };
      utterance.onerror = () => {
        setActiveMode('idle');
        scheduleAdvance(estimateDurationMs(text));
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isMuted, scheduleAdvance, stopAllPlayback, advanceSlide]
  );

  const playSlideAudio = useCallback(() => {
    const activeSlide = slide;
    if (!activeSlide) {
      stopAllPlayback();
      return;
    }

    stopAllPlayback();
    setError(null);

    const text = speakableText(activeSlide);

    if (activeSlide.type === 'link_cards') {
      // LinkCardsSkipButton owns auto-advance timing for link card slides.
      return;
    }

    if (activeSlide.type === 'section_hero' || activeSlide.type === 'end') {
      // Hero countdown and end slide do not auto-advance.
      return;
    }

    if (!text) {
      scheduleAdvance(MIN_READ_DURATION_MS);
      return;
    }

    if (preferKokoroAudio && activeSlide.audio_url) {
      const audio = new Audio(activeSlide.audio_url);
      audio.muted = isMuted;
      audioRef.current = audio;
      setActiveMode('kokoro');

      audio.onended = () => {
        stopAllPlayback();
        advanceSlide();
      };
      audio.onerror = () => {
        setActiveMode('idle');
        playBrowserSpeech(text);
      };

      audio.play().catch(() => {
        setError('Auto-play blocked or audio load failed.');
        playBrowserSpeech(text);
      });
      return;
    }

    playBrowserSpeech(text);
  }, [
    slide,
    preferKokoroAudio,
    isMuted,
    stopAllPlayback,
    advanceSlide,
    playBrowserSpeech,
    scheduleAdvance,
  ]);

  useEffect(() => {
    if (!slide) {
      stopAllPlayback();
      return;
    }

    if (slideIdRef.current !== slide.id) {
      slideIdRef.current = slide.id;
      stopAllPlayback();
      if (isPlaying) {
        playSlideAudio();
      }
    }
  }, [slide, isPlaying, playSlideAudio, stopAllPlayback]);

  useEffect(() => {
    if (!slide || slide.type === 'link_cards' || slide.type === 'section_hero' || slide.type === 'end') {
      return;
    }

    if (isPlaying && activeMode === 'idle') {
      playSlideAudio();
    } else if (!isPlaying) {
      clearTimer();
      if (activeMode === 'kokoro' && audioRef.current) {
        audioRef.current.pause();
      } else if (
        activeMode === 'browser' &&
        typeof window !== 'undefined' &&
        window.speechSynthesis.speaking
      ) {
        window.speechSynthesis.pause();
      }
    } else if (isPlaying) {
      if (activeMode === 'kokoro' && audioRef.current) {
        audioRef.current.play().catch(() => {});
      } else if (
        activeMode === 'browser' &&
        typeof window !== 'undefined' &&
        window.speechSynthesis.paused
      ) {
        window.speechSynthesis.resume();
      }
    }
  }, [isPlaying, slide, activeMode, playSlideAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
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
