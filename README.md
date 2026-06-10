# Morning Brew Visualizer

Mobile-first React PWA for reading Morning Brew issues as an interactive slideshow with progressive enhancement:

- `ready`: slides available immediately
- `enriched`: metadata-rich link cards available
- `audio_ready`: Kokoro MP3 playback can replace browser TTS

## Stack

- **Client:** React 19, TypeScript, Vite, Redux Toolkit, Tailwind CSS
- **Backend:** Firebase Cloud Functions (Python 3.13), Firestore, Storage
- **Local ingest dev:** [functions-framework](https://pypi.org/project/functions-framework/) (`functions/dev_server.py`)

## Local Setup

### Client only (browse existing issues)

If Firebase is configured in `.env.local`, you only need:

```bash
npm install
npm run dev
```

The app reads from production Firestore. Issues are ingested automatically each morning (~6am ET) by the deployed scheduler.

### Environment Variables

Create `.env.local`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Optional: test against deployed ingest_issue instead of local dev server
# VITE_INGEST_FUNCTION_URL=https://ingest-issue-....a.run.app
```

If Firebase variables are missing, the app runs in **mock mode** with demo issue data.

Do **not** set `VITE_USE_FIREBASE_EMULATOR` unless you are also running `firebase emulators:start --only firestore`. The default dev workflow writes to **production** Firestore and the client reads production too.

### Python Functions (dev ingest only)

Required only for the **Test: Fetch Latest Issue** button:

```bash
cd functions
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
gcloud auth application-default login
```

## Testing

### Lint and build

```bash
npm run lint
npm run build
```

### Test: Fetch Latest Issue (dev UI)

Triggers a manual ingest of today's Morning Brew issue. On success (new ingest or “already exists”), the Home page **automatically reloads the issue list** from Firestore and displays the latest issue card.

**Terminal 1 — ingest server:**

```bash
npm run dev:ingest
```

Runs functions-framework at `http://127.0.0.1:8787` (`functions/dev_server.py`). The dev client calls this URL automatically.

**Terminal 2 — client:**

```bash
npm run dev
```

**Then:** open `http://localhost:5173`, click **Test: Fetch Latest Issue**.

**Expected result:**

1. Button shows progress with elapsed time; ingest terminal prints `[ingest]` step logs.
2. Success message appears (e.g. `Successfully ingested issue 2026-06-09…` or `already exists. Skipping.`).
3. Issue list refreshes and the **Latest Daily Issue** hero (and past issues, if any) appear without a manual page reload.

#### Quick curl check

```bash
curl http://127.0.0.1:8787/
```

Expect `200` with `Successfully ingested issue YYYY-MM-DD…` or `already exists. Skipping.`

#### Force re-ingest (overwrite existing issue)

If today's issue is already in Firestore but you changed the parser, slide builder, or UI and need fresh slides/metadata, bypass the skip check:

```bash
curl "http://127.0.0.1:8787/?force=true"
```

Requires `npm run dev:ingest` to be running. Expect `200` with `Successfully ingested issue YYYY-MM-DD. Total slides: …`. Then hard-refresh the client.

You can also use the dev UI button when the issue does not exist yet; use force re-ingest when ingest returns `already exists. Skipping.`

#### Troubleshooting

| Symptom | Fix |
|--------|-----|
| Request pending / connection refused | Start `npm run dev:ingest` |
| Ingest succeeds but list stays empty | Confirm Firebase env vars in `.env.local` match `.firebaserc`; restart `npm run dev:ingest` and check logs show `Firestore project: morning-brew-slideshow-052126` (ADC can point at a different GCP project) |
| Firestore offline / backend didn't respond | Remove `VITE_USE_FIREBASE_EMULATOR=true` from `.env.local` |
| Ingest fails at Firestore step | Run `gcloud auth application-default login`, restart `npm run dev:ingest` |
| `403 Forbidden` on deployed URL | Allow unauthenticated invocations on Cloud Run, or use local `dev:ingest` |
| Port in use | `lsof -i :8787` then `kill <PID>` |

### Test against deployed ingest

Set in `.env.local`:

```bash
VITE_INGEST_FUNCTION_URL=https://your-ingest-issue-url.a.run.app
```

In dev, the test button still uses `http://127.0.0.1:8787`. Deploy with:

```bash
firebase deploy --only functions:ingest_issue
```

Deployed functions need **Allow unauthenticated invocations** on Cloud Run for browser calls.

## Key Modules

**Client**

- `src/firebase.ts` — Firebase initialization
- `src/store/issueSlice.ts` — issue list + dev test fetch
- `src/hooks/useIssue.ts` — real-time Firestore subscription (`issues/{YYYY-MM-DD}`)
- `src/hooks/useTTS.ts` — browser speech + Kokoro MP3 fallback
- `src/store/slideshowSlice.ts` — slide index + audio preference state
- `src/components/*` — slideshow player, status banner, links, TTS controls

**Functions**

- `functions/main.py` — deployed Cloud Functions (ingest, enrich, audio, backfill)
- `functions/dev_server.py` — local `ingest_issue` via functions-framework
- `functions/ingest_handler.py` — shared ingest logic (deploy + local)
