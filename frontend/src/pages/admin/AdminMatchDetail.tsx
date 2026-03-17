import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  subscribeToMatch, updateMatch,
  setTossQState, setTossResult,
  setMatchQState, setMatchResult,
  setPowerplayQState, setPowerplayScore, initPowerplay
} from '../../services/matchService'
import type { Match, IPLTeam, QState } from '../../types'
import { PageHeader, TeamBadge, Spinner } from '../../components/shared'
import { formatMatchDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Phase control buttons ──────────────────────────────────────────────────
const STATES: { value: QState; label: string; activeClass: string; hoverClass: string }[] = [
  {
    value: 'future',
    label: 'Future',
    activeClass: 'bg-gray-500 text-white border-gray-500 ring-2 ring-gray-300',
    hoverClass: 'hover:border-gray-400',
  },
  {
    value: 'open',
    label: 'Open',
    activeClass: 'bg-green-500 text-white border-green-500 ring-2 ring-green-200',
    hoverClass: 'hover:border-green-400',
  },
  {
    value: 'closed',
    label: 'Closed',
    activeClass: 'bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200',
    hoverClass: 'hover:border-orange-400',
  },
  {
    value: 'skipped',
    label: 'Skip',
    activeClass: 'bg-gray-300 text-gray-700 border-gray-300 ring-2 ring-gray-200',
    hoverClass: 'hover:border-gray-400',
  },
]

function StateButtons({
  current, saving, onChange
}: {
  current: QState
  saving: boolean
  onChange: (s: QState) => void
}) {
  return (
    <div className="flex gap-1.5">
      {STATES.map(s => {
        const isActive = s.value === current
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            disabled={saving || isActive}
            title={
              s.value === 'future'  ? 'Hidden from users — not started yet' :
              s.value === 'open'    ? 'Users can submit predictions' :
              s.value === 'closed'  ? 'Locked — waiting for result' :
              'Will not happen — hidden from users'
            }
            className={`flex-1 py-2 px-1 rounded-xl border text-xs font-semibold transition-all
              disabled:cursor-not-allowed
              ${isActive
                ? s.activeClass
                : `bg-white text-gray-400 border-gray-200 ${s.hoverClass}`
              }`}
          >
            {isActive && <span className="mr-0.5">●</span>}
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// Card background per state
function stateBg(s: QState) {
  if (s === 'open')      return 'border-green-200 bg-green-50'
  if (s === 'closed')    return 'border-orange-200 bg-orange-50'
  if (s === 'skipped')   return 'border-gray-200 bg-gray-100 opacity-60'
  if (s === 'completed') return 'border-blue-200 bg-blue-50'
  return 'border-gray-200 bg-gray-50'
}

// State pill
function StatePill({ state }: { state: QState }) {
  const map: Record<QState, { label: string; cls: string }> = {
    future:    { label: 'Future',    cls: 'bg-gray-100 text-gray-500' },
    open:      { label: 'Open',      cls: 'bg-green-100 text-green-700' },
    closed:    { label: 'Closed',    cls: 'bg-orange-100 text-orange-700' },
    skipped:   { label: 'Skipped',   cls: 'bg-gray-200 text-gray-500' },
    completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
  }
  const { label, cls } = map[state]
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}

// State description shown below buttons
function StateDesc({ state }: { state: QState }) {
  const desc: Record<QState, string> = {
    future:    'Hidden from users. Will show when you set it to Open.',
    open:      'Users can now submit and update their predictions.',
    closed:    'Predictions locked. Set the result below to complete scoring.',
    skipped:   'Won\'t happen. This question is hidden from all users.',
    completed: 'Result entered. Points have been calculated.',
  }
  return <p className="text-xs text-gray-400 mb-3">{desc[state]}</p>
}

// ── Main component ─────────────────────────────────────────────────────────
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
      setMatch(m); setVenue(m.venue); setCity(m.city); setTimeIST(m.timeIST)
    })
    return () => unsub()
  }, [matchId])

  async function doAction(fn: () => Promise<void>, msg: string) {
    setSaving(true)
    try { await fn(); toast.success(msg) }
    catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const teams: IPLTeam[] = [match.team1, match.team2]
  const pp = match.powerplay
  const ts = (match.tossState  || 'future') as QState
  const ms = (match.matchState || 'future') as QState
  const pp1s = (pp?.team1State || 'future') as QState
  const pp2s = (pp?.team2State || 'future') as QState

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`Match ${match.matchNumber}`}
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate('/admin/fixtures')}
      />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Match info */}
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
              <div><label className="text-xs text-gray-500 font-medium mb-1 block">Venue</label><input className="input-field" value={venue} onChange={e=>setVenue(e.target.value)}/></div>
              <div><label className="text-xs text-gray-500 font-medium mb-1 block">City</label><input className="input-field" value={city} onChange={e=>setCity(e.target.value)}/></div>
              <div><label className="text-xs text-gray-500 font-medium mb-1 block">Time (IST)</label><input className="input-field" value={timeIST} onChange={e=>setTimeIST(e.target.value)} placeholder="7:30 PM IST"/></div>
              <div className="flex gap-2">
                <button onClick={async()=>{setSaving(true);try{await updateMatch(matchId!,{venue,city,timeIST});toast.success('Updated');setEditing(false)}catch(e:any){toast.error(e.message)}finally{setSaving(false)}}} disabled={saving} className="btn-primary flex-1 text-sm py-2.5">{saving?'...':'Save'}</button>
                <button onClick={()=>setEditing(false)} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600">{match.venue}</div>
              <div className="text-xs text-gray-400">{match.city} · {match.timeIST} · {formatMatchDate(match.matchDate)}</div>
              <button onClick={()=>setEditing(true)} className="mt-3 btn-secondary text-xs py-1.5 px-3">✏️ Edit</button>
            </>
          )}
        </div>

        {/* ── TOSS PREDICTION ── */}
        <div className={`card p-4 border-2 ${stateBg(ts)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>🪙</span> Toss Prediction
            </div>
            <StatePill state={ts} />
          </div>

          <StateButtons current={ts} saving={saving}
            onChange={s => {
              if (s === 'completed') return // use "Set Toss Winner" button instead
              doAction(() => setTossQState(match.id, s), `Toss → ${s}`)
            }}
          />
          <StateDesc state={ts} />

          {(ts === 'open' || ts === 'closed' || ts === 'completed') && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Set Toss Winner <span className="text-gray-400 font-normal">(auto-sets to Completed)</span></div>
              <div className="flex gap-2">
                {teams.map(team => (
                  <button key={team}
                    onClick={() => doAction(() => setTossResult(match.id, team), `${team} won toss — scores updated!`)}
                    disabled={saving}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      match.tossWinner === team
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <TeamBadge team={team} size="sm" />
                  </button>
                ))}
              </div>
              {match.tossWinner && (
                <p className="text-xs text-blue-600 font-medium mt-2">✓ Toss won by {match.tossWinner}</p>
              )}
            </div>
          )}
        </div>

        {/* ── MATCH WINNER ── */}
        <div className={`card p-4 border-2 ${stateBg(ms)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>🏆</span> Match Winner
            </div>
            <StatePill state={ms} />
          </div>

          <StateButtons current={ms} saving={saving}
            onChange={s => {
              if (s === 'completed') return
              doAction(() => setMatchQState(match.id, s), `Match → ${s}`)
            }}
          />
          <StateDesc state={ms} />

          {(ms === 'open' || ms === 'closed' || ms === 'completed') && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Set Match Result <span className="text-gray-400 font-normal">(auto-sets to Completed)</span></div>
              <div className="flex gap-2 mb-2">
                {teams.map(team => (
                  <button key={team}
                    onClick={() => doAction(() => setMatchResult(match.id, team, resultMargin || 'TBD'), `${team} won — scores calculated!`)}
                    disabled={saving}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      match.result?.winner === team
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <TeamBadge team={team} size="sm" />
                  </button>
                ))}
              </div>
              <input className="input-field text-sm" placeholder="Margin e.g. 'by 5 wickets'" value={resultMargin} onChange={e=>setResultMargin(e.target.value)} />
              {match.result && (
                <p className="text-xs text-blue-600 font-medium mt-2">✓ {match.result.winner} won · {match.result.margin}</p>
              )}
            </div>
          )}
        </div>

        {/* ── POWERPLAY SECTION ── */}
        {!pp ? (
          <div className="card p-4 border border-dashed border-blue-300 bg-blue-50/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">⚡ Powerplay Guesses</div>
                <div className="text-xs text-gray-400 mt-1">Not enabled for this match</div>
              </div>
              <button onClick={() => doAction(() => initPowerplay(match.id), 'Powerplay enabled!')}
                disabled={saving} className="btn-primary text-xs py-2 px-4">Enable</button>
            </div>
          </div>
        ) : (
          <>
            {/* Team 1 powerplay */}
            <div className={`card p-4 border-2 ${stateBg(pp1s)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>⚡</span>
                  <TeamBadge team={match.team1} size="xs" />
                  <span>Powerplay</span>
                </div>
                <StatePill state={pp1s} />
              </div>

              <StateButtons current={pp1s} saving={saving}
                onChange={s => {
                  if (s === 'completed') return
                  doAction(() => setPowerplayQState(match.id, 1, s), `${match.team1} PP → ${s}`)
                }}
              />
              <StateDesc state={pp1s} />

              {(pp1s === 'open' || pp1s === 'closed' || pp1s === 'completed') && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Set Actual Score <span className="text-gray-400 font-normal">(auto-sets to Completed)</span></div>
                  <div className="flex gap-2">
                    <input type="number" min="0" max="120"
                      placeholder={`${match.team1} actual runs`}
                      value={ppScore1} onChange={e=>setPpScore1(e.target.value)}
                      className="input-field flex-1 text-sm" />
                    <button onClick={() => doAction(() => setPowerplayScore(match.id, 1, parseInt(ppScore1)), `${match.team1} PP scored!`)}
                      disabled={saving || !ppScore1} className="btn-primary text-sm px-4">Set Score</button>
                  </div>
                  {pp.team1Score != null && (
                    <p className="text-xs text-blue-600 font-medium mt-2">✓ Actual: {pp.team1Score} runs</p>
                  )}
                </div>
              )}
            </div>

            {/* Team 2 powerplay */}
            <div className={`card p-4 border-2 ${stateBg(pp2s)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>⚡</span>
                  <TeamBadge team={match.team2} size="xs" />
                  <span>Powerplay</span>
                </div>
                <StatePill state={pp2s} />
              </div>

              <StateButtons current={pp2s} saving={saving}
                onChange={s => {
                  if (s === 'completed') return
                  doAction(() => setPowerplayQState(match.id, 2, s), `${match.team2} PP → ${s}`)
                }}
              />
              <StateDesc state={pp2s} />

              {(pp2s === 'open' || pp2s === 'closed' || pp2s === 'completed') && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Set Actual Score <span className="text-gray-400 font-normal">(auto-sets to Completed)</span></div>
                  <div className="flex gap-2">
                    <input type="number" min="0" max="120"
                      placeholder={`${match.team2} actual runs`}
                      value={ppScore2} onChange={e=>setPpScore2(e.target.value)}
                      className="input-field flex-1 text-sm" />
                    <button onClick={() => doAction(() => setPowerplayScore(match.id, 2, parseInt(ppScore2)), `${match.team2} PP scored!`)}
                      disabled={saving || !ppScore2} className="btn-primary text-sm px-4">Set Score</button>
                  </div>
                  {pp.team2Score != null && (
                    <p className="text-xs text-blue-600 font-medium mt-2">✓ Actual: {pp.team2Score} runs</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      {/* Link to over questions */}
        <button
          onClick={() => navigate(`/admin/fixtures/${match.id}/overs`)}
          className="w-full card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-ipl-blue/10 rounded-xl flex items-center justify-center text-xl">🏏</div>
          <div className="text-left">
            <div className="text-sm font-semibold">Over-by-Over Questions</div>
            <div className="text-xs text-gray-400">Manage 40 over questions (runs, wkts, 4s, 6s)</div>
          </div>
          <span className="ml-auto text-gray-400">→</span>
        </button>

      </div>
    </div>
  )
}
