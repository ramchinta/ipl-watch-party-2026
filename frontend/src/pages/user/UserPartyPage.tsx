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
import { formatMatchDate, rankEmoji } from '../../utils/helpers'

type View = 'party' | 'leaderboard'

export default function UserPartyPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()

  const [party, setParty] = useState<WatchParty | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('party')

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

  const ts   = ((match as any)?.tossState  || 'future')
  const ms   = ((match as any)?.matchState || 'future')
  const pp1s = pp ? ((pp as any).team1State || 'future') : null
  const pp2s = pp ? ((pp as any).team2State || 'future') : null

  const tossOpen  = ts  === 'open'
  const matchOpen = ms  === 'open'
  const pp1Open   = pp1s === 'open'
  const pp2Open   = pp2s === 'open'
  const anyOpen   = tossOpen || matchOpen || pp1Open || pp2Open

  // Results section — only show questions that are 'completed'
  const closedPredictions: any[] = []
  if (match && ts === 'completed' && match.tossWinner) {
    closedPredictions.push({
      label: 'Toss Prediction',
      yourPick: prediction?.tossWinner,
      actual: match.tossWinner,
      pts: prediction?.tossWinner && match.tossWinner
        ? (prediction.tossWinner === match.tossWinner ? POINTS.TOSS_CORRECT : 0) : null,
    })
  }
  if (match && ms === 'completed' && match.result) {
    closedPredictions.push({
      label: 'Match Winner',
      yourPick: prediction?.matchWinner,
      actual: match.result?.winner,
      pts: prediction?.matchWinner && match.result?.winner
        ? (prediction.matchWinner === match.result.winner ? POINTS.MATCH_CORRECT : 0) : null,
    })
  }
  if (pp && pp1s === 'completed' && pp.team1Score != null && match) {
    closedPredictions.push({
      label: `${match.team1} Powerplay`,
      yourPick: prediction?.powerplayGuess1 != null ? `${prediction.powerplayGuess1} runs` : undefined,
      actual: `${pp.team1Score} runs`,
      pts: prediction?.powerplayPoints1 ?? null,
    })
  }
  if (pp && pp2s === 'completed' && pp.team2Score != null && match) {
    closedPredictions.push({
      label: `${match.team2} Powerplay`,
      yourPick: prediction?.powerplayGuess2 != null ? `${prediction.powerplayGuess2} runs` : undefined,
      actual: `${pp.team2Score} runs`,
      pts: prediction?.powerplayPoints2 ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={party.name} subtitle={`Hosted by ${party.hostName}`} onBack={() => navigate('/home')} />

      {/* Tab toggle — Party vs Leaderboard */}
      <div className="bg-white border-b border-gray-100 sticky top-[52px] z-30">
        <div className="max-w-sm mx-auto flex">
          {(['party', 'leaderboard'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                view === v ? 'text-ipl-orange' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {view === v && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-ipl-orange rounded-full" />}
              {v === 'party' ? '🏏 Party' : `📊 Leaderboard${leaderboard.length > 0 ? ` (${leaderboard.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {/* ── PARTY VIEW ── */}
        {view === 'party' && (
          <>
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

            {/* Open predictions — TOP */}
            {party.status === 'active' && anyOpen && (
              <div className="card p-4 border-2 border-ipl-orange/30 bg-ipl-orange-light">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold text-ipl-orange">Predictions Open!</span>
                </div>
                <div className="space-y-1.5 mb-3">
                  {tossOpen && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">🪙 Toss</span>
                      <div className="flex items-center gap-1.5">
                        {prediction?.tossWinner
                          ? <span className="font-medium text-green-600">✓ {prediction.tossWinner}</span>
                          : <span className="text-red-500">Not picked</span>}
                        <span className="text-gray-400">+{POINTS.TOSS_CORRECT}pts</span>
                      </div>
                    </div>
                  )}
                  {matchOpen && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">🏆 Match Winner</span>
                      <div className="flex items-center gap-1.5">
                        {prediction?.matchWinner
                          ? <span className="font-medium text-green-600">✓ {prediction.matchWinner}</span>
                          : <span className="text-red-500">Not picked</span>}
                        <span className="text-gray-400">+{POINTS.MATCH_CORRECT}pts</span>
                      </div>
                    </div>
                  )}
                  {pp1Open && match && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">⚡ {match.team1} PP</span>
                      <div className="flex items-center gap-1.5">
                        {prediction?.powerplayGuess1 != null
                          ? <span className="font-medium text-green-600">✓ {prediction.powerplayGuess1} runs</span>
                          : <span className="text-red-500">Not guessed</span>}
                        <span className="text-gray-400">up to +{POINTS.POWERPLAY_EXACT}pts</span>
                      </div>
                    </div>
                  )}
                  {pp2Open && match && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">⚡ {match.team2} PP</span>
                      <div className="flex items-center gap-1.5">
                        {prediction?.powerplayGuess2 != null
                          ? <span className="font-medium text-green-600">✓ {prediction.powerplayGuess2} runs</span>
                          : <span className="text-red-500">Not guessed</span>}
                        <span className="text-gray-400">up to +{POINTS.POWERPLAY_EXACT}pts</span>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => navigate(`/party/${partyId}/predict`)} className="btn-primary w-full text-sm py-2.5">
                  {prediction ? 'Update Predictions 🎯' : 'Make Predictions 🎯'}
                </button>
              </div>
            )}

            {/* My score */}
            {myRank && (
              <div className="card p-4 bg-ipl-orange-light border border-ipl-orange/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-ipl-orange font-semibold">Your Standing</div>
                  <button onClick={() => setView('leaderboard')} className="text-xs text-ipl-orange underline">
                    Full leaderboard →
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-3xl text-ipl-orange">{rankEmoji(myRank.rank)}</div>
                  <div className="text-right">
                    <div className="font-bold text-2xl">{myRank.totalPoints}</div>
                    <div className="text-xs text-gray-500">total pts</div>
                  </div>
                </div>
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

            {/* Closed prediction results — BOTTOM */}
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
          </>
        )}

        {/* ── LEADERBOARD VIEW ── */}
        {view === 'leaderboard' && (
          <>
            {/* My rank pinned at top */}
            {myRank && (
              <div className="card p-4 bg-ipl-orange-light border border-ipl-orange/20">
                <div className="text-xs text-ipl-orange font-semibold mb-2">Your Position</div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{rankEmoji(myRank.rank)}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{myRank.userName}</div>
                    {myRank.favoriteTeam && <TeamBadge team={myRank.favoriteTeam} size="xs" />}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-ipl-orange">{myRank.totalPoints}</div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                </div>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📊</div>
                <div className="font-semibold text-gray-600">No scores yet</div>
                <div className="text-sm text-gray-400 mt-1">Leaderboard updates when results are set</div>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map(entry => (
                  <LBRow
                    key={entry.userId}
                    entry={entry}
                    highlight={entry.userId === firebaseUser?.uid}
                  />
                ))}
              </div>
            )}

            {/* Points breakdown legend */}
            <div className="card p-3 mt-2">
              <div className="text-xs text-gray-400 text-center">T = Toss · M = Match · PP = Powerplay · B = Bonus</div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
