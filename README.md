# Morning Brew Slideshow (Client)

Mobile-first React PWA client for reading Morning Brew issues as an interactive slideshow with progressive enhancement:

- `ready`: slides available immediately
- `enriched`: metadata-rich link cards available
- `audio_ready`: Kokoro MP3 playback can replace browser TTS

## Stack

- React 19 + TypeScript + Vite
- Firebase Web SDK (Firestore + Storage)
- Zustand for slideshow state
- Tailwind CSS + Dreamer UI

## Local Setup

```bash
npm install
npm run dev
```

### Environment Variables

Create `.env.local`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

If these variables are missing, the app automatically runs in mock mode with demo issue data.

## Key Client Modules

- `src/firebase.ts`: Firebase initialization
- `src/lib/models/slideshow.models.ts`: shared issue/slide/link interfaces
- `src/hooks/useIssue.ts`: real-time Firestore subscription (`issues/{YYYY-MM-DD}`)
- `src/hooks/useTTS.ts`: browser speech + Kokoro MP3 fallback
- `src/store/slideshowStore.ts`: slide index + audio preference state
- `src/components/*`: slideshow player, status banner, links, TTS controls

## Validation

```bash
npm run lint
npm run build
```
