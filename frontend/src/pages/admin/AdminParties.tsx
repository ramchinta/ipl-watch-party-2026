import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import type { WatchParty } from '../../types'
import { PageHeader, StatusBadge, Spinner } from '../../components/shared'

export default function AdminParties() {
  const navigate = useNavigate()
  const [parties, setParties] = useState<WatchParty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'watchParties'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setParties(snap.docs.map(d => ({ id: d.id, ...d.data() } as WatchParty)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const active = parties.filter(p => p.status === 'active')
  const other = parties.filter(p => p.status !== 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Watch Parties"
        subtitle={`${parties.length} total · ${active.length} active`}
        onBack={() => navigate('/admin')}
      />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {loading ? <Spinner /> : (
          <>
            {active.length > 0 && (
              <>
                <div className="section-title">Active Now</div>
                {active.map(party => (
                  <PartyRow key={party.id} party={party} onViewLB={() => navigate(`/display/${party.id}`)} />
                ))}
              </>
            )}
            {other.length > 0 && (
              <>
                <div className="section-title">All Parties</div>
                {other.map(party => (
                  <PartyRow key={party.id} party={party} onViewLB={() => navigate(`/display/${party.id}`)} />
                ))}
              </>
            )}
            {parties.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🎉</div>
                <div>No watch parties created yet</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PartyRow({ party, onViewLB }: { party: WatchParty; onViewLB: () => void }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-sm">{party.name}</div>
          <div className="text-xs text-gray-400">by {party.hostName}</div>
        </div>
        <StatusBadge status={party.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{party.members.length} members · Code: <span className="font-mono font-bold text-ipl-orange">{party.joinCode}</span></span>
        <button onClick={onViewLB} className="text-ipl-blue font-medium hover:underline">
          Leaderboard →
        </button>
      </div>
    </div>
  )
}
