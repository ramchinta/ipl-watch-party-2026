# 🏏 IPL Watch Party 2026 — Fantasy Cricket League

A full-stack web app for hosting IPL watch party fantasy leagues. Friends gather, make predictions, earn points, and compete on a live leaderboard.

## Features

### Users
- Phone OTP login (no password needed)
- First-time profile setup: name (required), food preference, favorite team
- Join parties via QR scan, 6-digit code, or direct link
- Predict toss winner (+10 pts) and match winner (+20 pts)
- Real-time leaderboard with live standings

### Hosts
- Create watch parties tied to specific IPL matches
- One persistent QR code per host — covers all parties
- Per-party 6-digit join code
- Open/close toss and match prediction windows
- Set toss result and match result (auto-scores all predictions)
- Live leaderboard display (full-screen, perfect for TV casting)
- Manual point adjustments for watch party mini-games (+5, +10, -5, -10)

### Admin
- Manage full IPL 2026 fixture list (Phase 1 pre-loaded: 20 matches)
- Edit venue, city, and time for any match
- Open/close prediction windows across all parties
- Set toss and match results (triggers automatic scoring)
- Overview of all watch parties

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Database**: Cloud Firestore (real-time)
- **Auth**: Firebase Authentication (Phone OTP + Email/Password)
- **Backend**: Cloud Functions for Firebase (Node 20)
- **Hosting**: Firebase Hosting (PWA)
- **Infrastructure**: Google Cloud Platform

## Quick Start

```bash
npm install
cd frontend && npm install
cd ../functions && npm install
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full GCP deployment guide.

## Project Structure

```
ipl-watch-party/
├── frontend/               # React PWA
│   └── src/
│       ├── pages/
│       │   ├── auth/       # Login, OTP, Profile setup
│       │   ├── user/       # Home, Join party, Predict
│       │   ├── host/       # Dashboard, Create, QR, Leaderboard, Adjust pts
│       │   └── admin/      # Dashboard, Fixtures, Match detail, Parties
│       ├── services/       # Firebase service layer
│       ├── components/     # Shared UI components
│       ├── context/        # Auth context
│       ├── types/          # TypeScript types + IPL constants
│       └── utils/          # Helpers + IPL 2026 fixtures data
├── functions/              # Cloud Functions
│   └── src/index.ts        # Score engine + role management
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Composite indexes
├── firebase.json           # Firebase project config
└── docs/
    └── DEPLOYMENT.md       # Full GCP setup guide
```

## IPL 2026 Schedule

- **Season**: 19th edition (TATA IPL 2026)
- **Start**: 28 March 2026 — RCB vs SRH, M. Chinnaswamy Stadium
- **Final**: 31 May 2026 — M. Chinnaswamy Stadium, Bengaluru
- **Teams**: MI, CSK, RCB, KKR, SRH, GT, RR, LSG, DC, PBKS
- **Phase 1**: 20 matches pre-loaded (Mar 28 – Apr 12)
- **Phase 2**: Add to `src/utils/iplFixtures.ts` when BCCI announces

## Scoring

| Prediction | Points |
|---|---|
| Correct toss winner | +10 |
| Correct match winner | +20 |
| Host bonus (trivia, etc.) | +5 / +10 |
| Host deduction | -5 / -10 |
