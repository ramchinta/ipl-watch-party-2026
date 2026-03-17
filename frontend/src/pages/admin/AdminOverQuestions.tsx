import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subscribeToMatch } from '../../services/matchService'
import {
  subscribeToMatchOvers, seedOverQuestions,
  setOverState, setOverResult
} from '../../services/overService'
import type { Match, OverQuestion, QState, Inning } from '../../types'
import { PageHeader, TeamBadge, Spinner } from '../../components/shared'
import toast from 'react-hot-toast'

const STATE_BTNS: { value: QState; label: string; active: string; hover: string }[] = [
  { value: 'future',  label: 'Future',  active: 'bg-gray-500 text-white border-gray-500 ring-2 ring-gray-300',   hover: 'hover:border-gray-400' },
  { value: 'open',    label: 'Open',    active: 'bg-green-500 text-white border-green-500 ring-2 ring-green-200', hover: 'hover:border-green-400' },
  { value: 'closed',  label: 'Closed',  active: 'bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200', hover: 'hover:border-orange-400' },
  { value: 'skipped', label: 'Skip',    active: 'bg-gray-300 text-gray-600 border-gray-300 ring-2 ring-gray-200', hover: 'hover:border-gray-400' },
]

function stateBg(s: QState) {
  if (s === 'open')      return 'border-green-200 bg-green-50'
  if (s === 'closed')    return 'border-orange-200 bg-orange-50'
  if (s === 'skipped')   return 'border-gray-100 bg-gray-100 opacity-50'
  if (s === 'completed') return 'border-blue-200 bg-blue-50'
  return 'border-gray-200 bg-white'
}

