import {
  signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult,
  signInWithEmailAndPassword, signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { AppUser, IPLTeam } from '../types'

let confirmationResult: ConfirmationResult | null = null
let recaptchaVerifier: RecaptchaVerifier | null = null

export function initRecaptcha(containerId: string) {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch (_) {}
    recaptchaVerifier = null
  }
  const container = document.getElementById(containerId)
  if (!container) return
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {
      try { recaptchaVerifier?.clear() } catch (_) {}
      recaptchaVerifier = null
    },
  })
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  initRecaptcha('recaptcha-container')
  if (!recaptchaVerifier) throw new Error('reCAPTCHA could not be initialised. Please refresh the page.')
  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
  } catch (e: any) {
    try { recaptchaVerifier?.clear() } catch (_) {}
    recaptchaVerifier = null
    throw e
  }
}

export async function verifyOTP(otp: string): Promise<{ uid: string; isNewUser: boolean }> {
  if (!confirmationResult) throw new Error('No confirmation result — please request OTP again')
  const credential = await confirmationResult.confirm(otp)
  const uid = credential.user.uid
  const userSnap = await getDoc(doc(db, 'users', uid))
  const isNewUser = !userSnap.exists()
  if (isNewUser) {
    await setDoc(doc(db, 'users', uid), {
      uid, phone: credential.user.phoneNumber, name: '', role: 'user',
      joinedParties: [], profileComplete: false, createdAt: serverTimestamp(),
    })
  }
  return { uid, isNewUser: !userSnap.data()?.profileComplete }
}

export async function completeProfile(uid: string, data: { name: string; food?: string; favoriteTeam?: IPLTeam }): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    name: data.name, food: data.food || null, favoriteTeam: data.favoriteTeam || null, profileComplete: true,
  })
}

export async function signInAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as AppUser
}
