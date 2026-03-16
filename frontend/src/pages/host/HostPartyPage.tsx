import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subscribeToParty, startParty, completeParty } from '../../services/partyService'
import { subscribeToMatch, closeTossPrediction, closeMatchPrediction, openTossPrediction, openMatchPrediction, setTossResult, setMatchResult } from '../../services/matchService'
import { subscribeToLeaderboard } from '../../services/scoreService'
import type { WatchParty, Match, LeaderboardEntry, IPLTeam } from '../../types'
import { PageHeader, StatusBadge, MatchCard, LBRow, TeamBadge, Spinner } from '../../components/shared'
import toast from 'react-hot-toast'

export default function HostPartyPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const [party, setParty] = useState<WatchParty | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Result modal state
  const [showTossModal, setShowTossModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultMargin, setResultMargin] = useState('')

  useEffect(() => {
    if (!partyId) return
    const u1 = subscribeToParty(partyId, (p) => { setParty(p); setLoading(false) })
    const u3 = subscribeToLeaderboard(partyId, setLeaderboard)
    return () => { u1(); u3() }
  }, [partyId])

  useEffect(() => {
    if (!party?.matchId) return
    const u2 = subscribeToMatch(party.matchId, setMatch)
    return () => u2()
  }, [party?.matchId])

  async function action(key: string, fn: () => Promise<void>, successMsg: string) {
    setActionLoading(key)
    try { await fn(); toast.success(successMsg) }
    catch (e: any) { toast.error(e.message) }
    finally { setActionLoading(null) }
  }

  const mid = party?.matchId || ''
  const teams: IPLTeam[] = match ? [match.team1, match.team2] : []

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!party) return <div className="page-container text-center pt-20 text-gray-500">Party not found</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={party.name} subtitle={`${party.members.length} members`} onBack={() => navigate('/host')} />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
        {/* Party controls */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Party Status</span>
            <StatusBadge status={party.status} />
          </div>
          <div className="flex gap-2">
            {party.status === 'created' && (
              <button
                onClick={() => action('start', () => startParty(party.id), 'Party started!')}
                disabled={actionLoading === 'start'}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                {actionLoading === 'start' ? '...' : '▶ Start Party'}
              </button>
            )}
            {party.status === 'active' && (
              <>
                <button
                  onClick={() => navigate(`/host/party/${partyId}/leaderboard`)}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  📊 Leaderboard
                </button>
                <button
                  onClick={() => navigate(`/host/party/${partyId}/adjust`)}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  ✏️ Adjust Pts
                </button>
              </>
            )}
            {party.status === 'active' && (
              <button
                onClick={() => action('complete', () => completeParty(party.id), 'Party completed!')}
                className="btn-danger py-2.5 text-sm px-3"
              >
                End
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">Join Code:</span>
            <span className="font-mono font-bold text-ipl-orange tracking-widest">{party.joinCode}</span>
          </div>
        </div>

        {/* QR link */}
        <button
          onClick={() => navigate('/host/qr')}
          className="w-full card p-3 flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-ipl-blue/10 rounded-xl flex items-center justify-center text-xl">📲</div>
          <div className="text-left">
            <div className="text-sm font-semibold">Download QR Code</div>
            <div className="text-xs text-gray-400">Share with your guests</div>
          </div>
        </button>

        {/* Match info + prediction window controls */}
        {match && (
          <div className="card p-4">
            <div className="font-semibold text-sm mb-3">Match Controls</div>
            <div className="flex items-center gap-2 mb-4">
              <TeamBadge team={match.team1} size="md" />
              <span className="text-gray-400 text-sm">vs</span>
              <TeamBadge team={match.team2} size="md" />
            </div>

            {/* Toss prediction window */}
            <div className="border border-gray-100 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Toss Prediction</span>
                <StatusBadge status={match.tossPredictionOpen ? 'toss_open' : 'toss_closed'} />
              </div>
              <div className="flex gap-2">
                {!match.tossPredictionOpen ? (
                  <button
                    onClick={() => action('toss_open', () => openTossPrediction(mid), 'Toss window opened')}
                    disabled={!!actionLoading}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    onClick={() => action('toss_close', () => closeTossPrediction(mid), 'Toss window closed')}
                    disabled={!!actionLoading}
                    className="btn-danger text-xs py-1.5 px-3"
                  >
                    Close Window
                  </button>
                )}
                <button
                  onClick={() => setShowTossModal(true)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Set Toss Result
                </button>
              </div>
              {match.tossWinner && (
                <div className="text-xs text-gray-500 mt-2">
                  Toss won by: <TeamBadge team={match.tossWinner} size="xs" />
                </div>
              )}
            </div>

            {/* Match prediction window */}
            <div className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Match Prediction</span>
                <StatusBadge status={match.matchPredictionOpen ? 'match_open' : 'match_closed'} />
              </div>
              <div className="flex gap-2">
                {!match.matchPredictionOpen ? (
                  <button
                    onClick={() => action('match_open', () => openMatchPrediction(mid), 'Match window opened')}
                    disabled={!!actionLoading}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    onClick={() => action('match_close', () => closeMatchPrediction(mid), 'Match window closed')}
                    disabled={!!actionLoading}
                    className="btn-danger text-xs py-1.5 px-3"
                  >
                    Close Window
                  </button>
                )}
                <button
                  onClick={() => setShowResultModal(true)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Set Match Result
                </button>
              </div>
              {match.result && (
                <div className="text-xs text-gray-500 mt-2">
                  Winner: <TeamBadge team={match.result.winner} size="xs" /> · {match.result.margin}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard preview */}
        {leaderboard.length > 0 && (
          <>
            <div className="section-title">Leaderboard</div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map(e => <LBRow key={e.userId} entry={e} />)}
            </div>
            <button
              onClick={() => navigate(`/host/party/${partyId}/leaderboard`)}
              className="btn-secondary w-full text-sm"
            >
              Full Leaderboard →
            </button>
          </>
        )}
      </div>

      {/* Toss result modal */}
      {showTossModal && match && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm animate-slide-up">
            <div className="font-semibold mb-4">Who won the toss?</div>
            <div className="space-y-2 mb-4">
              {teams.map(team => (
                <button
                  key={team}
                  onClick={async () => {
                    await action('toss_result', () => setTossResult(mid, team), `${team} won toss — scores updated!`)
                    setShowTossModal(false)
                  }}
                  className="w-full p-3 rounded-xl border-2 border-gray-200 hover:border-ipl-orange text-left flex items-center gap-2"
                >
                  <TeamBadge team={team} size="md" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowTossModal(false)} className="btn-secondary w-full text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Match result modal */}
      {showResultModal && match && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm animate-slide-up">
            <div className="font-semibold mb-4">Match Result</div>
            <div className="space-y-2 mb-4">
              {teams.map(team => (
                <button
                  key={team}
                  onClick={async () => {
                    const margin = resultMargin.trim() || 'TBD'
                    await action('match_result', () => setMatchResult(mid, team, margin), `${team} won — scores updated!`)
                    setShowResultModal(false)
                  }}
                  className="w-full p-3 rounded-xl border-2 border-gray-200 hover:border-ipl-orange text-left flex items-center gap-2"
                >
                  <TeamBadge team={team} size="md" />
                  <span className="text-sm text-gray-500">won</span>
                </button>
              ))}
            </div>
            <input
              className="input-field mb-3"
              placeholder="Margin e.g. 'by 5 wickets' (optional)"
              value={resultMargin}
              onChange={e => setResultMargin(e.target.value)}
            />
            <button onClick={() => setShowResultModal(false)} className="btn-secondary w-full text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
