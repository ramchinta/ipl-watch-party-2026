import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  subscribeToMatch, updateMatch, setTossResult, setMatchResult,
  closeTossPrediction, closeMatchPrediction, openTossPrediction, openMatchPrediction,
  openPowerplay, closePowerplay, setPowerplayScore, initPowerplay
} from '../../services/matchService'
import type { Match, IPLTeam } from '../../types'
import { PageHeader, TeamBadge, Spinner } from '../../components/shared'
import { formatMatchDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

type Phase = 'future' | 'open' | 'closed'

// Phase toggle button — green when active
function PhaseBtn({
  label, phase, current, disabled, onClick
}: {
  label: string
  phase: Phase
  current: Phase
  disabled: boolean
  onClick: () => void
}) {
  const isActive = phase === current
  const colors: Record<Phase, string> = {
    future: isActive
      ? 'bg-gray-500 text-white border-gray-500 ring-2 ring-gray-300'
      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300',
    open: isActive
      ? 'bg-green-500 text-white border-green-500 ring-2 ring-green-200'
      : 'bg-white text-gray-400 border-gray-200 hover:border-green-300',
    closed: isActive
      ? 'bg-red-500 text-white border-red-500 ring-2 ring-red-200'
      : 'bg-white text-gray-400 border-gray-200 hover:border-red-300',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || isActive}
      className={`flex-1 py-2 px-2 rounded-xl border text-xs font-semibold transition-all
        disabled:cursor-not-allowed ${colors[phase]}`}
    >
      {isActive && <span className="mr-1">●</span>}
      {label}
    </button>
  )
}

// A single question section
function QuestionSection({
  title,
  icon,
  phase,
  children,
  saving,
  onFuture,
  onOpen,
  onClose,
}: {
  title: string
  icon: string
  phase: Phase
  children?: React.ReactNode
  saving: boolean
  onFuture: () => void
  onOpen: () => void
  onClose: () => void
}) {
  const phaseLabel: Record<Phase, string> = {
    future: 'Future',
    open: 'Open',
    closed: 'Closed',
  }
  const phaseBg: Record<Phase, string> = {
    future: 'bg-gray-50 border-gray-200',
    open: 'bg-green-50 border-green-200',
    closed: 'bg-red-50 border-red-200',
  }

  return (
    <div className={`card p-4 border-2 ${phaseBg[phase]}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          phase === 'open' ? 'bg-green-100 text-green-700'
          : phase === 'closed' ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-500'
        }`}>
          {phaseLabel[phase]}
        </span>
      </div>

      {/* Phase toggle buttons */}
      <div className="flex gap-2 mb-3">
        <PhaseBtn label="Future" phase="future" current={phase} disabled={saving} onClick={onFuture} />
        <PhaseBtn label="Open"   phase="open"   current={phase} disabled={saving} onClick={onOpen} />
        <PhaseBtn label="Closed" phase="closed" current={phase} disabled={saving} onClick={onClose} />
      </div>

      {/* Phase descriptions */}
      <div className="text-xs text-gray-400 mb-3">
        {phase === 'future' && 'Users cannot see or submit this prediction yet.'}
        {phase === 'open'   && 'Users can now submit and update their predictions.'}
        {phase === 'closed' && 'Predictions locked. Set the result below to score everyone.'}
      </div>

      {/* Extra content (result inputs) */}
      {children}
    </div>
  )
}

