import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { subscribeToLeaderboard } from '../../services/scoreService'
import { subscribeToParty } from '../../services/partyService'
import { subscribeToMatch } from '../../services/matchService'
import type { LeaderboardEntry, WatchParty, Match } from '../../types'
import { rankEmoji, getTeamColor } from '../../utils/helpers'
import { TeamBadge } from '../../components/shared'

export default function LeaderboardDisplay() {
  const { partyId } = useParams<{ partyId: string }>()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [party, setParty] = useState<WatchParty | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!partyId) return
    const u1 = subscribeToLeaderboard(partyId, setEntries)
    const u2 = subscribeToParty(partyId, (p) => {
      setParty(p)
      const u3 = subscribeToMatch(p.matchId, setMatch)
      return () => u3()
    })
    // Pulse every 3s for live indicator
    const interval = setInterval(() => setTick(t => t + 1), 3000)
    return () => { u1(); u2(); clearInterval(interval) }
  }, [partyId])

  return (
    <div className="min-h-screen bg-ipl-blue text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div>
          <div className="text-2xl font-bold">{party?.name || 'Watch Party'}</div>
          {match && (
            <div className="text-white/60 text-sm mt-0.5 flex items-center gap-2">
              <TeamBadge team={match.team1} size="sm" />
              <span>vs</span>
              <TeamBadge team={match.team2} size="sm" />
              <span>·</span>
              <span>{match.city}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <div className={`w-2.5 h-2.5 rounded-full bg-green-400 ${tick % 2 === 0 ? 'opacity-100' : 'opacity-40'} transition-opacity duration-500`} />
            <span className="text-green-400 text-sm font-semibold">LIVE</span>
          </div>
          <div className="text-white/40 text-xs mt-0.5">IPL Watch Party 2026</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex-1 px-8 py-6 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🏏</div>
              <div className="text-xl font-semibold text-white/60">Waiting for predictions...</div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {entries.map((entry, idx) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-500 ${
                  entry.rank === 1 ? 'bg-yellow-400/20 border border-yellow-400/40' :
                  entry.rank === 2 ? 'bg-white/10 border border-white/20' :
                  entry.rank === 3 ? 'bg-orange-400/10 border border-orange-400/20' :
                  'bg-white/5 border border-white/10'
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Rank */}
                <div className="w-12 text-center">
                  {entry.rank <= 3 ? (
                    <span className="text-2xl">{rankEmoji(entry.rank)}</span>
                  ) : (
                    <span className="text-lg font-bold text-white/50">#{entry.rank}</span>
                  )}
                </div>

                {/* Name + team */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg leading-tight truncate">{entry.userName}</div>
                  {entry.favoriteTeam && (
                    <div className="mt-0.5">
                      <TeamBadge team={entry.favoriteTeam} size="xs" />
                    </div>
                  )}
                </div>

                {/* Points breakdown */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-ipl-gold">{entry.totalPoints}</div>
                  <div className="text-xs text-white/40">
                    T:{entry.tossPoints} · M:{entry.matchPoints} · B:{entry.bonusPoints}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="text-white/30 text-xs">T = Toss · M = Match · B = Bonus</div>
        <div className="text-white/30 text-xs">Hosted by {party?.hostName}</div>
      </div>
    </div>
  )
}
