import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToAllMatches } from '../../services/matchService'
import { seedMatches } from '../../services/matchService'
import type { Match } from '../../types'
import { PageHeader, StatusBadge, TeamBadge, Spinner } from '../../components/shared'
import { formatMatchDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdminFixtures() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')

  useEffect(() => {
    const unsub = subscribeToAllMatches((ms) => {
      setMatches(ms)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function handleSeed() {
    setSeeding(true)
    try {
      await seedMatches()
      toast.success('IPL 2026 fixtures loaded!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSeeding(false)
    }
  }

  const filtered = matches.filter(m => {
    if (filter === 'upcoming') return m.status !== 'completed'
    if (filter === 'completed') return m.status === 'completed'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Fixtures" subtitle={`${matches.length} matches`} onBack={() => navigate('/admin')} />

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Actions row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(['all', 'upcoming', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-ipl-orange text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {matches.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {seeding ? '...' : '⬇ Load Phase 1 Fixtures'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="space-y-2">
            {filtered.map(m => (
              <div
                key={m.id}
                onClick={() => navigate(`/admin/fixtures/${m.id}`)}
                className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium w-8">M{m.matchNumber}</span>
                    <TeamBadge team={m.team1} size="sm" />
                    <span className="text-gray-400 text-xs">vs</span>
                    <TeamBadge team={m.team2} size="sm" />
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="ml-8 text-xs text-gray-500">
                  {m.venue} · {m.city}
                </div>
                <div className="ml-8 text-xs text-gray-400 mt-0.5">
                  {formatMatchDate(m.matchDate)} · {m.timeIST}
                </div>
                {m.result && (
                  <div className="ml-8 mt-1.5 flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Won:</span>
                    <TeamBadge team={m.result.winner} size="xs" />
                    <span className="text-xs text-gray-400">{m.result.margin}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
