import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPartiesByHost, getPartyByCode, joinParty } from '../../services/partyService'
import { getUserProfile } from '../../services/authService'
import type { WatchParty } from '../../types'
import { Spinner, StatusBadge } from '../../components/shared'
import toast from 'react-hot-toast'

export default function JoinPartyPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { firebaseUser, appUser } = useAuth()

  const hostParam = params.get('host') || ''
  const [parties, setParties] = useState<WatchParty[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseUser) {
      navigate(`/login?host=${hostParam}&redirect=/join`)
      return
    }
    if (!appUser?.profileComplete) {
      navigate(`/setup?host=${hostParam}`)
      return
    }
    if (hostParam) {
      getPartiesByHost(hostParam)
        .then(ps => setParties(ps.filter(p => p.status !== 'completed')))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [firebaseUser, appUser, hostParam])

  async function handleJoin(party: WatchParty) {
    if (!firebaseUser) return
    setJoining(party.id)
    try {
      await joinParty(party.id, firebaseUser.uid)
      toast.success(`Joined "${party.name}"!`)
      navigate(`/party/${party.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setJoining(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-ipl-blue text-white px-5 py-6">
        <div className="max-w-sm mx-auto">
          <h1 className="text-xl font-bold">Join Watch Party 🏏</h1>
          {parties.length > 0 && (
            <p className="text-white/60 text-sm mt-1">
              Hosted by {parties[0].hostName}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-5">
        {parties.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">😔</div>
            <div className="font-semibold text-gray-700">No active parties</div>
            <div className="text-sm text-gray-400 mt-1">
              The host hasn't started any parties yet
            </div>
            <button onClick={() => navigate('/home')} className="btn-primary mt-4">
              Back to Home
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {parties.map(party => (
              <div key={party.id} className="card p-4 animate-slide-up">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold">{party.name}</div>
                  <StatusBadge status={party.status} />
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {party.members.length} joined · Code: <span className="font-mono font-bold">{party.joinCode}</span>
                </div>
                <button
                  onClick={() => handleJoin(party)}
                  disabled={joining === party.id}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                >
                  {joining === party.id
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Join This Party'
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
