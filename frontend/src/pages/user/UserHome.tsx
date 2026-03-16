import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPartiesByHost, getPartyByCode } from '../../services/partyService'
import { signOut } from '../../services/authService'
import type { WatchParty } from '../../types'
import { EmptyState, Spinner, StatusBadge } from '../../components/shared'
import toast from 'react-hot-toast'

export default function UserHome() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [myParties, setMyParties] = useState<WatchParty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    // Load parties the user has joined
    Promise.all(
      (appUser.joinedParties || []).slice(0, 10).map(async (id) => {
        const { getDoc, doc } = await import('firebase/firestore')
        const { db } = await import('../../services/firebase')
        const snap = await getDoc(doc(db, 'watchParties', id))
        if (snap.exists()) return { id: snap.id, ...snap.data() } as WatchParty
        return null
      })
    ).then(results => {
      setMyParties(results.filter(Boolean) as WatchParty[])
      setLoading(false)
    })
  }, [appUser])

  async function joinWithCode() {
    const c = code.trim().toUpperCase()
    if (c.length < 4) return toast.error('Enter a valid join code')
    const party = await getPartyByCode(c)
    if (!party) return toast.error('Party not found — check your code')
    navigate(`/party/${party.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-ipl-blue text-white px-5 pt-6 pb-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-white/60 text-sm">Welcome back,</div>
              <div className="text-xl font-bold">{appUser?.name || 'Cricket Fan'} 👋</div>
            </div>
            <button onClick={() => signOut().then(() => navigate('/login'))}
              className="text-xs text-white/50 hover:text-white/80">Sign out</button>
          </div>

          {/* Join card */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3">Join a Watch Party</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/20 text-white placeholder:text-white/50 px-3 py-2 rounded-xl text-sm border border-white/20 focus:border-white/60 outline-none"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={e => e.key === 'Enter' && joinWithCode()}
              />
              <button onClick={joinWithCode} className="bg-ipl-orange text-white px-4 py-2 rounded-xl text-sm font-medium">
                Join
              </button>
            </div>
            <div className="text-white/40 text-xs mt-2 text-center">
              or scan QR code shared by your host
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 -mt-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-6">
          My Parties
        </div>

        {loading ? (
          <Spinner />
        ) : myParties.length === 0 ? (
          <EmptyState
            icon="🏏"
            title="No parties yet"
            subtitle="Enter a code above or scan a QR from your host"
          />
        ) : (
          <div className="space-y-3">
            {myParties.map(party => (
              <div
                key={party.id}
                onClick={() => navigate(`/party/${party.id}`)}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow animate-slide-up"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-sm">{party.name}</div>
                  <StatusBadge status={party.status} />
                </div>
                <div className="text-xs text-gray-500">Hosted by {party.hostName}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {party.members.length} member{party.members.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
