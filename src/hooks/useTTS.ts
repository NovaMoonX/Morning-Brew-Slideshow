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

type PausedPlaybackMode = 'kokoro' | 'browser' | 'timer';

interface PausedPlaybackState {
  slideId: string;
  mode: PausedPlaybackMode;
  audioUrl?: string;
  currentTime?: number;
  text?: string;
  remainingMs?: number;
}

const TTS_LOG = import.meta.env.DEV
  ? (...args: unknown[]) => console.log('[TTS]', ...args)
  : () => {};

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
  const pausedPlaybackRef = useRef<PausedPlaybackState | null>(null);
  const activeModeRef = useRef(activeMode);
  const suppressSpeechEventsRef = useRef(false);

  isMutedRef.current = isMuted;
  activeModeRef.current = activeMode;

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

  const getDebugState = useCallback(() => {
    const audio = audioRef.current;
    return {
      slideId: slide?.id ?? null,
      isPlaying,
      activeMode: activeModeRef.current,
      pausedPlayback: pausedPlaybackRef.current,
      hasAudioRef: Boolean(audio),
      audioPaused: audio?.paused ?? null,
      audioCurrentTime: audio?.currentTime ?? null,
      audioSrc: audio?.src ?? null,
      countdownDeadline: countdownDeadlineRef.current,
      speechSpeaking:
        typeof window !== 'undefined' ? window.speechSynthesis?.speaking ?? false : false,
      speechPaused:
        typeof window !== 'undefined' ? window.speechSynthesis?.paused ?? false : false,
      timerActive: timerRef.current !== null,
    };
  }, [isPlaying, slide?.id]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as Window & { __TTS_DEBUG__?: () => ReturnType<typeof getDebugState> }).__TTS_DEBUG__ =
        getDebugState;
    }
  }, [getDebugState]);

  const cancelBrowserSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    suppressSpeechEventsRef.current = true;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    suppressSpeechEventsRef.current = false;
  }, []);

  const stopAllPlayback = useCallback(() => {
    TTS_LOG('stopAllPlayback');
    clearTimer();
    clearCountdown();
    pausedPlaybackRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cancelBrowserSpeech();
    setActiveMode('idle');
  }, [clearTimer, clearCountdown, cancelBrowserSpeech]);

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

  const resumeAdvanceTimer = useCallback(() => {
    if (timerRef.current) {
      return;
    }

    const deadline = countdownDeadlineRef.current;
    if (deadline === null) {
      return;
    }

    const remainingMs = Math.max(0, deadline - Date.now());
    if (remainingMs <= 0) {
      stopAllPlayback();
      advanceSlide();
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      stopAllPlayback();
      advanceSlide();
    }, remainingMs);
  }, [advanceSlide, stopAllPlayback]);

  const startBrowserUtterance = useCallback(
    (text: string, remainingMs?: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser text-to-speech is unsupported.');
        scheduleAdvance(remainingMs ?? estimateDurationMs(text));
        return;
      }

      setCountdownDeadline(remainingMs ?? estimateDurationMs(text));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.volume = isMutedRef.current ? 0 : 1;

      utterance.onstart = () => {
        setActiveMode('browser');
      };
      utterance.onend = () => {
        if (suppressSpeechEventsRef.current) {
          return;
        }
        stopAllPlayback();
        advanceSlide();
      };
      utterance.onerror = () => {
        if (suppressSpeechEventsRef.current) {
          return;
        }
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

  const attachKokoroAudio = useCallback(
    (audio: HTMLAudioElement, fallbackText: string, startTime = 0) => {
      applyAudioMuteState(audio);
      audioRef.current = audio;
      setActiveMode('kokoro');
      pausedPlaybackRef.current = null;

      const applyStartTime = () => {
        if (startTime > 0 && Number.isFinite(audio.duration) && startTime < audio.duration) {
          audio.currentTime = startTime;
        }
      };

      if (startTime > 0) {
        if (audio.readyState >= 1) {
          applyStartTime();
        } else {
          audio.addEventListener('loadedmetadata', applyStartTime, { once: true });
        }
      }

      const syncMuteState = () => applyAudioMuteState(audio);
      audio.addEventListener('playing', syncMuteState);
      audio.addEventListener('volumechange', syncMuteState);

      const updateCountdownDeadline = () => {
        const remainingMs = Math.max(0, (audio.duration - audio.currentTime) * 1000);
        if (Number.isFinite(remainingMs) && remainingMs > 0) {
          setCountdownDeadline(remainingMs);
        }
      };

      audio.onloadedmetadata = updateCountdownDeadline;
      audio.ontimeupdate = updateCountdownDeadline;

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
        startBrowserUtterance(fallbackText);
      };

      return syncMuteState;
    },
    [
      advanceSlide,
      applyAudioMuteState,
      setCountdownDeadline,
      startBrowserUtterance,
      stopAllPlayback,
    ]
  );

  const playSlideAudio = useCallback(() => {
    const activeSlide = slide;
    if (!activeSlide) {
      stopAllPlayback();
      return false;
    }

    TTS_LOG('playSlideAudio', activeSlide.id, activeSlide.type);
    stopAllPlayback();
    setError(null);

    const text = speakableText(activeSlide);

    if (activeSlide.type === 'link_cards') {
      return false;
    }

    if (
      activeSlide.type === 'section_hero' ||
      activeSlide.type === 'end' ||
      activeSlide.type === 'extras_hub'
    ) {
      return false;
    }

    if (!text) {
      pausedPlaybackRef.current = null;
      setActiveMode('idle');
      scheduleAdvance(MIN_READ_DURATION_MS);
      return true;
    }

    if (preferKokoroAudio && activeSlide.audio_url) {
      const audio = new Audio(activeSlide.audio_url);
      const syncMuteState = attachKokoroAudio(audio, text);
      void audio.play().then(syncMuteState).catch((playError) => {
        TTS_LOG('kokoro play failed, falling back to browser TTS', playError);
        setError('Auto-play blocked or audio load failed.');
        playBrowserSpeech(text);
      });
      return true;
    }

    playBrowserSpeech(text);
    return true;
  }, [
    slide,
    preferKokoroAudio,
    stopAllPlayback,
    playBrowserSpeech,
    scheduleAdvance,
    attachKokoroAudio,
  ]);

  const syncPausePlayback = useCallback(() => {
    TTS_LOG('syncPausePlayback', getDebugState());
    clearTimer();

    const slideId = slide?.id ?? '';
    const remainingMs =
      countdownDeadlineRef.current !== null
        ? Math.max(0, countdownDeadlineRef.current - Date.now())
        : undefined;

    if (audioRef.current) {
      pausedPlaybackRef.current = {
        slideId,
        mode: 'kokoro',
        audioUrl: slide?.audio_url ?? audioRef.current.src,
        currentTime: audioRef.current.currentTime,
        remainingMs,
      };
      audioRef.current.pause();
      return;
    }

    if (
      activeModeRef.current === 'browser' ||
      (typeof window !== 'undefined' && window.speechSynthesis.speaking)
    ) {
      cancelBrowserSpeech();
      pausedPlaybackRef.current = {
        slideId,
        mode: 'browser',
        text: slide ? speakableText(slide) : '',
        remainingMs,
      };
      return;
    }

    if (remainingMs !== undefined) {
      pausedPlaybackRef.current = {
        slideId,
        mode: 'timer',
        remainingMs,
      };
    }
  }, [clearTimer, getDebugState, slide]);

  const resumeKokoroPlayback = useCallback(
    (paused: PausedPlaybackState, text: string): boolean => {
      const audioUrl = paused.audioUrl ?? slide?.audio_url;
      if (!audioUrl) {
        TTS_LOG('resumeKokoroPlayback: missing audio URL');
        return false;
      }

      const startTime = paused.currentTime ?? 0;
      const existingAudio = audioRef.current;

      if (existingAudio && existingAudio.src === audioUrl) {
        applyAudioMuteState(existingAudio);
        if (startTime > 0) {
          existingAudio.currentTime = startTime;
        }
        void existingAudio
          .play()
          .then(() => {
            TTS_LOG('resumeKokoroPlayback: reused element play() resolved', {
              currentTime: existingAudio.currentTime,
              paused: existingAudio.paused,
            });
          })
          .catch((playError) => {
            TTS_LOG('resumeKokoroPlayback: reused element play() rejected', playError);
            setError('Playback resume was blocked.');
          });
        return true;
      }

      const audio = new Audio(audioUrl);
      const syncMuteState = attachKokoroAudio(audio, text, startTime);
      void audio
        .play()
        .then(() => {
          TTS_LOG('resumeKokoroPlayback: new element play() resolved', {
            currentTime: audio.currentTime,
            paused: audio.paused,
          });
          syncMuteState();
        })
        .catch((playError) => {
          TTS_LOG('resumeKokoroPlayback: new element play() rejected', playError);
          setError('Playback resume was blocked.');
        });
      return true;
    },
    [applyAudioMuteState, attachKokoroAudio, slide?.audio_url]
  );

  const resumeBrowserPlayback = useCallback(
    (paused: PausedPlaybackState): boolean => {
      const text = paused.text ?? (slide ? speakableText(slide) : '');
      if (!text) {
        return false;
      }

      TTS_LOG('resumeBrowserPlayback: restarting browser utterance');
      cancelBrowserSpeech();
      startBrowserUtterance(text, paused.remainingMs);
      return true;
    },
    [setCountdownDeadline, slide, startBrowserUtterance, cancelBrowserSpeech]
  );

  const syncResumePlayback = useCallback(() => {
    const paused = pausedPlaybackRef.current;
    TTS_LOG('syncResumePlayback:start', { paused, state: getDebugState() });

    if (!paused || paused.slideId !== slide?.id) {
      TTS_LOG('syncResumePlayback: no matching paused state');
      return false;
    }

    if (paused.mode === 'kokoro') {
      const text = speakableText(slide);
      const resumed = resumeKokoroPlayback(paused, text);
      if (resumed) {
        pausedPlaybackRef.current = null;
      }
      TTS_LOG('syncResumePlayback: kokoro', resumed);
      return resumed;
    }

    if (paused.mode === 'browser') {
      const resumed = resumeBrowserPlayback(paused);
      if (resumed) {
        pausedPlaybackRef.current = null;
      }
      TTS_LOG('syncResumePlayback: browser', resumed);
      return resumed;
    }

    if (paused.mode === 'timer' && paused.remainingMs !== undefined) {
      setCountdownDeadline(paused.remainingMs);
      resumeAdvanceTimer();
      pausedPlaybackRef.current = null;
      TTS_LOG('syncResumePlayback: timer');
      return true;
    }

    TTS_LOG('syncResumePlayback: unrecognized paused mode');
    return false;
  }, [
    getDebugState,
    resumeBrowserPlayback,
    resumeKokoroPlayback,
    resumeAdvanceTimer,
    setCountdownDeadline,
    slide,
  ]);

  const prevIsPlayingRef = useRef(isPlaying);

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
      prevIsPlayingRef.current = isPlaying;
      return;
    }

    const wasPlaying = prevIsPlayingRef.current;
    prevIsPlayingRef.current = isPlaying;

    if (wasPlaying && !isPlaying) {
      syncPausePlayback();
    }
  }, [isPlaying, slide, syncPausePlayback]);

  useEffect(() => {
    if (audioRef.current) {
      applyAudioMuteState(audioRef.current);
    }
  }, [isMuted, applyAudioMuteState]);

  const prevAudioUrlRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const audioUrl = slide?.audio_url;
    const urlChanged = prevAudioUrlRef.current !== audioUrl;
    prevAudioUrlRef.current = audioUrl;

    if (!urlChanged || !audioUrl || !preferKokoroAudio) {
      return;
    }

    if (!isPlaying || activeMode !== 'browser') {
      return;
    }

    stopAllPlayback();
    playSlideAudio();
  }, [slide?.audio_url, isPlaying, activeMode, preferKokoroAudio, playSlideAudio, stopAllPlayback]);

  useEffect(() => {
    if (!isPlaying || !slide || !showsTopSlideCountdown(slide.type)) {
      setSecondsRemaining(null);
      return;
    }

    const tick = () => {
      if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
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
    syncPausePlayback,
    syncResumePlayback,
    playSlideAudio,
    stop: stopAllPlayback,
  };
}
