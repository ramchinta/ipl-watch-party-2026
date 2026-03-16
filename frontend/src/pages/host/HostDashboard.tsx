import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToHostParties } from '../../services/partyService'
import { signOut } from '../../services/authService'
import type { WatchParty } from '../../types'
import { StatusBadge, EmptyState, Spinner } from '../../components/shared'

export default function HostDashboard() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [parties, setParties] = useState<WatchParty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    const unsub = subscribeToHostParties(appUser.uid, (ps) => {
      setParties(ps)
      setLoading(false)
    })
    return () => unsub()
  }, [appUser])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-ipl-blue text-white px-5 pt-6 pb-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white/60 text-sm">Host Dashboard</div>
              <div className="text-xl font-bold">{appUser?.name}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/host/qr')}
                className="bg-white/10 text-white text-xs px-3 py-2 rounded-xl hover:bg-white/20"
              >
                My QR
              </button>
              <button
                onClick={() => signOut().then(() => navigate('/login'))}
                className="text-xs text-white/50 hover:text-white/80 px-2"
              >
                Sign out
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate('/host/create')}
            className="w-full bg-ipl-orange text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span> Create Watch Party
          </button>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 -mt-2 py-4">
        <div className="section-title">My Parties</div>

        {loading ? (
          <Spinner />
        ) : parties.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="No parties yet"
            subtitle="Create your first watch party above"
          />
        ) : (
          <div className="space-y-3">
            {parties.map(party => (
              <div
                key={party.id}
                onClick={() => navigate(`/host/party/${party.id}`)}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow animate-slide-up"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-sm flex-1 pr-2">{party.name}</div>
                  <StatusBadge status={party.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {party.members.length} member{party.members.length !== 1 ? 's' : ''}
                  </div>
                  <div className="font-mono text-xs text-ipl-orange font-bold">
                    {party.joinCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
