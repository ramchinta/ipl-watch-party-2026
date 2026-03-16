import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import type { AppUser } from '../types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  appUser: AppUser | null
  loading: boolean
  role: 'admin' | 'host' | 'user' | null
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  role: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (!user) {
        setAppUser(null)
        setLoading(false)
        return
      }

      // Subscribe to user document
      const userRef = doc(db, 'users', user.uid)
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setAppUser({ uid: user.uid, ...snap.data() } as AppUser)
        }
        setLoading(false)
      })

      return () => unsubUser()
    })

    return () => unsubAuth()
  }, [])

  const role = appUser?.role ?? null

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
