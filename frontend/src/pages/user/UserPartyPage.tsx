import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToParty, joinParty } from '../../services/partyService'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToLeaderboard } from '../../services/scoreService'
import type { WatchParty, Match, LeaderboardEntry } from '../../types'
import { PageHeader, StatusBadge, MatchCard, LBRow, Spinner } from '../../components/shared'
import toast from 'react-hot-toast'

export default function UserPartyPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { firebaseUser, appUser } = useAuth()

  const [party, setParty] = useState<WatchParty | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partyId) return
    const unsub1 = subscribeToParty(partyId, async (p) => {
      setParty(p)
      setLoading(false)
      const unsub2 = subscribeToMatch(p.matchId, setMatch)
      return () => unsub2()
    })
    const unsub3 = subscribeToLeaderboard(partyId, setLeaderboard)
    return () => { unsub1(); unsub3() }
  }, [partyId])

  // Auto-join if user got here via link
  useEffect(() => {
    if (!party || !firebaseUser) return
    if (!party.members.includes(firebaseUser.uid)) {
      joinParty(party.id, firebaseUser.uid).catch(() => {})
    }
  }, [party, firebaseUser])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!party) return <div className="page-container text-center pt-20 text-gray-500">Party not found</div>

  const myRank = leaderboard.find(e => e.userId === firebaseUser?.uid)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={party.name}
        subtitle={`Hosted by ${party.hostName}`}
        onBack={() => navigate('/home')}
      />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
        {/* Party status */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-1">Party Status</div>
            <StatusBadge status={party.status} />
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">Join Code</div>
            <div className="font-mono font-bold text-ipl-orange tracking-widest">{party.joinCode}</div>
          </div>
        </div>

        {/* Match info */}
        {match && (
          <>
            <div className="section-title">Today's Match</div>
            <MatchCard match={match} />

            {/* Predict button — shown when party is active */}
            {party.status === 'active' && (
              <button
                onClick={() => navigate(`/party/${partyId}/predict`)}
                className="btn-primary w-full"
              >
                Make Predictions 🎯
              </button>
            )}

            {/* Window status */}
            <div className="card p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Prediction Windows
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Toss Prediction</span>
                  <StatusBadge status={match.tossPredictionOpen ? 'toss_open' : 'toss_closed'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Match Winner</span>
                  <StatusBadge status={match.matchPredictionOpen ? 'match_open' : 'match_closed'} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* My score */}
        {myRank && (
          <div className="card p-4 bg-ipl-orange-light border border-ipl-orange/20">
            <div className="text-xs text-ipl-orange font-semibold mb-1">Your Standing</div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-2xl text-ipl-orange">#{myRank.rank}</div>
              <div className="text-right">
                <div className="font-bold text-xl">{myRank.totalPoints}</div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <>
            <div className="section-title">Leaderboard</div>
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map(entry => (
                <LBRow
                  key={entry.userId}
                  entry={entry}
                  highlight={entry.userId === firebaseUser?.uid}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
