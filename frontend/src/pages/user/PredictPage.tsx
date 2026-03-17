import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToUserPrediction, savePrediction } from '../../services/predictionService'
import type { Match, Prediction, IPLTeam } from '../../types'
import { POINTS, calcPowerplayPoints } from '../../types'
import { PageHeader, PredCard, Spinner, TeamBadge } from '../../components/shared'
import toast from 'react-hot-toast'

// A single prediction question card
interface Question {
  id: string
  state: 'open' | 'future' | 'closed'
  order: number  // for sorting within each state group
}

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
        if (p.powerplayGuess1 != null) setPp1Guess(String(p.powerplayGuess1))
        if (p.powerplayGuess2 != null) setPp2Guess(String(p.powerplayGuess2))
      }
    })
    return () => unsub()
  }, [partyId, matchId, firebaseUser])

  async function handleSave() {
    if (!firebaseUser || !partyId || !matchId) return
    setSaving(true)
    try {
      await savePrediction(
        firebaseUser.uid, partyId, matchId,
        tossWinner ?? undefined,
        matchWinner ?? undefined,
        pp1Guess !== '' ? parseInt(pp1Guess) : undefined,
        pp2Guess !== '' ? parseInt(pp2Guess) : undefined,
      )
      toast.success('Predictions saved! 🎯')
      navigate(`/party/${partyId}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const pp = match.powerplay
  const teams: IPLTeam[] = [match.team1, match.team2]

  // Determine state of each question
  const tossState = match.tossPredictionOpen ? 'open'
    : match.tossWinner ? 'closed' : 'future'
  const matchState = match.matchPredictionOpen ? 'open'
    : match.result ? 'closed' : 'future'
  const pp1State = !pp ? 'future'
    : pp.team1Open ? 'open'
    : pp.team1Score != null ? 'closed' : 'future'
  const pp2State = !pp ? 'future'
    : pp.team2Open ? 'open'
    : pp.team2Score != null ? 'closed' : 'future'

  // Sort: open first, then future, then closed
  const stateOrder = { open: 0, future: 1, closed: 2 }

  const questions: { id: string; state: 'open' | 'future' | 'closed'; order: number }[] = [
    { id: 'toss',  state: tossState,  order: 1 },
    { id: 'match', state: matchState, order: 2 },
    { id: 'pp1',   state: pp1State,   order: 3 },
    { id: 'pp2',   state: pp2State,   order: 4 },
  ].sort((a, b) => stateOrder[a.state] - stateOrder[b.state] || a.order - b.order)

  const anyOpen = questions.some(q => q.state === 'open')

  const pp1Points = pp1Guess !== '' && pp?.team1Score != null
    ? calcPowerplayPoints(parseInt(pp1Guess), pp.team1Score) : null
  const pp2Points = pp2Guess !== '' && pp?.team2Score != null
    ? calcPowerplayPoints(parseInt(pp2Guess), pp.team2Score) : null

  function StateLabel({ state }: { state: 'open' | 'future' | 'closed' }) {
    if (state === 'open') return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-green-600 font-medium">Open</span>
      </div>
    )
    if (state === 'future') return (
      <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Coming up</span>
    )
    return (
      <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Closed</span>
    )
  }

  function TossCard() {
    const closed = tossState === 'closed'
    const future = tossState === 'future'
    return (
      <div className={`card p-4 ${closed ? 'opacity-75' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">🪙 Who wins the toss?</div>
          <StateLabel state={tossState} />
        </div>
        <div className="text-xs text-gray-400 mb-3">+{POINTS.TOSS_CORRECT} pts if correct</div>
        {future ? (
          <div className="text-xs text-center text-gray-400 py-3 bg-gray-50 rounded-xl">
            Window not open yet — host will open before the toss
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {teams.map(team => (
                <PredCard key={team} team={team}
                  selected={tossWinner === team}
                  disabled={closed}
                  points={POINTS.TOSS_CORRECT}
                  onClick={() => !closed && setTossWinner(tossWinner === team ? null : team)} />
              ))}
            </div>
            {closed && match.tossWinner && (
              <div className="mt-2 text-xs text-center">
                Toss won by <strong>{match.tossWinner}</strong>
                {tossWinner && (
                  <span className={`ml-2 font-bold ${tossWinner === match.tossWinner ? 'text-green-600' : 'text-red-500'}`}>
                    {tossWinner === match.tossWinner ? `+${POINTS.TOSS_CORRECT} pts ✓` : '0 pts ✗'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function MatchCard() {
    const closed = matchState === 'closed'
    const future = matchState === 'future'
    return (
      <div className={`card p-4 ${closed ? 'opacity-75' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">🏆 Who wins the match?</div>
          <StateLabel state={matchState} />
        </div>
        <div className="text-xs text-gray-400 mb-3">+{POINTS.MATCH_CORRECT} pts if correct</div>
        {future ? (
          <div className="text-xs text-center text-gray-400 py-3 bg-gray-50 rounded-xl">
            Window not open yet — host will open before the first ball
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {teams.map(team => (
                <PredCard key={team} team={team}
                  selected={matchWinner === team}
                  disabled={closed}
                  points={POINTS.MATCH_CORRECT}
                  onClick={() => !closed && setMatchWinner(matchWinner === team ? null : team)} />
              ))}
            </div>
            {closed && match.result?.winner && (
              <div className="mt-2 text-xs text-center">
                Won by <strong>{match.result.winner}</strong>
                {matchWinner && (
                  <span className={`ml-2 font-bold ${matchWinner === match.result.winner ? 'text-green-600' : 'text-red-500'}`}>
                    {matchWinner === match.result.winner ? `+${POINTS.MATCH_CORRECT} pts ✓` : '0 pts ✗'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function PowerplayCard({ team, teamNum }: { team: IPLTeam; teamNum: 1 | 2 }) {
    const state = teamNum === 1 ? pp1State : pp2State
    const guess = teamNum === 1 ? pp1Guess : pp2Guess
    const setGuess = teamNum === 1 ? setPp1Guess : setPp2Guess
    const actualScore = teamNum === 1 ? pp?.team1Score : pp?.team2Score
    const pts = teamNum === 1 ? pp1Points : pp2Points
    const closed = state === 'closed'
    const future = state === 'future'

    return (
      <div className={`card p-4 ${closed ? 'opacity-75' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            ⚡ <TeamBadge team={team} size="xs" /> Powerplay
          </div>
          <StateLabel state={state} />
        </div>
        <div className="text-xs text-gray-400 mb-3">Guess 6-over score · up to +{POINTS.POWERPLAY_EXACT} pts</div>

        {future ? (
          <div className="text-xs text-center text-gray-400 py-3 bg-gray-50 rounded-xl">
            Window not open yet — admin will open before the powerplay starts
          </div>
        ) : (
          <>
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
              <input type="number" min="0" max="120"
                disabled={closed}
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="e.g. 52"
                className="input-field flex-1 text-center text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="text-right min-w-[48px]">
                <div className="text-xs text-gray-400">runs</div>
                {pts !== null && <div className="text-lg font-bold text-green-600">+{pts}</div>}
              </div>
            </div>

            {closed && actualScore != null && (
              <div className="text-xs text-center mt-2">
                Actual: <strong>{actualScore} runs</strong>
                {guess !== '' && (
                  <span className={`ml-2 font-bold ${pts != null && pts > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {pts != null && pts > 0 ? `+${pts} pts ✓` : '0 pts ✗'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Predictions"
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate(`/party/${partyId}`)}
      />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {/* Section labels for each group */}
        {(() => {
          const rendered: JSX.Element[] = []
          let lastState: string | null = null

          questions.forEach(q => {
            // Add section divider when state changes
            if (q.state !== lastState) {
              if (q.state === 'open') {
                rendered.push(
                  <div key={`label-open`} className="section-title flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Open Now
                  </div>
                )
              } else if (q.state === 'future') {
                rendered.push(<div key={`label-future`} className="section-title">Coming Up</div>)
              } else {
                rendered.push(<div key={`label-closed`} className="section-title">Closed</div>)
              }
              lastState = q.state
            }

            // Render the card
            if (q.id === 'toss')  rendered.push(<TossCard key="toss" />)
            if (q.id === 'match') rendered.push(<MatchCard key="match" />)
            if (q.id === 'pp1')   rendered.push(<PowerplayCard key="pp1" team={match.team1} teamNum={1} />)
            if (q.id === 'pp2')   rendered.push(<PowerplayCard key="pp2" team={match.team2} teamNum={2} />)
          })

          return rendered
        })()}

        {/* Save button — only if any open */}
        {anyOpen && (
          <button
            onClick={handleSave}
            disabled={saving || (!tossWinner && !matchWinner && pp1Guess === '' && pp2Guess === '')}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Save Predictions 🔒'
            }
          </button>
        )}

        {!anyOpen && (
          <div className="text-center text-sm text-gray-400 py-4 card p-4">
            All prediction windows are currently closed
          </div>
        )}

      </div>
    </div>
  )
}
