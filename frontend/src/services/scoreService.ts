import {
  collection, doc, getDocs, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, Unsubscribe, getDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type { Score, LeaderboardEntry } from '../types'

export async function getLeaderboard(partyId: string): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, 'scores'),
    where('partyId', '==', partyId),
    orderBy('totalPoints', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() } as LeaderboardEntry))
}

export function subscribeToLeaderboard(partyId: string, cb: (entries: LeaderboardEntry[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'scores'),
    where('partyId', '==', partyId),
    orderBy('totalPoints', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() } as LeaderboardEntry)))
  })
}

export async function adjustBonusPoints(partyId: string, userId: string, delta: number): Promise<void> {
  const scoreRef = doc(db, 'scores', `${partyId}_${userId}`)
  const snap = await getDoc(scoreRef)
  if (!snap.exists()) throw new Error('Score not found — user may not have joined this party yet')

  const current = snap.data() as Score
  const newBonus = (current.bonusPoints || 0) + delta
  const newTotal = (current.tossPoints || 0) + (current.matchPoints || 0) +
                   (current.powerplayPoints || 0) + newBonus

  await updateDoc(scoreRef, {
    bonusPoints: newBonus,
    totalPoints: newTotal,
    updatedAt: serverTimestamp(),
  })
}

export async function getUserScore(partyId: string, userId: string): Promise<Score | null> {
  const snap = await getDoc(doc(db, 'scores', `${partyId}_${userId}`))
  if (!snap.exists()) return null
  return snap.data() as Score
}
