import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToUserPrediction, savePrediction } from '../../services/predictionService'
import type { Match, Prediction, IPLTeam, QState } from '../../types'
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
      unsubParty.current = subscribeToParty(partyId, p => setPartyMatchId(p.matchId))
    })
    return () => { unsubParty.current?.() }
  }, [partyId])

  const matchId = routeMatchId || partyMatchId

  useEffect(() => {
    if (!matchId) return
    return subscribeToMatch(matchId, setMatch)
  }, [matchId])

  useEffect(() => {
    if (!partyId || !matchId || !firebaseUser) return
    return subscribeToUserPrediction(partyId, matchId, firebaseUser.uid, p => {
      setPrediction(p)
      if (p) {
        if (p.tossWinner)  setTossWinner(p.tossWinner)
        if (p.matchWinner) setMatchWinner(p.matchWinner)
        if (p.powerplayGuess1 != null) setPp1Guess(String(p.powerplayGuess1))
        if (p.powerplayGuess2 != null) setPp2Guess(String(p.powerplayGuess2))
      }
    })
  }, [partyId, matchId, firebaseUser])

  async function handleSave() {
    if (!firebaseUser || !partyId || !matchId) return
    setSaving(true)
    try {
      await savePrediction(
        firebaseUser.uid, partyId, matchId,
        tossWinner ?? undefined, matchWinner ?? undefined,
        pp1Guess !== '' ? parseInt(pp1Guess) : undefined,
        pp2Guess !== '' ? parseInt(pp2Guess) : undefined,
      )
      toast.success('Predictions saved! 🎯')
      navigate(`/party/${partyId}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false) }
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const pp   = match.powerplay
  const teams: IPLTeam[] = [match.team1, match.team2]

  // Read QState from match doc (default future if missing)
  const ts  = (match.tossState  || 'future') as QState
  const ms  = (match.matchState || 'future') as QState
  const pp1s = !pp ? null : (pp.team1State || 'future') as QState
  const pp2s = !pp ? null : (pp.team2State || 'future') as QState

  // Questions visible to users: exclude future and skipped
  type QItem = { id: string; state: QState; order: number }
  const sortOrder: Record<QState, number> = { open: 0, closed: 1, completed: 2, future: 99, skipped: 99 }

  const allQuestions: QItem[] = [
    { id: 'toss',  state: ts,  order: 1 },
    { id: 'match', state: ms,  order: 2 },
    ...(pp1s ? [{ id: 'pp1', state: pp1s, order: 3 }] : []),
    ...(pp2s ? [{ id: 'pp2', state: pp2s, order: 4 }] : []),
  ]

  // Users only see open, closed, completed — not future or skipped
  const visibleQuestions = allQuestions
    .filter(q => q.state !== 'future' && q.state !== 'skipped')
    .sort((a, b) => sortOrder[a.state] - sortOrder[b.state] || a.order - b.order)

  const anyOpen = visibleQuestions.some(q => q.state === 'open')

  const pp1Points = pp1Guess !== '' && pp?.team1Score != null
    ? calcPowerplayPoints(parseInt(pp1Guess), pp.team1Score) : null
  const pp2Points = pp2Guess !== '' && pp?.team2Score != null
    ? calcPowerplayPoints(parseInt(pp2Guess), pp.team2Score) : null

  // ── State label badge ───────────────────────────────────────────────────
  function StateBadge({ state }: { state: QState }) {
    if (state === 'open') return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-green-600 font-medium">Open</span>
      </div>
    )
    if (state === 'closed') return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-xs text-orange-500 font-medium">Locked</span>
      </div>
    )
    return <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Result In</span>
  }

  // ── Individual question cards ───────────────────────────────────────────
  function TossCard() {
    const isOpen = ts === 'open'
    const isClosed = ts === 'closed'
    const isCompleted = ts === 'completed'
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">🪙 Who wins the toss?</div>
          <StateBadge state={ts} />
        </div>
        <div className="text-xs text-gray-400 mb-3">+{POINTS.TOSS_CORRECT} pts if correct</div>
        <div className="space-y-2">
          {teams.map(team => (
            <PredCard key={team} team={team}
              selected={tossWinner === team}
              disabled={!isOpen}
              points={POINTS.TOSS_CORRECT}
              onClick={() => isOpen && setTossWinner(tossWinner === team ? null : team)} />
          ))}
        </div>
        {isClosed && (
          <p className="text-xs text-center text-orange-500 mt-2 bg-orange-50 rounded-xl py-2">
            🔒 Your pick is locked — waiting for toss result
          </p>
        )}
        {isCompleted && match.tossWinner && (
          <div className="mt-2 text-xs text-center">
            Toss won by <strong>{match.tossWinner}</strong>
            {tossWinner && (
              <span className={`ml-2 font-bold ${tossWinner === match.tossWinner ? 'text-green-600' : 'text-red-500'}`}>
                {tossWinner === match.tossWinner ? `+${POINTS.TOSS_CORRECT} pts ✓` : '0 pts ✗'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  function MatchCard() {
    const isOpen = ms === 'open'
    const isClosed = ms === 'closed'
    const isCompleted = ms === 'completed'
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">🏆 Who wins the match?</div>
          <StateBadge state={ms} />
        </div>
        <div className="text-xs text-gray-400 mb-3">+{POINTS.MATCH_CORRECT} pts if correct</div>
        <div className="space-y-2">
          {teams.map(team => (
            <PredCard key={team} team={team}
              selected={matchWinner === team}
              disabled={!isOpen}
              points={POINTS.MATCH_CORRECT}
              onClick={() => isOpen && setMatchWinner(matchWinner === team ? null : team)} />
          ))}
        </div>
        {isClosed && (
          <p className="text-xs text-center text-orange-500 mt-2 bg-orange-50 rounded-xl py-2">
            🔒 Your pick is locked — waiting for match result
          </p>
        )}
        {isCompleted && match.result?.winner && (
          <div className="mt-2 text-xs text-center">
            Won by <strong>{match.result.winner}</strong>
            {matchWinner && (
              <span className={`ml-2 font-bold ${matchWinner === match.result.winner ? 'text-green-600' : 'text-red-500'}`}>
                {matchWinner === match.result.winner ? `+${POINTS.MATCH_CORRECT} pts ✓` : '0 pts ✗'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  function PowerplayCard({ team, teamNum }: { team: IPLTeam; teamNum: 1 | 2 }) {
    const state       = (teamNum === 1 ? pp1s : pp2s)!
    const guess       = teamNum === 1 ? pp1Guess : pp2Guess
    const setGuess    = teamNum === 1 ? setPp1Guess : setPp2Guess
    const actualScore = teamNum === 1 ? pp?.team1Score : pp?.team2Score
    const pts         = teamNum === 1 ? pp1Points : pp2Points
    const isOpen      = state === 'open'
    const isClosed    = state === 'closed'
    const isCompleted = state === 'completed'

    const scale = [
      { label: 'Exact', p: POINTS.POWERPLAY_EXACT },
      { label: '±1',    p: POINTS.POWERPLAY_CLOSE_1 },
      { label: '±3',    p: POINTS.POWERPLAY_CLOSE_3 },
      { label: '±5',    p: POINTS.POWERPLAY_CLOSE_5 },
      { label: '±8',    p: POINTS.POWERPLAY_CLOSE_8 },
    ]

    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            ⚡ <TeamBadge team={team} size="xs" /> Powerplay
          </div>
          <StateBadge state={state} />
        </div>
        <div className="text-xs text-gray-400 mb-3">Guess {team}'s 6-over score · up to +{POINTS.POWERPLAY_EXACT} pts</div>
        <div className="flex gap-1 mb-3 flex-wrap">
          {scale.map(s => (
            <div key={s.label} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
              <span className="text-xs text-gray-400">{s.label}</span>
              <span className="text-xs font-bold text-ipl-orange">+{s.p}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input type="number" min="0" max="120"
            disabled={!isOpen}
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
        {isClosed && (
          <p className="text-xs text-center text-orange-500 mt-2 bg-orange-50 rounded-xl py-2">
            🔒 Your guess is locked — waiting for actual score
          </p>
        )}
        {isCompleted && actualScore != null && (
          <div className="text-xs text-center mt-2">
            Actual: <strong>{actualScore} runs</strong>
            {guess !== '' && (
              <span className={`ml-2 font-bold ${pts != null && pts > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {pts != null && pts > 0 ? `+${pts} pts ✓` : '0 pts ✗'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Section headers ─────────────────────────────────────────────────────
  const renderedSections: JSX.Element[] = []
  let lastGroupState: QState | null = null

  visibleQuestions.forEach(q => {
    const groupState = q.state === 'open' ? 'open' : q.state === 'closed' ? 'closed' : 'completed'
    if (groupState !== lastGroupState) {
      if (groupState === 'open') {
        renderedSections.push(
          <div key="hdr-open" className="section-title flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Open Now
          </div>
        )
      } else if (groupState === 'closed') {
        renderedSections.push(
          <div key="hdr-locked" className="section-title flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /> Locked — Awaiting Result
          </div>
        )
      } else {
        renderedSections.push(<div key="hdr-done" className="section-title">Results In</div>)
      }
      lastGroupState = groupState
    }
    if (q.id === 'toss')  renderedSections.push(<TossCard key="toss" />)
    if (q.id === 'match') renderedSections.push(<MatchCard key="match" />)
    if (q.id === 'pp1')   renderedSections.push(<PowerplayCard key="pp1" team={match.team1} teamNum={1} />)
    if (q.id === 'pp2')   renderedSections.push(<PowerplayCard key="pp2" team={match.team2} teamNum={2} />)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Predictions"
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate(`/party/${partyId}`)}
      />
      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {visibleQuestions.length === 0 && (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">🔜</div>
            <div className="font-semibold text-gray-600">No predictions open yet</div>
            <div className="text-sm text-gray-400 mt-1">Your host will open prediction windows before the match</div>
          </div>
        )}

        {renderedSections}

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

      </div>
    </div>
  )
}
