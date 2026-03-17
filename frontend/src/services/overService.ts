import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, where, onSnapshot, serverTimestamp,
  writeBatch, Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
import type { OverQuestion, OverGuess, QState, Inning } from '../types'
import { calcRunsPoints, calcExactPoints } from '../types'

// ── IDs ──────────────────────────────────────────────────────────────────────
export function overQId(matchId: string, inning: Inning, over: number) {
  return `${matchId}_inn${inning}_over${over}`
}
export function overGuessId(matchId: string, inning: Inning, over: number, userId: string) {
  return `${matchId}_inn${inning}_over${over}_${userId}`
}

// ── Admin: seed all 40 overs (20 per inning) for a match ────────────────────
export async function seedOverQuestions(matchId: string): Promise<void> {
  // Use two batches — Firestore batch limit is 500 writes, 40 is fine in one
  const batch = writeBatch(db)
  for (const inning of [1, 2] as Inning[]) {
    for (let over = 1; over <= 20; over++) {
      const id = overQId(matchId, inning, over)
      batch.set(doc(db, 'overQuestions', id), {
        id, matchId, inning, overNumber: over,
        state: 'future' as QState,
        createdAt: serverTimestamp(),
      }, { merge: true })  // merge: true so existing docs aren't overwritten
    }
  }
  await batch.commit()
}

// ── Admin: set over state ────────────────────────────────────────────────────
export async function setOverState(
  matchId: string, inning: Inning, over: number, state: QState
): Promise<void> {
  await updateDoc(doc(db, 'overQuestions', overQId(matchId, inning, over)), {
    state, updatedAt: serverTimestamp(),
  })
}

// ── Admin: set actual result + auto-score all guesses ───────────────────────
export async function setOverResult(
  matchId: string, inning: Inning, over: number,
  result: { runs: number; wickets: number; fours: number; sixes: number }
): Promise<void> {
  const qId = overQId(matchId, inning, over)

  // Update the over question doc
  await updateDoc(doc(db, 'overQuestions', qId), {
    state: 'completed' as QState,
    actualRuns: result.runs,
    actualWickets: result.wickets,
    actualFours: result.fours,
    actualSixes: result.sixes,
    updatedAt: serverTimestamp(),
  })

  // Score all guesses for this over
  // Use matchId + inning only, filter overNumber client-side to avoid 3-field index
  const q = query(
    collection(db, 'overGuesses'),
    where('matchId', '==', matchId),
    where('inning', '==', inning)
  )
  const snap = await getDocs(q)
  if (snap.empty) return

  // Step 1: Calculate points per guess and accumulate per user+party
  // Using a map to avoid multiple batch.update calls on the same score doc
  const guessUpdates: { ref: any; pts: any }[] = []
  const scoreAccumulator: Record<string, { partyId: string; userId: string; delta: number }> = {}

  for (const d of snap.docs) {
    const g = d.data() as OverGuess
    if (g.overNumber !== over) continue  // client-side filter

    const pRuns   = g.guessRuns     != null ? calcRunsPoints(g.guessRuns, result.runs)        : 0
    const pWkts   = g.guessWickets  != null ? calcExactPoints(g.guessWickets, result.wickets) : 0
    const pFours  = g.guessFours    != null ? calcExactPoints(g.guessFours, result.fours)     : 0
    const pSixes  = g.guessSixes    != null ? calcExactPoints(g.guessSixes, result.sixes)     : 0
    const total   = pRuns + pWkts + pFours + pSixes

    guessUpdates.push({
      ref: d.ref,
      pts: { pointsRuns: pRuns, pointsWickets: pWkts, pointsFours: pFours, pointsSixes: pSixes, totalPoints: total }
    })

    // Accumulate delta per score doc key (one entry per partyId+userId)
    const key = `${g.partyId}_${g.userId}`
    if (scoreAccumulator[key]) {
      scoreAccumulator[key].delta += total
    } else {
      scoreAccumulator[key] = { partyId: g.partyId, userId: g.userId, delta: total }
    }
  }

  if (guessUpdates.length === 0) return

  // Step 2: Read all affected score docs (deduplicated)
  const batch = writeBatch(db)

  // Update guess docs
  for (const { ref, pts } of guessUpdates) {
    batch.update(ref, { ...pts, updatedAt: serverTimestamp() })
  }

  // Step 3: Update score docs — one update per user+party
  for (const key of Object.keys(scoreAccumulator)) {
    const { partyId, userId, delta } = scoreAccumulator[key]
    const scoreRef = doc(db, 'scores', `${partyId}_${userId}`)
    const scoreSnap = await getDoc(scoreRef)
    if (scoreSnap.exists()) {
      const prev = scoreSnap.data()
      const newOverPts = (prev.overPoints || 0) + delta
      const newTotal = (prev.tossPoints || 0) + (prev.matchPoints || 0) +
                       (prev.powerplayPoints || 0) + newOverPts + (prev.bonusPoints || 0)
      batch.update(scoreRef, {
        overPoints: newOverPts,
        totalPoints: newTotal,
        updatedAt: serverTimestamp(),
      })
    }
  }

  await batch.commit()
}

// ── User: save / update guess ────────────────────────────────────────────────
export async function saveOverGuess(
  userId: string, partyId: string, matchId: string,
  inning: Inning, over: number,
  guess: { runs?: number; wickets?: number; fours?: number; sixes?: number }
): Promise<void> {
  const id = overGuessId(matchId, inning, over, userId)
  await setDoc(doc(db, 'overGuesses', id), {
    id, userId, partyId, matchId, inning, overNumber: over,
    guessRuns:    guess.runs    ?? null,
    guessWickets: guess.wickets ?? null,
    guessFours:   guess.fours   ?? null,
    guessSixes:   guess.sixes   ?? null,
    submittedAt: serverTimestamp(),
  }, { merge: true })
}

// ── Subscriptions ────────────────────────────────────────────────────────────
export function subscribeToMatchOvers(
  matchId: string, cb: (overs: OverQuestion[]) => void
): Unsubscribe {
  // Simple where query — sort client-side to avoid composite index requirement
  const q = query(
    collection(db, 'overQuestions'),
    where('matchId', '==', matchId)
  )
  return onSnapshot(q, snap => {
    const overs = snap.docs
      .map(d => d.data() as OverQuestion)
      .sort((a, b) => a.inning !== b.inning ? a.inning - b.inning : a.overNumber - b.overNumber)
    cb(overs)
  })
}

export function subscribeToUserOverGuesses(
  matchId: string, partyId: string, userId: string,
  cb: (guesses: Record<string, OverGuess>) => void
): Unsubscribe {
  // Filter by matchId + userId only (partyId checked client-side) to avoid composite index
  const q = query(
    collection(db, 'overGuesses'),
    where('matchId', '==', matchId),
    where('userId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const map: Record<string, OverGuess> = {}
    snap.docs.forEach(d => {
      const g = d.data() as OverGuess
      map[overQId(matchId, g.inning, g.overNumber)] = g
    })
    cb(map)
  })
}
