# MoodMelody — Mood-Based Music Recommender

A web app that detects your mood from a chat message and recommends Spotify tracks to match. Sentiment analysis runs locally in the browser (VADER), and the app uses your Spotify account to search tracks, play them via the Web Playback SDK, and save mood-based playlists.

## Features

- **Mood chatbot** — type how you feel ("I feel like dancing", "had a rough day"); VADER + keyword boosting detects the mood and confidence.
- **Spotify recommendations** — searches genres mapped to your detected mood, opens a modal of 10 tracks, plays any of them, or saves the batch as a playlist.
- **Embedded player** — collapsed mini-player and an expandable view with progress bar, prev/play/next, and the current mood tag.
- **Library** — browse your Spotify playlists and play them.
- **Mood history** — chronological log plus a Chart.js doughnut chart of mood frequency.
- **Settings** — disconnect Spotify, toggle history saving, adjust mood-sensitivity / discovery-level preferences, export all local data as JSON, clear history.

## Tech stack

- **Frontend**: vanilla HTML / CSS / JavaScript, Bootstrap 5.3, Font Awesome 6.5
- **Sentiment**: [`vader-sentiment`](https://www.npmjs.com/package/vader-sentiment) (loaded via jsDelivr CDN)
- **Charts**: Chart.js
- **Music**: Spotify Web API + Web Playback SDK
- **Backend**: Node.js + Express (OAuth proxy only — keeps the client secret off the browser)
- **Fonts**: Quicksand, Pacifico (Google Fonts)

## Project structure

```
MoodMelody/
├── index.html              SPA shell: sidebar, sections, player, modal
├── css/style.css           Pastel theme, layout, responsive rules
├── js/
│   ├── app.js              Bootstrap — initializes UI + Spotify on DOMContentLoaded
│   ├── storage.js          localStorage wrapper (tokens, user, history, settings)
│   ├── spotify.js          OAuth tokens, Web Playback SDK, search/play/playlist API
│   ├── chatbot.js          VADER + keyword mood detection, response dispatch
│   └── ui.js               DOM rendering, event wiring, section switching, chart
├── server/
│   ├── server.js           Express app on :3000 — serves the SPA and proxies OAuth
│   └── package.json        express, axios, dotenv
└── assets/images/placeholder.png
```

## Setup

### 1. Create a Spotify app

1. Go to <https://developer.spotify.com/dashboard> and create an app.
2. Add `http://127.0.0.1:3000/api/auth/spotify/callback` as a Redirect URI.
3. Copy the **Client ID** and **Client Secret**.

### 2. Configure the backend

Create `server/.env`:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/spotify/callback
```

Also update the client ID in [`js/spotify.js`](js/spotify.js) (`Spotify.clientId`) to match the same app.

### 3. Install and run

```bash
cd server
npm install
npm start
```

Open <http://127.0.0.1:3000>. The Express server serves both the API and the static frontend.

> **Note:** Spotify's Web Playback SDK requires a **Premium** account to stream tracks. A free account can still authenticate, browse playlists, and see recommendations, but playback will fail.

## How it works

1. **Sign in** — clicking *Connect Spotify* sends you through Spotify OAuth via the Express server. The callback redirects back to the SPA with tokens in the URL, which the client stores in `localStorage`.
2. **Detect mood** — typing in the chat runs `Chatbot.detectMood`, which combines VADER compound scores with a keyword dictionary (happy, sad, calm, angry, energetic, romantic, nostalgic, anxious).
3. **Search** — `Spotify.searchTracks(mood)` maps the mood to a genre seed (`happy → pop/dance/upbeat`, `sad → acoustic/indie/ballad`, etc.) and hits `/v1/search`.
4. **Recommend** — the top 10 results are rendered in a Bootstrap modal. Play individually, *Play All*, or *Save as Playlist* into your Spotify account.
5. **History** — each detection is saved to `localStorage` (gated by the *Save mood history* setting) and rendered as a list plus a doughnut chart.

## API endpoints (Express)

| Route | Purpose |
|---|---|
| `GET /api/auth/spotify` | Redirect to Spotify authorize URL with the configured scopes |
| `GET /api/auth/spotify/callback` | Exchange code for tokens, redirect back to SPA |
| `GET /api/auth/refresh_token?refresh_token=…` | Exchange refresh token for a new access token |

Scopes requested: `user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private streaming user-read-playback-state user-modify-playback-state`.

## Privacy

- All mood history and settings live in your browser's `localStorage`.
- Tokens are stored in the browser; the client secret only ever lives in `server/.env`.
- *Export Your Data* downloads everything as JSON. *Clear Mood History* and *Disconnect Spotify* wipe the relevant entries.
