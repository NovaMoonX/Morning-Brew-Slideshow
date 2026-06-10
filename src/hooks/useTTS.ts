import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import { speakableText } from '@components/SlideBody';
import type { Slide } from '@lib/models';
import { estimateDurationMs, MIN_READ_DURATION_MS } from '@lib/slideshow/timing';
import { showsTopSlideCountdown } from '@lib/slideshow/slideCountdown';

interface UseTTSProps {
  slide: Slide | null;
  totalSlides: number;
  mainLastIndex: number;
  isAudioReady: boolean;
}

export function useTTS({ slide, totalSlides, mainLastIndex }: UseTTSProps) {
  const dispatch = useAppDispatch();
  const { isPlaying, isMuted, preferKokoroAudio } = useAppSelector(
    (state) => state.slideshow
  );

  const [activeMode, setActiveMode] = useState<'idle' | 'kokoro' | 'browser'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slideIdRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const countdownDeadlineRef = useRef<number | null>(null);
  const isMutedRef = useRef(isMuted);
  const pausedPlaybackRef = useRef(false);

  isMutedRef.current = isMuted;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    countdownDeadlineRef.current = null;
    setSecondsRemaining(null);
  }, []);

  const setCountdownDeadline = useCallback((durationMs: number) => {
    countdownDeadlineRef.current = Date.now() + Math.max(0, durationMs);
  }, []);

  const applyAudioMuteState = useCallback((audio: HTMLAudioElement) => {
    audio.muted = isMutedRef.current;
    audio.volume = isMutedRef.current ? 0 : 1;
  }, []);

  const stopAllPlayback = useCallback(() => {
    clearTimer();
    clearCountdown();
    pausedPlaybackRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setActiveMode('idle');
  }, [clearTimer, clearCountdown]);

  const pausePlayback = useCallback(() => {
    clearTimer();
    if (activeMode === 'idle' && !countdownDeadlineRef.current && !audioRef.current) {
      return;
    }
    pausedPlaybackRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
    } else if (
      activeMode === 'browser' &&
      typeof window !== 'undefined' &&
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.pause();
    }
  }, [activeMode, clearTimer]);

  const resumePlayback = useCallback(() => {
    if (!pausedPlaybackRef.current) {
      return;
    }
    pausedPlaybackRef.current = false;

    if (activeMode === 'kokoro' && audioRef.current) {
      applyAudioMuteState(audioRef.current);
      audioRef.current.play().catch(() => {});
      return;
    }

    if (
      activeMode === 'browser' &&
      typeof window !== 'undefined' &&
      window.speechSynthesis.paused
    ) {
      window.speechSynthesis.resume();
      return;
    }

    const deadline = countdownDeadlineRef.current;
    if (deadline !== null && activeMode === 'idle') {
      const remainingMs = Math.max(0, deadline - Date.now());
      if (remainingMs <= 0) {
        stopAllPlayback();
        dispatch(nextSlide({ totalSlides, mainLastIndex }));
        return;
      }
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        stopAllPlayback();
        dispatch(nextSlide({ totalSlides, mainLastIndex }));
      }, remainingMs);
    }
  }, [activeMode, applyAudioMuteState, clearTimer, dispatch, mainLastIndex, stopAllPlayback, totalSlides]);

  const advanceSlide = useCallback(() => {
    dispatch(nextSlide({ totalSlides, mainLastIndex }));
  }, [dispatch, totalSlides, mainLastIndex]);

  const scheduleAdvance = useCallback(
    (delayMs: number) => {
      clearTimer();
      setCountdownDeadline(delayMs);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        stopAllPlayback();
        advanceSlide();
      }, delayMs);
    },
    [advanceSlide, clearTimer, setCountdownDeadline, stopAllPlayback]
  );

  const startBrowserUtterance = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser text-to-speech is unsupported.');
        scheduleAdvance(estimateDurationMs(text));
        return;
      }

      setCountdownDeadline(estimateDurationMs(text));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.volume = isMutedRef.current ? 0 : 1;

      utterance.onstart = () => {
        setActiveMode('browser');
        pausedPlaybackRef.current = false;
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
    [scheduleAdvance, stopAllPlayback, advanceSlide, setCountdownDeadline]
  );

  const playBrowserSpeech = useCallback(
    (text: string) => {
      startBrowserUtterance(text);
    },
    [startBrowserUtterance]
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
      return;
    }

    if (
      activeSlide.type === 'section_hero' ||
      activeSlide.type === 'end' ||
      activeSlide.type === 'extras_hub'
    ) {
      return;
    }

    if (!text) {
      scheduleAdvance(MIN_READ_DURATION_MS);
      return;
    }

    if (preferKokoroAudio && activeSlide.audio_url) {
      const audio = new Audio(activeSlide.audio_url);
      applyAudioMuteState(audio);
      audioRef.current = audio;
      setActiveMode('kokoro');
      pausedPlaybackRef.current = false;

      const syncMuteState = () => applyAudioMuteState(audio);
      audio.addEventListener('playing', syncMuteState);
      audio.addEventListener('volumechange', syncMuteState);

      audio.onloadedmetadata = () => {
        const remainingMs = Math.max(0, (audio.duration - audio.currentTime) * 1000);
        if (Number.isFinite(remainingMs) && remainingMs > 0) {
          setCountdownDeadline(remainingMs);
        }
      };

      audio.onended = () => {
        audio.removeEventListener('playing', syncMuteState);
        audio.removeEventListener('volumechange', syncMuteState);
        stopAllPlayback();
        advanceSlide();
      };
      audio.onerror = () => {
        audio.removeEventListener('playing', syncMuteState);
        audio.removeEventListener('volumechange', syncMuteState);
        setActiveMode('idle');
        playBrowserSpeech(text);
      };

      audio.play().then(syncMuteState).catch(() => {
        setError('Auto-play blocked or audio load failed.');
        playBrowserSpeech(text);
      });
      return;
    }

    playBrowserSpeech(text);
  }, [
    slide,
    preferKokoroAudio,
    stopAllPlayback,
    advanceSlide,
    playBrowserSpeech,
    scheduleAdvance,
    setCountdownDeadline,
    applyAudioMuteState,
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
    if (
      !slide ||
      slide.type === 'link_cards' ||
      slide.type === 'section_hero' ||
      slide.type === 'end' ||
      slide.type === 'extras_hub'
    ) {
      return;
    }

    if (!isPlaying) {
      pausePlayback();
      return;
    }

    if (pausedPlaybackRef.current) {
      resumePlayback();
      return;
    }

    if (activeMode === 'idle') {
      playSlideAudio();
    }
  }, [isPlaying, slide, activeMode, playSlideAudio, pausePlayback, resumePlayback]);

  useEffect(() => {
    if (audioRef.current) {
      applyAudioMuteState(audioRef.current);
    }
  }, [isMuted, applyAudioMuteState]);

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
    if (!isPlaying || !slide || !showsTopSlideCountdown(slide.type)) {
      setSecondsRemaining(null);
      return;
    }

    const tick = () => {
      if (activeMode === 'kokoro' && audioRef.current && Number.isFinite(audioRef.current.duration)) {
        const remainingSec = audioRef.current.duration - audioRef.current.currentTime;
        const display = remainingSec <= 0 ? 0 : Math.ceil(remainingSec);
        setSecondsRemaining(display);
        return;
      }

      const deadline = countdownDeadlineRef.current;
      if (deadline !== null) {
        const remainingMs = Math.max(0, deadline - Date.now());
        setSecondsRemaining(remainingMs === 0 ? 0 : Math.ceil(remainingMs / 1000));
        return;
      }

      setSecondsRemaining(null);
    };

    tick();
    const intervalId = window.setInterval(tick, 100);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, slide, activeMode]);

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
    secondsRemaining,
    stop: stopAllPlayback,
  };
}
