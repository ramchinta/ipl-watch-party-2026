# IPL Watch Party 2026 — GCP Deployment Guide

## What You're Deploying

| Layer | Service | What it does |
|---|---|---|
| Frontend | Firebase Hosting | React PWA served as static files |
| Database | Cloud Firestore | Real-time database for all app data |
| Auth | Firebase Authentication | Phone OTP for users, email/pass for host/admin |
| Backend | Cloud Functions (Node 20) | Score calculation, role management |
| Storage | Firebase project (included) | QR code images generated client-side |

---

## Prerequisites

Install these on your machine:

```bash
# Node.js 20+
node --version   # should be 20.x or higher

# Firebase CLI
npm install -g firebase-tools

# Verify
firebase --version   # should be 13.x+
```

---

## Step 1 — Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it e.g. `ipl-watch-party-2026`
4. Disable Google Analytics (not needed)
5. Click **Create project**

---

## Step 2 — Enable Firebase Services

### 2a. Firestore Database
1. In Firebase Console → **Firestore Database**
2. Click **Create database**
3. Choose **Production mode**
4. Select region: **asia-south1 (Mumbai)** ← best for India
5. Click **Enable**

### 2b. Authentication
1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → Enable **Phone**
   - Click Phone → toggle Enable → Save
3. Also enable **Email/Password** (for admin/host accounts)
   - Click Email/Password → toggle Enable → Save

