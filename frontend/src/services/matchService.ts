import {
  collection, doc, getDocs, getDoc, updateDoc,
  query, orderBy, onSnapshot, Unsubscribe, writeBatch,
  serverTimestamp, setDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type { Match, IPLTeam, QState } from '../types'
import { IPL_2026_FIXTURES } from '../utils/iplFixtures'

export async function seedMatches(): Promise<void> {
  const batch = writeBatch(db)
  IPL_2026_FIXTURES.forEach((m) => {
    batch.set(doc(db, 'matches', m.id), m)
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

// ── Toss controls ──────────────────────────────────────────────────────────
export async function setTossQState(matchId: string, state: QState): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    tossState: state,
    updatedAt: serverTimestamp(),
  })
}

export async function setTossResult(matchId: string, winner: IPLTeam): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    tossWinner: winner,
    tossState: 'completed',
    updatedAt: serverTimestamp(),
  })
}

// ── Match controls ─────────────────────────────────────────────────────────
export async function setMatchQState(matchId: string, state: QState): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    matchState: state,
    updatedAt: serverTimestamp(),
  })
}

export async function setMatchResult(matchId: string, winner: IPLTeam, margin: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    result: { winner, margin },
    matchState: 'completed',
    updatedAt: serverTimestamp(),
  })
}

// ── Powerplay controls ─────────────────────────────────────────────────────
export async function initPowerplay(matchId: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    powerplay: { team1State: 'future', team2State: 'future' },
    updatedAt: serverTimestamp(),
  })
}

export async function setPowerplayQState(matchId: string, team: 1 | 2, state: QState): Promise<void> {
  const field = team === 1 ? 'powerplay.team1State' : 'powerplay.team2State'
  await updateDoc(doc(db, 'matches', matchId), {
    [field]: state,
    updatedAt: serverTimestamp(),
  })
}

export async function setPowerplayScore(matchId: string, team: 1 | 2, score: number): Promise<void> {
  const scoreField = team === 1 ? 'powerplay.team1Score' : 'powerplay.team2Score'
  const stateField = team === 1 ? 'powerplay.team1State' : 'powerplay.team2State'
  await updateDoc(doc(db, 'matches', matchId), {
    [scoreField]: score,
    [stateField]: 'completed',
    updatedAt: serverTimestamp(),
  })
}

// ── Subscriptions ──────────────────────────────────────────────────────────
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

// Legacy aliases for host page (host still uses open/close for toss/match)
export const openTossPrediction  = (id: string) => setTossQState(id, 'open')
export const closeTossPrediction = (id: string) => setTossQState(id, 'closed')
export const openMatchPrediction  = (id: string) => setMatchQState(id, 'open')
export const closeMatchPrediction = (id: string) => setMatchQState(id, 'closed')
