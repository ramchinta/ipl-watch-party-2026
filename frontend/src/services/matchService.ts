import {
  collection, doc, getDocs, getDoc, updateDoc,
  query, orderBy, onSnapshot, Unsubscribe, writeBatch,
  serverTimestamp, setDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type { Match, IPLTeam } from '../types'
import { IPL_2026_FIXTURES } from '../utils/iplFixtures'

// Seed all IPL 2026 fixtures into Firestore (admin only, run once)
export async function seedMatches(): Promise<void> {
  const batch = writeBatch(db)
  IPL_2026_FIXTURES.forEach((m) => {
    const ref = doc(db, 'matches', m.id)
    batch.set(ref, m)
  })
  await batch.commit()
}

export async function getAllMatches(): Promise<Match[]> {
  const q = query(collection(db, 'matches'), orderBy('matchDate', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Match))
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const snap = await getDoc(doc(db, 'matches', matchId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Match
}

export async function updateMatch(matchId: string, data: Partial<Match>): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), { ...data, updatedAt: serverTimestamp() })
}

export async function setTossResult(matchId: string, winner: IPLTeam): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    tossWinner: winner,
    status: 'toss_closed',
    updatedAt: serverTimestamp(),
  })
}

export async function setMatchResult(matchId: string, winner: IPLTeam, margin: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    result: { winner, margin },
    status: 'completed',
    matchPredictionOpen: false,
    tossPredictionOpen: false,
    updatedAt: serverTimestamp(),
  })
}

export async function closeTossPrediction(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    tossPredictionOpen: false,
    status: 'toss_closed',
    updatedAt: serverTimestamp(),
  })
}

export async function closeMatchPrediction(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    matchPredictionOpen: false,
    status: 'match_closed',
    updatedAt: serverTimestamp(),
  })
}

export async function openTossPrediction(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    tossPredictionOpen: true,
    status: 'toss_open',
    updatedAt: serverTimestamp(),
  })
}

export async function openMatchPrediction(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    matchPredictionOpen: true,
    status: 'match_open',
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToMatch(matchId: string, cb: (m: Match) => void): Unsubscribe {
  return onSnapshot(doc(db, 'matches', matchId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as Match)
  })
}

export function subscribeToAllMatches(cb: (matches: Match[]) => void): Unsubscribe {
  const q = query(collection(db, 'matches'), orderBy('matchDate', 'asc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)))
  })
}

// ── Powerplay controls ────────────────────────────────────────────────────────
export async function openPowerplay(matchId: string, team: 1 | 2): Promise<void> {
  const field = team === 1 ? 'powerplay.team1Open' : 'powerplay.team2Open'
  await updateDoc(doc(db, 'matches', matchId), {
    [field]: true,
    updatedAt: serverTimestamp(),
  })
}

export async function closePowerplay(matchId: string, team: 1 | 2): Promise<void> {
  const field = team === 1 ? 'powerplay.team1Open' : 'powerplay.team2Open'
  await updateDoc(doc(db, 'matches', matchId), {
    [field]: false,
    updatedAt: serverTimestamp(),
  })
}

export async function setPowerplayScore(matchId: string, team: 1 | 2, score: number): Promise<void> {
  const field = team === 1 ? 'powerplay.team1Score' : 'powerplay.team2Score'
  const openField = team === 1 ? 'powerplay.team1Open' : 'powerplay.team2Open'
  await updateDoc(doc(db, 'matches', matchId), {
    [field]: score,
    [openField]: false,  // auto-close when score is set
    updatedAt: serverTimestamp(),
  })
}

export async function initPowerplay(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    powerplay: {
      team1Open: false,
      team2Open: false,
    },
    updatedAt: serverTimestamp(),
  })
}
