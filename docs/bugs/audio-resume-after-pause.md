# Audio does not resume after pause

**Status:** Fixed (pending verification)  
**Branch:** `feature/manual-play-single-scroll`  
**Primary file:** `src/hooks/useTTS.ts`

## Summary

Pressing play after pausing narration showed the playing UI (pause icon, countdown ticking) but produced no audible output. Redux `isPlaying` became `true` and the slide timer continued, while speech or Kokoro audio never restarted.

## Symptoms

1. First play works — user hears narration.
2. Pause stops audio and countdown as expected.
3. Resume sets UI to “playing” and countdown runs again.
4. No audio is heard until the user navigates away or refreshes.

## Root causes

Three independent bugs combined to produce the failure. Any one of them could cause “playing UI, silent audio” depending on audio mode and browser.

### 1. Unreliable browser TTS pause/resume

When Kokoro audio is unavailable, slides fall back to `window.speechSynthesis`. The original implementation used `speechSynthesis.pause()` on pause and `speechSynthesis.resume()` on resume.

`pause()` / `resume()` are inconsistently supported (especially Safari). When pause did not set `speechSynthesis.paused === true`, resume skipped the speech path and fell through to the **timer-only** branch, which restarted the advance countdown without restarting speech.

### 2. `speechSynthesis.cancel()` on pause fired `utterance.onerror`

Pausing browser TTS called `speechSynthesis.cancel()` to stop the utterance. That triggered the utterance’s `onerror` handler, which:

- Set `activeMode` to `idle`
- Called `scheduleAdvance()`, starting a ghost auto-advance timer while the UI still looked paused

Playback state was left inconsistent (`timerActive: true`, `activeMode: idle`, saved pause snapshot).

### 3. Kokoro upgrade effect ran on every resume

An effect intended to switch from browser TTS to Kokoro when `audio_url` arrived also ran whenever `isPlaying` became `true` while `activeMode === 'browser'`:

```ts
if (isPlaying && activeMode === 'browser' && slide?.audio_url && preferKokoroAudio) {
  stopAllPlayback();
  playSlideAudio();
}
```

On resume, this called `stopAllPlayback()` and `playSlideAudio()` inside a React effect — **outside a user gesture** — which could kill active speech and fail `audio.play()` due to autoplay policy.

### Secondary issue: resume reported success without starting media

`syncResumePlayback()` could return `true` after only restarting the advance timer. The click handler then skipped `playSlideAudio()`, so Redux showed “playing” with no media attached.

## Fix

Changes in `src/hooks/useTTS.ts` and `src/screens/SlideshowPage.tsx`:

| Area | Change |
|------|--------|
| Pause snapshot | Save explicit `{ slideId, mode, text/audioUrl, currentTime, remainingMs }` in `pausedPlaybackRef` |
| Browser pause | Cancel speech via `cancelBrowserSpeech()` (strip `onend`/`onerror` before cancel to avoid ghost timers) |
| Browser resume | Restart utterance from click handler; preserve countdown via `remainingMs` |
| Kokoro resume | Reuse existing `<audio>` element when possible; recreate only if missing or URL mismatch |
| Click handler | `syncResumePlayback()` first; fall back to `playSlideAudio()` if resume returns `false` |
| Pause effect | Only call `syncPausePlayback()` on play→pause transition, not on every mount while paused |
| Kokoro upgrade | Only run when `slide.audio_url` **changes**, not on every `isPlaying` toggle |
| Debug | Dev-only `[TTS]` console logs and `window.__TTS_DEBUG__()` |

## Local testing context

Issue `2026-06-09` in Firestore has `status: failed` and **0/33 slides with `audio_url`**, so local dev exercises **browser TTS only**, not Kokoro. Resume restarts narration from the beginning of the slide text (not mid-sentence). Kokoro resume should be verified on an issue with `status: audio_ready` and populated `audio_url` fields.

## How to debug

1. Open DevTools console on a slideshow page.
2. Play → pause → play.
3. Filter logs for `[TTS]`.
4. Inspect state at any time:

```js
window.__TTS_DEBUG__()
```

Useful fields:

- `pausedPlayback` — saved snapshot after pause; should be non-null before resume
- `activeMode` — `kokoro`, `browser`, or `idle`
- `hasAudioRef` / `audioPaused` — Kokoro element state
- `speechSpeaking` / `speechPaused` — browser TTS state
- `timerActive` — should be `false` while paused (ghost timer was a symptom of the bug)

Automated repro script: `scripts/debug-playback.mjs` (requires Playwright).

## Verification checklist

- [ ] Play → pause → play on a slide with browser TTS (no `audio_url`)
- [ ] Play → pause → play on a slide with Kokoro audio (`audio_url` present)
- [ ] Countdown stays in sync with audio after resume
- [ ] Mute state persists across pause/resume and slide changes
- [ ] First play from cover still works (no auto-start before user presses play)
- [ ] Opening Table of Contents / extras while playing pauses correctly

## Related files

- `src/hooks/useTTS.ts` — playback, pause/resume, countdown
- `src/screens/SlideshowPage.tsx` — `handleTogglePlayback`
- `src/components/SlideshowPlayer.tsx` — cover play button, center-tap toggle
- `src/components/TTSEngine.tsx` — bottom play bar
- `src/store/slideshowSlice.ts` — `isPlaying`, `preferKokoroAudio`