function StatePill({ state }: { state: QState }) {
  const map: Record<QState, string> = {
    future: 'bg-gray-100 text-gray-500', open: 'bg-green-100 text-green-700',
    closed: 'bg-orange-100 text-orange-700', skipped: 'bg-gray-200 text-gray-400',
    completed: 'bg-blue-100 text-blue-700',
  }
  const labels: Record<QState, string> = {
    future: 'Future', open: 'Open', closed: 'Closed', skipped: 'Skipped', completed: 'Done'
  }
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[state]}`}>{labels[state]}</span>
}

interface OverCardProps {
  oq: OverQuestion
  saving: string | null
  onStateChange: (state: QState) => void
  onSetResult: (r: { runs: number; wickets: number; fours: number; sixes: number }) => void
}

function OverCard({ oq, saving, onStateChange, onSetResult }: OverCardProps) {
  const [runs, setRuns]     = useState(oq.actualRuns     != null ? String(oq.actualRuns)     : '')
  const [wkts, setWkts]     = useState(oq.actualWickets  != null ? String(oq.actualWickets)  : '')
  const [fours, setFours]   = useState(oq.actualFours    != null ? String(oq.actualFours)    : '')
  const [sixes, setSixes]   = useState(oq.actualSixes    != null ? String(oq.actualSixes)    : '')
  const isSaving = saving === oq.id

  // Sync if result updated externally
  useEffect(() => {
    if (oq.actualRuns != null)     setRuns(String(oq.actualRuns))
    if (oq.actualWickets != null)  setWkts(String(oq.actualWickets))
    if (oq.actualFours != null)    setFours(String(oq.actualFours))
    if (oq.actualSixes != null)    setSixes(String(oq.actualSixes))
  }, [oq.actualRuns, oq.actualWickets, oq.actualFours, oq.actualSixes])

  const canSetResult = oq.state !== 'future' && oq.state !== 'skipped' &&
    runs !== '' && wkts !== '' && fours !== '' && sixes !== ''

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${stateBg(oq.state)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">Over {oq.overNumber}</div>
        <StatePill state={oq.state} />
      </div>

      {/* State buttons */}
      <div className="flex gap-1.5 mb-3">
        {STATE_BTNS.map(btn => {
          const isActive = btn.value === oq.state
          return (
            <button key={btn.value}
              onClick={() => onStateChange(btn.value)}
              disabled={isSaving || isActive}
              title={btn.label}
              className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition-all
                disabled:cursor-not-allowed
                ${isActive ? btn.active : `bg-white text-gray-400 border-gray-200 ${btn.hover}`}`}
            >
              {isActive && '● '}{btn.label}
            </button>
          )
        })}
      </div>

      {/* Result inputs — only show when not future/skipped */}
      {oq.state !== 'future' && oq.state !== 'skipped' && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Runs', val: runs, set: setRuns, max: 36, placeholder: '0' },
              { label: 'Wkts', val: wkts, set: setWkts, max: 4,  placeholder: '0' },
              { label: 'Fours', val: fours, set: setFours, max: 9, placeholder: '0' },
              { label: 'Sixes', val: sixes, set: setSixes, max: 6, placeholder: '0' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 block mb-1 text-center">{f.label}</label>
                <input
                  type="number" min="0" max={f.max}
                  value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  disabled={oq.state === 'completed'}
                  className="input-field text-center text-sm py-2 disabled:opacity-60 disabled:cursor-not-allowed w-full"
                />
              </div>
            ))}
          </div>
          {oq.state !== 'completed' && (
            <button
              onClick={() => onSetResult({
                runs: parseInt(runs), wickets: parseInt(wkts),
                fours: parseInt(fours), sixes: parseInt(sixes)
              })}
              disabled={!canSetResult || isSaving}
              className="btn-primary w-full text-xs py-2 disabled:opacity-50"
            >
              {isSaving ? '...' : 'Set Result & Score All Guesses'}
            </button>
          )}
          {oq.state === 'completed' && (
            <p className="text-xs text-blue-600 text-center font-medium">
              ✓ Result set · All guesses scored
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminOverQuestions() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [overs, setOvers] = useState<OverQuestion[]>([])
  const [seeding, setSeeding] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [inning, setInning] = useState<Inning>(1)

  useEffect(() => {
    if (!matchId) return
    const u1 = subscribeToMatch(matchId, setMatch)
    const u2 = subscribeToMatchOvers(matchId, setOvers)
    return () => { u1(); u2() }
  }, [matchId])

  async function handleSeed() {
    if (!matchId) return
    setSeeding(true)
    try {
      await seedOverQuestions(matchId)
      toast.success('40 over questions created (20 per inning)')
    } catch (e: any) { toast.error(e.message) }
    finally { setSeeding(false) }
  }

  async function handleStateChange(oq: OverQuestion, state: QState) {
    setSaving(oq.id)
    try {
      await setOverState(matchId!, oq.inning, oq.overNumber, state)
      toast.success(`Over ${oq.overNumber} → ${state}`)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(null) }
  }

  async function handleSetResult(
    oq: OverQuestion,
    result: { runs: number; wickets: number; fours: number; sixes: number }
  ) {
    setSaving(oq.id)
    try {
      await setOverResult(matchId!, oq.inning, oq.overNumber, result)
      toast.success(`Over ${oq.overNumber} scored!`)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(null) }
  }

  const innOvers = overs.filter(o => o.inning === inning)
  const hasOvers = overs.length > 0

  // Quick bulk actions
  async function bulkOpen(overNumbers: number[]) {
    for (const n of overNumbers) {
      const oq = innOvers.find(o => o.overNumber === n)
      if (oq && oq.state === 'future') {
        await setOverState(matchId!, inning, n, 'open').catch(() => {})
      }
    }
    toast.success(`Opened overs ${overNumbers.join(', ')}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Over Questions"
        subtitle={match ? `${match.team1} vs ${match.team2}` : ''}
        onBack={() => navigate(`/admin/fixtures/${matchId}`)}
      />

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Seed button */}
        {!hasOvers && (
          <div className="card p-6 text-center mb-4">
            <div className="text-4xl mb-3">🏏</div>
            <div className="font-semibold text-gray-700 mb-1">No over questions yet</div>
            <div className="text-sm text-gray-400 mb-4">
              Create 40 questions (20 overs × 2 innings). You can skip overs if the match is reduced.
            </div>
            <button onClick={handleSeed} disabled={seeding} className="btn-primary mx-auto">
              {seeding ? 'Creating...' : 'Create Over Questions'}
            </button>
          </div>
        )}

        {hasOvers && (
          <>
            {/* Inning toggle */}
            <div className="flex gap-2 mb-4">
              {([1, 2] as Inning[]).map(i => (
                <button key={i} onClick={() => setInning(i)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    inning === i
                      ? 'bg-ipl-blue text-white border-ipl-blue'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {match ? (
                    i === 1
                      ? `Inning 1 — ${match.team1}`
                      : `Inning 2 — ${match.team2}`
                  ) : `Inning ${i}`}
                </button>
              ))}
            </div>

            {/* Quick bulk actions */}
            <div className="card p-3 mb-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">Quick Actions — Inning {inning}</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => bulkOpen([1, 2, 3, 4, 5, 6])}
                  className="btn-secondary text-xs py-1.5 px-3">Open PP (1-6)</button>
                <button onClick={() => bulkOpen([7, 8, 9, 10])}
                  className="btn-secondary text-xs py-1.5 px-3">Open 7-10</button>
                <button onClick={() => bulkOpen([11,12,13,14,15])}
                  className="btn-secondary text-xs py-1.5 px-3">Open 11-15</button>
                <button onClick={() => bulkOpen([16,17,18,19,20])}
                  className="btn-secondary text-xs py-1.5 px-3">Open 16-20</button>
              </div>
            </div>

            {/* Over stats summary */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              {(['future','open','closed','completed'] as QState[]).map(s => {
                const count = innOvers.filter(o => o.state === s).length
                const colors: Record<string,string> = {
                  future:'text-gray-400', open:'text-green-600',
                  closed:'text-orange-500', completed:'text-blue-600'
                }
                return (
                  <div key={s} className="card p-2">
                    <div className={`text-xl font-bold ${colors[s]}`}>{count}</div>
                    <div className="text-xs text-gray-400 capitalize">{s}</div>
                  </div>
                )
              })}
            </div>

            {/* Over cards */}
            <div className="space-y-3">
              {innOvers.map(oq => (
                <OverCard
                  key={oq.id}
                  oq={oq}
                  saving={saving}
                  onStateChange={state => handleStateChange(oq, state)}
                  onSetResult={r => handleSetResult(oq, r)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