export default function AdminMatchDetail() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [timeIST, setTimeIST] = useState('')
  const [resultMargin, setResultMargin] = useState('')
  const [ppScore1, setPpScore1] = useState('')
  const [ppScore2, setPpScore2] = useState('')

  useEffect(() => {
    if (!matchId) return
    const unsub = subscribeToMatch(matchId, m => {
      setMatch(m)
      setVenue(m.venue)
      setCity(m.city)
      setTimeIST(m.timeIST)
    })
    return () => unsub()
  }, [matchId])

  async function doAction(fn: () => Promise<void>, msg: string) {
    setSaving(true)
    try { await fn(); toast.success(msg) }
    catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function saveEdits() {
    if (!matchId) return
    await doAction(() => updateMatch(matchId, { venue, city, timeIST }), 'Match updated')
    setEditing(false)
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const teams: IPLTeam[] = [match.team1, match.team2]
  const pp = match.powerplay

  // Derive current phase for each question
  const tossPhase: Phase = match.tossPredictionOpen ? 'open'
    : match.tossWinner ? 'closed' : 'future'

  const matchPhase: Phase = match.matchPredictionOpen ? 'open'
    : match.result ? 'closed' : 'future'

  const pp1Phase: Phase = !pp ? 'future'
    : pp.team1Open ? 'open'
    : pp.team1Score != null ? 'closed' : 'future'

  const pp2Phase: Phase = !pp ? 'future'
    : pp.team2Open ? 'open'
    : pp.team2Score != null ? 'closed' : 'future'

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`Match ${match.matchNumber}`}
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate('/admin/fixtures')}
      />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Match info card */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TeamBadge team={match.team1} size="md" />
              <span className="text-gray-400 text-sm">vs</span>
              <TeamBadge team={match.team2} size="md" />
            </div>
            <span className="text-xs text-gray-400">M{match.matchNumber}</span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Venue</label>
                <input className="input-field" value={venue} onChange={e => setVenue(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">City</label>
                <input className="input-field" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Time (IST)</label>
                <input className="input-field" value={timeIST} onChange={e => setTimeIST(e.target.value)} placeholder="7:30 PM IST" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdits} disabled={saving} className="btn-primary flex-1 text-sm py-2.5">
                  {saving ? '...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600">{match.venue}</div>
              <div className="text-xs text-gray-400">{match.city} · {match.timeIST}</div>
              <div className="text-xs text-gray-400">{formatMatchDate(match.matchDate)}</div>
              <button onClick={() => setEditing(true)} className="mt-3 btn-secondary text-xs py-1.5 px-3">
                ✏️ Edit Venue / Time
              </button>
            </>
          )}
        </div>

        {/* ── TOSS PREDICTION ── */}
        <QuestionSection
          title="Toss Prediction"
          icon="🪙"
          phase={tossPhase}
          saving={saving}
          onFuture={() => doAction(
            () => closeTossPrediction(match.id),
            'Toss set to Future'
          )}
          onOpen={() => doAction(
            () => openTossPrediction(match.id),
            'Toss window opened — users can now predict'
          )}
          onClose={() => doAction(
            () => closeTossPrediction(match.id),
            'Toss window closed'
          )}
        >
          {/* Result input — shown when open or closed */}
          {tossPhase !== 'future' && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Set Toss Winner</div>
              <div className="flex gap-2">
                {teams.map(team => (
                  <button key={team}
                    onClick={() => doAction(
                      () => setTossResult(match.id, team),
                      `${team} won toss — toss scores updated!`
                    )}
                    disabled={saving}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      match.tossWinner === team
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <TeamBadge team={team} size="sm" />
                  </button>
                ))}
              </div>
              {match.tossWinner && (
                <p className="text-xs text-green-600 font-medium mt-2">
                  ✓ Toss won by {match.tossWinner}
                </p>
              )}
            </div>
          )}
        </QuestionSection>

        {/* ── MATCH WINNER ── */}
        <QuestionSection
          title="Match Winner"
          icon="🏆"
          phase={matchPhase}
          saving={saving}
          onFuture={() => doAction(
            () => closeMatchPrediction(match.id),
            'Match prediction set to Future'
          )}
          onOpen={() => doAction(
            () => openMatchPrediction(match.id),
            'Match window opened — users can now predict'
          )}
          onClose={() => doAction(
            () => closeMatchPrediction(match.id),
            'Match window closed'
          )}
        >
          {matchPhase !== 'future' && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Set Match Result</div>
              <div className="flex gap-2 mb-2">
                {teams.map(team => (
                  <button key={team}
                    onClick={() => doAction(
                      () => setMatchResult(match.id, team, resultMargin || 'TBD'),
                      `${team} won — match scores updated!`
                    )}
                    disabled={saving}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      match.result?.winner === team
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <TeamBadge team={team} size="sm" />
                  </button>
                ))}
              </div>
              <input
                className="input-field text-sm"
                placeholder="Winning margin e.g. 'by 5 wickets' (optional)"
                value={resultMargin}
                onChange={e => setResultMargin(e.target.value)}
              />
              {match.result && (
                <p className="text-xs text-green-600 font-medium mt-2">
                  ✓ {match.result.winner} won · {match.result.margin}
                </p>
              )}
            </div>
          )}
        </QuestionSection>

        {/* ── POWERPLAY — needs to be enabled first ── */}
        {!pp ? (
          <div className="card p-4 border border-dashed border-blue-300 bg-blue-50/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  <span>⚡</span> Powerplay Guesses
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Not enabled for this match yet
                </div>
              </div>
              <button
                onClick={() => doAction(() => initPowerplay(match.id), 'Powerplay enabled!')}
                disabled={saving}
                className="btn-primary text-xs py-2 px-4"
              >
                Enable
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Powerplay team 1 */}
            <QuestionSection
              title={`${match.team1} Powerplay (6 overs)`}
              icon="⚡"
              phase={pp1Phase}
              saving={saving}
              onFuture={() => doAction(
                () => closePowerplay(match.id, 1),
                `${match.team1} PP set to Future`
              )}
              onOpen={() => doAction(
                () => openPowerplay(match.id, 1),
                `${match.team1} PP open — users can now guess`
              )}
              onClose={() => doAction(
                () => closePowerplay(match.id, 1),
                `${match.team1} PP closed`
              )}
            >
              {pp1Phase !== 'future' && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Set Actual Score
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" max="120"
                      placeholder={`${match.team1} actual runs`}
                      value={ppScore1}
                      onChange={e => setPpScore1(e.target.value)}
                      className="input-field flex-1 text-sm"
                    />
                    <button
                      onClick={() => doAction(
                        () => setPowerplayScore(match.id, 1, parseInt(ppScore1)),
                        `${match.team1} PP scored — all guesses calculated!`
                      )}
                      disabled={saving || !ppScore1}
                      className="btn-primary text-sm px-4"
                    >
                      Set Score
                    </button>
                  </div>
                  {pp.team1Score != null && (
                    <p className="text-xs text-green-600 font-medium mt-2">
                      ✓ Actual score: {pp.team1Score} runs
                    </p>
                  )}
                </div>
              )}
            </QuestionSection>

            {/* Powerplay team 2 */}
            <QuestionSection
              title={`${match.team2} Powerplay (6 overs)`}
              icon="⚡"
              phase={pp2Phase}
              saving={saving}
              onFuture={() => doAction(
                () => closePowerplay(match.id, 2),
                `${match.team2} PP set to Future`
              )}
              onOpen={() => doAction(
                () => openPowerplay(match.id, 2),
                `${match.team2} PP open — users can now guess`
              )}
              onClose={() => doAction(
                () => closePowerplay(match.id, 2),
                `${match.team2} PP closed`
              )}
            >
              {pp2Phase !== 'future' && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Set Actual Score
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" max="120"
                      placeholder={`${match.team2} actual runs`}
                      value={ppScore2}
                      onChange={e => setPpScore2(e.target.value)}
                      className="input-field flex-1 text-sm"
                    />
                    <button
                      onClick={() => doAction(
                        () => setPowerplayScore(match.id, 2, parseInt(ppScore2)),
                        `${match.team2} PP scored — all guesses calculated!`
                      )}
                      disabled={saving || !ppScore2}
                      className="btn-primary text-sm px-4"
                    >
                      Set Score
                    </button>
                  </div>
                  {pp.team2Score != null && (
                    <p className="text-xs text-green-600 font-medium mt-2">
                      ✓ Actual score: {pp.team2Score} runs
                    </p>
                  )}
                </div>
              )}
            </QuestionSection>
          </>
        )}

      </div>
    </div>
  )
}
