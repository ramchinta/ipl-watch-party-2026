import {
  collection, doc, setDoc, updateDoc, getDoc, getDocs,
  query, where, onSnapshot, serverTimestamp, Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
import type { Prediction, IPLTeam } from '../types'

function predId(partyId: string, matchId: string, userId: string) {
  return `${partyId}_${matchId}_${userId}`
}

export async function savePrediction(
  userId: string,
  partyId: string,
  matchId: string,
  tossWinner?: IPLTeam,
  matchWinner?: IPLTeam,
  powerplayGuess1?: number,
  powerplayGuess2?: number
): Promise<void> {
  const id = predId(partyId, matchId, userId)
  const ref = doc(db, 'predictions', id)
  const snap = await getDoc(ref)

  if (snap.exists() && snap.data().locked) throw new Error('Predictions are locked')

  await setDoc(ref, {
    id, userId, partyId, matchId,
    tossWinner: tossWinner ?? null,
    matchWinner: matchWinner ?? null,
    powerplayGuess1: powerplayGuess1 ?? null,
    powerplayGuess2: powerplayGuess2 ?? null,
    locked: false,
    createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getUserPrediction(partyId: string, matchId: string, userId: string): Promise<Prediction | null> {
  const snap = await getDoc(doc(db, 'predictions', predId(partyId, matchId, userId)))
  if (!snap.exists()) return null
  return snap.data() as Prediction
}

export async function getPartyPredictions(partyId: string, matchId: string): Promise<Prediction[]> {
  const q = query(
    collection(db, 'predictions'),
    where('partyId', '==', partyId),
    where('matchId', '==', matchId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Prediction)
}

export function subscribeToUserPrediction(
  partyId: string, matchId: string, userId: string,
  cb: (p: Prediction | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'predictions', predId(partyId, matchId, userId)), (snap) => {
    cb(snap.exists() ? (snap.data() as Prediction) : null)
  })
}
