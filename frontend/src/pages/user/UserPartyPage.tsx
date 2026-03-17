import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToParty, joinParty } from '../../services/partyService'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToLeaderboard } from '../../services/scoreService'
import { subscribeToUserPrediction } from '../../services/predictionService'
import type { WatchParty, Match, LeaderboardEntry, Prediction } from '../../types'
import { POINTS } from '../../types'
import { PageHeader, StatusBadge, TeamBadge, LBRow, Spinner } from '../../components/shared'
import { formatMatchDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function UserPartyPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()

  const [party, setParty] = useState<WatchParty | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!partyId || !party?.matchId || !firebaseUser) return
    const u4 = subscribeToUserPrediction(partyId, party.matchId, firebaseUser.uid, setPrediction)
    return () => u4()
  }, [partyId, party?.matchId, firebaseUser])

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
  const pp = match?.powerplay

  const tossOpen = match?.tossPredictionOpen
  const matchOpen = match?.matchPredictionOpen
  const pp1Open = pp?.team1Open
  const pp2Open = pp?.team2Open
  const anyOpen = tossOpen || matchOpen || pp1Open || pp2Open

  // Build prediction summary for closed windows
  const closedPredictions = []
  if (match && !tossOpen) {
    closedPredictions.push({
      label: 'Toss Prediction',
      yourPick: prediction?.tossWinner,
      actual: match.tossWinner,
      pts: prediction?.tossWinner && match.tossWinner
        ? prediction.tossWinner === match.tossWinner ? POINTS.TOSS_CORRECT : 0
        : null,
    })
  }
  if (match && !matchOpen) {
    closedPredictions.push({
      label: 'Match Winner',
      yourPick: prediction?.matchWinner,
      actual: match.result?.winner,
      pts: prediction?.matchWinner && match.result?.winner
        ? prediction.matchWinner === match.result.winner ? POINTS.MATCH_CORRECT : 0
        : null,
    })
  }
  if (pp && !pp1Open && match) {
    closedPredictions.push({
      label: `${match.team1} Powerplay`,
      yourPick: prediction?.powerplayGuess1 !== undefined && prediction?.powerplayGuess1 !== null
        ? `${prediction.powerplayGuess1} runs` : undefined,
      actual: pp.team1Score !== undefined ? `${pp.team1Score} runs` : undefined,
      pts: prediction?.powerplayPoints1 ?? null,
    })
  }
  if (pp && !pp2Open && match) {
    closedPredictions.push({
      label: `${match.team2} Powerplay`,
      yourPick: prediction?.powerplayGuess2 !== undefined && prediction?.powerplayGuess2 !== null
        ? `${prediction.powerplayGuess2} runs` : undefined,
      actual: pp.team2Score !== undefined ? `${pp.team2Score} runs` : undefined,
      pts: prediction?.powerplayPoints2 ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={party.name} subtitle={`Hosted by ${party.hostName}`} onBack={() => navigate('/home')} />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {/* Party info */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <StatusBadge status={party.status} />
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">Join Code</div>
            <div className="font-mono font-bold text-ipl-orange tracking-widest">{party.joinCode}</div>
          </div>
        </div>

        {/* Match info */}
        {match && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TeamBadge team={match.team1} size="md" />
              <span className="text-gray-400 text-sm font-medium">vs</span>
              <TeamBadge team={match.team2} size="md" />
            </div>
            <div className="text-xs text-gray-500">{match.venue} · {match.city}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatMatchDate(match.matchDate)} · {match.timeIST}</div>
          </div>
        )}

        {/* ── OPEN PREDICTIONS — shown on TOP ── */}
        {party.status === 'active' && anyOpen && (
          <div className="card p-4 border-2 border-ipl-orange/30 bg-ipl-orange-light">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-ipl-orange">Predictions Open!</span>
            </div>

            {/* Open windows summary */}
            <div className="space-y-1.5 mb-3">
              {tossOpen && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Toss Prediction</span>
                  <div className="flex items-center gap-1.5">
                    {prediction?.tossWinner
                      ? <span className="font-medium text-green-600">Picked: {prediction.tossWinner}</span>
                      : <span className="text-red-500">Not picked yet</span>
                    }
                    <span className="text-gray-400">+{POINTS.TOSS_CORRECT}pts</span>
                  </div>
                </div>
              )}
              {matchOpen && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Match Winner</span>
                  <div className="flex items-center gap-1.5">
                    {prediction?.matchWinner
                      ? <span className="font-medium text-green-600">Picked: {prediction.matchWinner}</span>
                      : <span className="text-red-500">Not picked yet</span>
                    }
                    <span className="text-gray-400">+{POINTS.MATCH_CORRECT}pts</span>
                  </div>
                </div>
              )}
              {pp1Open && match && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{match.team1} Powerplay</span>
                  <div className="flex items-center gap-1.5">
                    {prediction?.powerplayGuess1 !== undefined && prediction?.powerplayGuess1 !== null
                      ? <span className="font-medium text-green-600">{prediction.powerplayGuess1} runs</span>
                      : <span className="text-red-500">Not guessed yet</span>
                    }
                    <span className="text-gray-400">up to +{POINTS.POWERPLAY_EXACT}pts</span>
                  </div>
                </div>
              )}
              {pp2Open && match && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{match.team2} Powerplay</span>
                  <div className="flex items-center gap-1.5">
                    {prediction?.powerplayGuess2 !== undefined && prediction?.powerplayGuess2 !== null
                      ? <span className="font-medium text-green-600">{prediction.powerplayGuess2} runs</span>
                      : <span className="text-red-500">Not guessed yet</span>
                    }
                    <span className="text-gray-400">up to +{POINTS.POWERPLAY_EXACT}pts</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/party/${partyId}/predict`)}
              className="btn-primary w-full text-sm py-2.5"
            >
              {prediction ? 'Update Predictions 🎯' : 'Make Predictions 🎯'}
            </button>
          </div>
        )}

        {/* My score */}
        {myRank && (
          <div className="card p-4 bg-ipl-orange-light border border-ipl-orange/20">
            <div className="text-xs text-ipl-orange font-semibold mb-2">Your Standing</div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-3xl text-ipl-orange">#{myRank.rank}</div>
              <div className="text-right">
                <div className="font-bold text-2xl">{myRank.totalPoints}</div>
                <div className="text-xs text-gray-500">total pts</div>
              </div>
            </div>
            {/* Points breakdown */}
            <div className="flex gap-3 mt-2 pt-2 border-t border-ipl-orange/20">
              {[
                { label: 'Toss', val: myRank.tossPoints },
                { label: 'Match', val: myRank.matchPoints },
                { label: 'PP', val: (myRank as any).powerplayPoints || 0 },
                { label: 'Bonus', val: myRank.bonusPoints },
              ].map(item => (
                <div key={item.label} className="flex-1 text-center">
                  <div className="text-sm font-bold text-ipl-orange">{item.val}</div>
                  <div className="text-xs text-gray-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <>
            <div className="section-title">Leaderboard</div>
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map(entry => (
                <LBRow key={entry.userId} entry={entry} highlight={entry.userId === firebaseUser?.uid} />
              ))}
            </div>
          </>
        )}

        {/* ── CLOSED PREDICTIONS — shown BELOW leaderboard ── */}
        {closedPredictions.length > 0 && (
          <>
            <div className="section-title">Your Results</div>
            <div className="card divide-y divide-gray-100">
              {closedPredictions.map((item, i) => (
                <div key={i} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">{item.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Your pick: <span className="font-medium text-gray-700">{item.yourPick ?? '—'}</span>
                      {item.actual && <> · Actual: <span className="font-medium text-gray-700">{item.actual}</span></>}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    item.pts === null ? 'text-gray-300'
                    : item.pts > 0 ? 'text-green-600'
                    : 'text-red-400'
                  }`}>
                    {item.pts === null ? '—' : item.pts > 0 ? `+${item.pts}` : '0'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
