import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToUserPrediction, savePrediction } from '../../services/predictionService'
import type { Match, Prediction, IPLTeam } from '../../types'
import { POINTS, calcPowerplayPoints } from '../../types'
import { PageHeader, PredCard, Spinner, TeamBadge } from '../../components/shared'
import toast from 'react-hot-toast'

export default function PredictPage() {
  const { partyId, matchId: routeMatchId } = useParams<{ partyId: string; matchId?: string }>()
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()

  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [tossWinner, setTossWinner] = useState<IPLTeam | null>(null)
  const [matchWinner, setMatchWinner] = useState<IPLTeam | null>(null)
  const [pp1Guess, setPp1Guess] = useState<string>('')
  const [pp2Guess, setPp2Guess] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [partyMatchId, setPartyMatchId] = useState<string | null>(null)
  const unsubParty = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!partyId) return
    import('../../services/partyService').then(({ subscribeToParty }) => {
      unsubParty.current = subscribeToParty(partyId, (p) => setPartyMatchId(p.matchId))
    })
    return () => { unsubParty.current?.() }
  }, [partyId])

  const matchId = routeMatchId || partyMatchId

  useEffect(() => {
    if (!matchId) return
    const unsub = subscribeToMatch(matchId, setMatch)
    return () => unsub()
  }, [matchId])

  useEffect(() => {
    if (!partyId || !matchId || !firebaseUser) return
    const unsub = subscribeToUserPrediction(partyId, matchId, firebaseUser.uid, (p) => {
      setPrediction(p)
      if (p) {
        if (p.tossWinner) setTossWinner(p.tossWinner)
        if (p.matchWinner) setMatchWinner(p.matchWinner)
        if (p.powerplayGuess1 !== undefined) setPp1Guess(String(p.powerplayGuess1))
        if (p.powerplayGuess2 !== undefined) setPp2Guess(String(p.powerplayGuess2))
      }
    })
    return () => unsub()
  }, [partyId, matchId, firebaseUser])

  async function handleSave() {
    if (!firebaseUser || !partyId || !matchId) return
    setSaving(true)
    try {
      const pp1 = pp1Guess !== '' ? parseInt(pp1Guess) : undefined
      const pp2 = pp2Guess !== '' ? parseInt(pp2Guess) : undefined
      await savePrediction(
        firebaseUser.uid, partyId, matchId,
        tossWinner ?? undefined,
        matchWinner ?? undefined,
        pp1, pp2
      )
      toast.success('Predictions saved! 🎯')
      // Go back to party page — not home
      navigate(`/party/${partyId}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const tossOpen = match.tossPredictionOpen
  const matchOpen = match.matchPredictionOpen
  const pp = match.powerplay
  const pp1Open = pp?.team1Open ?? false
  const pp2Open = pp?.team2Open ?? false
  const teams: IPLTeam[] = [match.team1, match.team2]
  const anyOpen = tossOpen || matchOpen || pp1Open || pp2Open

  // Powerplay points preview
  const pp1Points = pp1Guess !== '' && pp?.team1Score !== undefined
    ? calcPowerplayPoints(parseInt(pp1Guess), pp.team1Score)
    : null
  const pp2Points = pp2Guess !== '' && pp?.team2Score !== undefined
    ? calcPowerplayPoints(parseInt(pp2Guess), pp.team2Score)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Make Predictions"
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate(`/party/${partyId}`)}
      />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {/* ── TOSS PREDICTION ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Who wins the toss?</div>
            <div className="flex items-center gap-1.5">
              {tossOpen
                ? <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-green-600 font-medium">Open</span></>
                : <span className="text-xs text-red-500 font-medium">Closed</span>
              }
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-3">+{POINTS.TOSS_CORRECT} pts if correct</div>
          <div className="space-y-2">
            {teams.map(team => (
              <PredCard key={team} team={team} selected={tossWinner === team}
                disabled={!tossOpen} points={POINTS.TOSS_CORRECT}
                onClick={() => tossOpen && setTossWinner(tossWinner === team ? null : team)} />
            ))}
          </div>
          {!tossOpen && <p className="text-xs text-red-400 mt-2 text-center">Toss prediction window is closed</p>}
        </div>

        {/* ── MATCH WINNER ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Who wins the match?</div>
            <div className="flex items-center gap-1.5">
              {matchOpen
                ? <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-green-600 font-medium">Open</span></>
                : <span className="text-xs text-red-500 font-medium">Closed</span>
              }
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-3">+{POINTS.MATCH_CORRECT} pts if correct</div>
          <div className="space-y-2">
            {teams.map(team => (
              <PredCard key={team} team={team} selected={matchWinner === team}
                disabled={!matchOpen} points={POINTS.MATCH_CORRECT}
                onClick={() => matchOpen && setMatchWinner(matchWinner === team ? null : team)} />
            ))}
          </div>
          {!matchOpen && <p className="text-xs text-red-400 mt-2 text-center">Match prediction window is closed</p>}
        </div>

        {/* ── POWERPLAY GUESSES ── */}
        {pp && (
          <>
            {/* Powerplay 1 — team batting first */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">Powerplay Score — <TeamBadge team={match.team1} size="xs" /></div>
                  <div className="text-xs text-gray-400 mt-0.5">Guess {match.team1}'s score after 6 overs</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {pp1Open
                    ? <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-green-600 font-medium">Open</span></>
                    : pp.team1Score !== undefined
                      ? <span className="text-xs text-blue-600 font-medium">Actual: {pp.team1Score}</span>
                      : <span className="text-xs text-red-500 font-medium">Closed</span>
                  }
                </div>
              </div>

              {/* Points scale */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {[
                  { label: 'Exact', pts: POINTS.POWERPLAY_EXACT },
                  { label: '±1', pts: POINTS.POWERPLAY_CLOSE_1 },
                  { label: '±3', pts: POINTS.POWERPLAY_CLOSE_3 },
                  { label: '±5', pts: POINTS.POWERPLAY_CLOSE_5 },
                  { label: '±8', pts: POINTS.POWERPLAY_CLOSE_8 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-xs text-gray-400">{s.label}</span>
                    <span className="text-xs font-bold text-ipl-orange">+{s.pts}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0" max="120"
                  disabled={!pp1Open}
                  value={pp1Guess}
                  onChange={e => setPp1Guess(e.target.value)}
                  placeholder="e.g. 52"
                  className="input-field flex-1 text-center text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="text-right">
                  <div className="text-xs text-gray-400">runs</div>
                  {pp1Points !== null && (
                    <div className="text-lg font-bold text-green-600">+{pp1Points}</div>
                  )}
                </div>
              </div>
              {pp.team1Score !== undefined && pp1Guess !== '' && (
                <p className="text-xs text-center mt-2">
                  {pp1Points !== null && pp1Points > 0
                    ? <span className="text-green-600 font-medium">You earned {pp1Points} pts (actual: {pp.team1Score})</span>
                    : <span className="text-red-400">Too far off (actual: {pp.team1Score})</span>
                  }
                </p>
              )}
            </div>

            {/* Powerplay 2 — team batting second */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">Powerplay Score — <TeamBadge team={match.team2} size="xs" /></div>
                  <div className="text-xs text-gray-400 mt-0.5">Guess {match.team2}'s score after 6 overs</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {pp2Open
                    ? <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-green-600 font-medium">Open</span></>
                    : pp.team2Score !== undefined
                      ? <span className="text-xs text-blue-600 font-medium">Actual: {pp.team2Score}</span>
                      : <span className="text-xs text-red-500 font-medium">Closed</span>
                  }
                </div>
              </div>

              <div className="flex gap-1 mb-3 flex-wrap">
                {[
                  { label: 'Exact', pts: POINTS.POWERPLAY_EXACT },
                  { label: '±1', pts: POINTS.POWERPLAY_CLOSE_1 },
                  { label: '±3', pts: POINTS.POWERPLAY_CLOSE_3 },
                  { label: '±5', pts: POINTS.POWERPLAY_CLOSE_5 },
                  { label: '±8', pts: POINTS.POWERPLAY_CLOSE_8 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-xs text-gray-400">{s.label}</span>
                    <span className="text-xs font-bold text-ipl-orange">+{s.pts}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0" max="120"
                  disabled={!pp2Open}
                  value={pp2Guess}
                  onChange={e => setPp2Guess(e.target.value)}
                  placeholder="e.g. 48"
                  className="input-field flex-1 text-center text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="text-right">
                  <div className="text-xs text-gray-400">runs</div>
                  {pp2Points !== null && (
                    <div className="text-lg font-bold text-green-600">+{pp2Points}</div>
                  )}
                </div>
              </div>
              {pp.team2Score !== undefined && pp2Guess !== '' && (
                <p className="text-xs text-center mt-2">
                  {pp2Points !== null && pp2Points > 0
                    ? <span className="text-green-600 font-medium">You earned {pp2Points} pts (actual: {pp.team2Score})</span>
                    : <span className="text-red-400">Too far off (actual: {pp.team2Score})</span>
                  }
                </p>
              )}
            </div>
          </>
        )}

        {/* Save button */}
        {anyOpen && (
          <button
            onClick={handleSave}
            disabled={saving || (!tossWinner && !matchWinner && pp1Guess === '' && pp2Guess === '')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Save Predictions 🔒'
            }
          </button>
        )}

        {!anyOpen && (
          <div className="text-center text-sm text-gray-400 py-4">
            All prediction windows are closed
          </div>
        )}

        {prediction && (
          <div className="text-xs text-gray-400 text-center pb-4">
            Last saved — tap Save to update your predictions
          </div>
        )}
      </div>
    </div>
  )
}
