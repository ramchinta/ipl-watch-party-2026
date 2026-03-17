import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
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
  const batch = writeBatch(db)
  for (const inning of [1, 2] as Inning[]) {
    for (let over = 1; over <= 20; over++) {
      const id = overQId(matchId, inning, over)
      const ref = doc(db, 'overQuestions', id)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        batch.set(ref, {
          id, matchId, inning, overNumber: over,
          state: 'future' as QState,
          createdAt: serverTimestamp(),
        })
      }
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
  const q = query(
    collection(db, 'overGuesses'),
    where('matchId', '==', matchId),
    where('inning', '==', inning),
    where('overNumber', '==', over)
  )
  const snap = await getDocs(q)
  if (snap.empty) return

  const batch = writeBatch(db)
  for (const d of snap.docs) {
    const g = d.data() as OverGuess
    const pRuns   = g.guessRuns     != null ? calcRunsPoints(g.guessRuns, result.runs)         : 0
    const pWkts   = g.guessWickets  != null ? calcExactPoints(g.guessWickets, result.wickets)  : 0
    const pFours  = g.guessFours    != null ? calcExactPoints(g.guessFours, result.fours)      : 0
    const pSixes  = g.guessSixes    != null ? calcExactPoints(g.guessSixes, result.sixes)      : 0
    const total   = pRuns + pWkts + pFours + pSixes

    batch.update(d.ref, {
      pointsRuns: pRuns, pointsWickets: pWkts,
      pointsFours: pFours, pointsSixes: pSixes,
      totalPoints: total, updatedAt: serverTimestamp(),
    })

    // Add to score doc
    const scoreRef = doc(db, 'scores', `${g.partyId}_${g.userId}`)
    const scoreSnap = await getDoc(scoreRef)
    if (scoreSnap.exists()) {
      const prev = scoreSnap.data()
      const prevOver = (prev.overPoints || 0)
      const newOver  = prevOver + total
      const newTotal = (prev.tossPoints || 0) + (prev.matchPoints || 0) +
                       (prev.powerplayPoints || 0) + newOver + (prev.bonusPoints || 0)
      batch.update(scoreRef, {
        overPoints: newOver, totalPoints: newTotal, updatedAt: serverTimestamp(),
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
  const q = query(
    collection(db, 'overQuestions'),
    where('matchId', '==', matchId),
    orderBy('inning', 'asc'),
    orderBy('overNumber', 'asc')
  )
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data() as OverQuestion)))
}

export function subscribeToUserOverGuesses(
  matchId: string, partyId: string, userId: string,
  cb: (guesses: Record<string, OverGuess>) => void
): Unsubscribe {
  const q = query(
    collection(db, 'overGuesses'),
    where('matchId', '==', matchId),
    where('partyId', '==', partyId),
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
