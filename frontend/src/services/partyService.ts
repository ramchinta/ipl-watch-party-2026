import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp,
  writeBatch, Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
import type { WatchParty, PartyStatus } from '../types'

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createWatchParty(
  hostId: string,
  hostName: string,
  name: string,
  matchId: string,
  qrCodeUrl: string
): Promise<string> {
  const joinCode = generateJoinCode()
  const ref = await addDoc(collection(db, 'watchParties'), {
    name,
    hostId,
    hostName,
    matchId,
    joinCode,
    qrCodeUrl,
    status: 'created' as PartyStatus,
    members: [],
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getPartyByCode(joinCode: string): Promise<WatchParty | null> {
  const q = query(
    collection(db, 'watchParties'),
    where('joinCode', '==', joinCode.toUpperCase())
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as WatchParty
}

export async function getPartiesByHost(hostId: string): Promise<WatchParty[]> {
  const q = query(
    collection(db, 'watchParties'),
    where('hostId', '==', hostId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WatchParty))
}

export async function joinParty(partyId: string, userId: string): Promise<void> {
  const ref = doc(db, 'watchParties', partyId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Party not found')
  const members: string[] = snap.data().members || []
  if (!members.includes(userId)) {
    await updateDoc(ref, { members: [...members, userId] })
  }
  // Also update user's joinedParties
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)
  if (userSnap.exists()) {
    const joined: string[] = userSnap.data().joinedParties || []
    if (!joined.includes(partyId)) {
      await updateDoc(userRef, { joinedParties: [...joined, partyId] })
    }
  }
  // Initialize score entry if not exists
  const scoreRef = doc(db, 'scores', `${partyId}_${userId}`)
  const scoreSnap = await getDoc(scoreRef)
  if (!scoreSnap.exists()) {
    const userData = userSnap.exists() ? userSnap.data() : {}
    await updateDoc(scoreRef, {}).catch(async () => {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(scoreRef, {
        userId,
        partyId,
        userName: userData.name || 'Guest',
        favoriteTeam: userData.favoriteTeam || null,
        tossPoints: 0,
        matchPoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
        updatedAt: serverTimestamp(),
      })
    })
  }
}

export async function startParty(partyId: string): Promise<void> {
  await updateDoc(doc(db, 'watchParties', partyId), {
    status: 'active',
    startedAt: serverTimestamp(),
  })
}

export async function completeParty(partyId: string): Promise<void> {
  await updateDoc(doc(db, 'watchParties', partyId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  })
}

export function subscribeToParty(partyId: string, cb: (p: WatchParty) => void): Unsubscribe {
  return onSnapshot(doc(db, 'watchParties', partyId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as WatchParty)
  })
}

export function subscribeToHostParties(hostId: string, cb: (parties: WatchParty[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'watchParties'),
    where('hostId', '==', hostId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as WatchParty)))
  })
}
