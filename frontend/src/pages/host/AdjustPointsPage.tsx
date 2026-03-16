import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subscribeToLeaderboard, adjustBonusPoints } from '../../services/scoreService'
import type { LeaderboardEntry } from '../../types'
import { PageHeader, TeamBadge, Spinner } from '../../components/shared'
import { rankEmoji } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdjustPointsPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [pending, setPending] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!partyId) return
    const unsub = subscribeToLeaderboard(partyId, (e) => {
      setEntries(e)
      setLoading(false)
    })
    return () => unsub()
  }, [partyId])

  async function adjust(userId: string, delta: number) {
    if (!partyId) return
    setAdjusting(userId)
    try {
      await adjustBonusPoints(partyId, userId, delta)
      setPending(prev => ({ ...prev, [userId]: (prev[userId] || 0) + delta }))
      toast.success(`${delta > 0 ? '+' : ''}${delta} pts applied`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to adjust points')
    } finally {
      setAdjusting(null)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Adjust Points"
        subtitle="Mini-game bonuses & deductions"
        onBack={() => navigate(-1)}
      />

      <div className="max-w-sm mx-auto px-4 py-5">
        {/* Quick guide */}
        <div className="bg-ipl-orange-light border border-ipl-orange/20 rounded-xl p-3 mb-4 text-xs text-gray-600 leading-relaxed">
          Award bonus points for trivia, best dressed, commentary — or deduct for late arrivals!
          Changes are reflected on the live leaderboard instantly.
        </div>

        <div className="card divide-y divide-gray-100">
          {entries.map((entry) => (
            <div key={entry.userId} className="p-4 flex items-center gap-3">
              {/* Rank */}
              <div className="w-8 text-center text-sm">
                {rankEmoji(entry.rank)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{entry.userName}</div>
                {entry.favoriteTeam && <TeamBadge team={entry.favoriteTeam} size="xs" />}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {[-10, -5].map(d => (
                  <button
                    key={d}
                    onClick={() => adjust(entry.userId, d)}
                    disabled={adjusting === entry.userId}
                    className="w-9 h-9 rounded-full bg-red-50 border border-red-200 text-red-600
                               text-xs font-bold flex items-center justify-center
                               hover:bg-red-100 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {d}
                  </button>
                ))}

                <div className="text-center min-w-[40px]">
                  <div className="font-bold text-ipl-orange">{entry.totalPoints}</div>
                  <div className="text-xs text-gray-400">pts</div>
                </div>

                {[+5, +10].map(d => (
                  <button
                    key={d}
                    onClick={() => adjust(entry.userId, d)}
                    disabled={adjusting === entry.userId}
                    className="w-9 h-9 rounded-full bg-green-50 border border-green-200 text-green-600
                               text-xs font-bold flex items-center justify-center
                               hover:bg-green-100 active:scale-95 transition-all disabled:opacity-40"
                  >
                    +{d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <div>No members yet</div>
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="btn-secondary w-full mt-4 text-sm"
        >
          ← Back to Party
        </button>
      </div>
    </div>
  )
}