### 2c. Hosting
1. Firebase Console → **Hosting** → **Get started**
2. Follow the setup wizard (we'll configure via CLI)

---

## Step 3 — Get Your Firebase Config

1. Firebase Console → **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → click **"</>"** (Web) → Register app
3. App nickname: `ipl-watch-party-web`
4. **Copy the firebaseConfig object** — you'll need these values

---

## Step 4 — Local Setup

```bash
# Clone / navigate to the project
cd ipl-watch-party

# Login to Firebase
firebase login

# Link to your project
firebase use --add
# Select your project from the list
# Give it alias: default

# Install all dependencies
cd frontend && npm install && cd ..
cd functions && npm install && cd ..
```

### 4a. Configure environment variables

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=ipl-watch-party-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ipl-watch-party-2026
VITE_FIREBASE_STORAGE_BUCKET=ipl-watch-party-2026.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_APP_URL=https://ipl-watch-party-2026.web.app
VITE_USE_EMULATORS=false
```

---

## Step 5 — Deploy Firestore Rules & Indexes

```bash
# From project root
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Step 6 — Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

Expected output:
```
✔  functions[onMatchResultUpdated]: Deployed
✔  functions[onUserProfileUpdated]: Deployed
✔  functions[setUserRole]: Deployed
✔  functions[bootstrapAdmin]: Deployed
```

---

## Step 7 — Build & Deploy Frontend

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

Your app is now live at:
`https://your-project-id.web.app`

---

## Step 8 — Bootstrap the First Admin Account

This is a one-time setup to create your admin user.

### 8a. Set the bootstrap secret in Functions config

```bash
firebase functions:config:set app.admin_secret="YOUR_SECRET_KEY_HERE"

# Redeploy functions to pick up the config
firebase deploy --only functions
```

### 8b. Create admin email account

1. Go to **Firebase Console → Authentication → Users**
2. Click **Add user**
3. Enter admin email + password
4. **Copy the UID** shown in the users table

### 8c. Call the bootstrap function

Open your browser console at your deployed app URL, or use curl:

```bash
# Replace with your actual values
curl -X POST \
  "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/bootstrapAdmin" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "uid": "PASTE_ADMIN_UID_HERE",
      "secretKey": "YOUR_SECRET_KEY_HERE"
    }
  }'
```

Or from browser console on your app (after logging in as the admin email):

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions'
const fn = httpsCallable(getFunctions(), 'bootstrapAdmin')
await fn({ uid: 'PASTE_UID_HERE', secretKey: 'YOUR_SECRET_KEY_HERE' })
```

### 8d. Sign in as admin

Go to `https://your-app.web.app/admin-login` and sign in with the admin email/password.

---

## Step 9 — Create Host Accounts

Hosts also use email/password login. To create a host:

1. **Firebase Console → Authentication** → Add user (email + password)
2. Copy the new user's UID
3. Sign in as admin → use the `setUserRole` callable function to assign host role:

From the browser console while logged in as admin:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions'
const fn = httpsCallable(getFunctions(), 'setUserRole')
await fn({ uid: 'HOST_UID_HERE', role: 'host' })
```

Or create a simple admin UI call — a basic script in the admin dashboard works too.

---

## Step 10 — Load IPL 2026 Fixtures

1. Sign in as admin → go to `https://your-app.web.app/admin`
2. Click **Fixtures**
3. Click **"Load Phase 1 Fixtures"** button
4. 20 matches (Mar 28 – Apr 12) will be seeded into Firestore
5. Phase 2 fixtures will be available once BCCI announces them — add them to `src/utils/iplFixtures.ts` and re-run seed

---

## Step 11 — Enable Phone Auth Test Numbers (Optional)

For testing without real SMS during development:

1. Firebase Console → Authentication → Sign-in method → Phone
2. Scroll to **Phone numbers for testing**
3. Add: `+1 555 555 1234` → OTP: `123456`

---

## Full Deploy Command (all at once)

```bash
cd frontend && npm run build && cd ..
firebase deploy
```

This deploys hosting + functions + firestore rules + indexes in one shot.

---

## Local Development with Emulators

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start frontend dev server
cd frontend
echo "VITE_USE_EMULATORS=true" >> .env.local
npm run dev
```

Emulator UI: `http://localhost:4000`
App: `http://localhost:5173`

---

## App URLs Reference

| URL | Who uses it |
|---|---|
| `/login` | Users — phone OTP login |
| `/admin-login` | Admin + Host — email login |
| `/home` | Users — join parties, view leaderboard |
| `/join?host=UID` | QR scan destination — users join host's parties |
| `/host` | Host dashboard |
| `/host/qr` | Host downloads QR code |
| `/admin` | Admin dashboard |
| `/admin/fixtures` | Admin manages IPL schedule |
| `/display/:partyId` | Full-screen leaderboard for TV casting |

---

## Firestore Data Structure

```
matches/
  M01/  { team1, team2, venue, city, matchDate, status,
           tossPredictionOpen, matchPredictionOpen, tossWinner, result }

watchParties/
  {partyId}/  { name, hostId, hostName, matchId, joinCode,
                qrCodeUrl, status, members[], createdAt }

users/
  {uid}/  { name, phone, role, favoriteTeam, food,
            profileComplete, joinedParties[] }

predictions/
  {partyId}_{matchId}_{userId}/
    { userId, partyId, matchId, tossWinner, matchWinner, locked }

scores/
  {partyId}_{userId}/
    { userId, partyId, userName, favoriteTeam,
      tossPoints, matchPoints, bonusPoints, totalPoints }
```

---

## Scoring Logic

| Action | Points |
|---|---|
| Correct toss prediction | +10 |
| Correct match winner | +20 |
| Host bonus (manual) | +5 or +10 (configurable) |
| Host deduction (manual) | -5 or -10 |

Scores are calculated automatically by `onMatchResultUpdated` Cloud Function
the moment the host/admin sets a toss winner or match result.

---

## Troubleshooting

**Phone OTP not sending**
- Check Firebase Console → Authentication → Phone is enabled
- Verify billing is enabled on the Firebase project (phone auth requires Blaze plan)
- Use test numbers during development

**Functions deploy fails**
- Run `cd functions && npm run build` first to check TypeScript errors
- Check Node version: `node --version` must be 20+

**Firestore permission denied**
- Re-deploy rules: `firebase deploy --only firestore:rules`
- Check user has correct role claim (admin/host/user)

**QR code not generating**
- `VITE_APP_URL` in `.env.local` must be set to your production URL
- The `qrcode` npm package runs entirely client-side — no backend needed

**Leaderboard not updating**
- Check Cloud Functions logs: `firebase functions:log`
- Verify `onMatchResultUpdated` deployed successfully
- Scores update only when admin sets toss/result — not in real time otherwise

---

## Firebase Billing Note

The **Blaze (pay-as-you-go)** plan is required for:
- Phone authentication (SMS OTP)
- Cloud Functions outbound network calls

For a watch party with 50–200 users, estimated monthly cost:
- **Firestore**: ~$0 (well within free tier)
- **Functions**: ~$0 (well within free tier)
- **Phone Auth**: First 10,000 verifications/month are free
- **Hosting**: Free tier covers up to 10 GB/month

Total expected cost for a full IPL season: **$0–$5**
