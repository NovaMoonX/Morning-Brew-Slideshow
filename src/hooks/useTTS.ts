import { useCallback, useEffect, useRef, useState } from 'react';

import type { Slide } from '@lib/models';

type TTSMode = 'idle' | 'browser' | 'kokoro';

interface UseTTSArgs {
  slide: Slide | null;
  preferKokoroAudio: boolean;
}

interface UseTTSState {
  isSpeaking: boolean;
  mode: TTSMode;
  error: string | null;
  speak: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useTTS({ slide, preferKokoroAudio }: UseTTSArgs): UseTTSState {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mode, setMode] = useState<TTSMode>('idle');
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearAudio = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }, []);

  const clearSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearAudio();
    clearSpeech();
    setIsSpeaking(false);
    setMode('idle');
  }, [clearAudio, clearSpeech]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const speakWithKokoro = useCallback(() => {
    if (!slide?.audio_url) {
      setError('No audio file available for this slide yet.');
      return;
    }

    clearSpeech();
    clearAudio();

    const audio = new Audio(slide.audio_url);
    audioRef.current = audio;
    setError(null);
    setMode('kokoro');

    audio.onplay = () => {
      setIsSpeaking(true);
    };
    audio.onpause = () => {
      setIsSpeaking(false);
    };
    audio.onended = () => {
      setIsSpeaking(false);
      setMode('idle');
    };
    audio.onerror = () => {
      setError('Could not play Kokoro audio.');
      setIsSpeaking(false);
      setMode('idle');
    };

    void audio.play();
  }, [clearAudio, clearSpeech, slide]);

  const speakWithBrowser = useCallback(() => {
    if (!slide?.body) {
      setError('No readable text available on this slide.');
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Speech synthesis is not supported in this browser.');
      return;
    }

    clearAudio();
    clearSpeech();

    const utterance = new SpeechSynthesisUtterance(slide.body);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onstart = () => {
      setIsSpeaking(true);
      setMode('browser');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setMode('idle');
    };
    utterance.onerror = () => {
      setError('Could not generate browser speech.');
      setIsSpeaking(false);
      setMode('idle');
    };

    utteranceRef.current = utterance;
    setError(null);
    window.speechSynthesis.speak(utterance);
  }, [clearAudio, clearSpeech, slide]);

  const speak = useCallback(() => {
    if (!slide) {
      setError('Select a slide before playing audio.');
      return;
    }

    if (preferKokoroAudio && slide.audio_url) {
      speakWithKokoro();
      return;
    }

    speakWithBrowser();
  }, [preferKokoroAudio, slide, speakWithBrowser, speakWithKokoro]);

  const pause = useCallback(() => {
    if (mode === 'kokoro' && audioRef.current) {
      audioRef.current.pause();
      return;
    }

    if (
      mode === 'browser' &&
      typeof window !== 'undefined' &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
    }
  }, [mode]);

  const resume = useCallback(() => {
    if (mode === 'kokoro' && audioRef.current) {
      void audioRef.current.play();
      return;
    }

    if (
      mode === 'browser' &&
      typeof window !== 'undefined' &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
    }
  }, [mode]);

  const result: UseTTSState = {
    isSpeaking,
    mode,
    error,
    speak,
    stop,
    pause,
    resume,
  };

  return result;
}
