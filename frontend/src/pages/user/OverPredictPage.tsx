import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToMatchOvers, subscribeToUserOverGuesses, saveOverGuess } from '../../services/overService'
import type { Match, OverQuestion, OverGuess, Inning } from '../../types'
import { calcRunsPoints, calcExactPoints } from '../../types'
import { PageHeader, TeamBadge, Spinner } from '../../components/shared'
import toast from 'react-hot-toast'

type Inning2 = 1 | 2

export default function OverPredictPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { firebaseUser } = useAuth()

  const [match, setMatch] = useState<Match | null>(null)
  const [overs, setOvers] = useState<OverQuestion[]>([])
  const [guesses, setGuesses] = useState<Record<string, OverGuess>>({})
  const [inning, setInning] = useState<Inning2>(1)
  const [drafts, setDrafts] = useState<Record<string, {
    runs: string; wickets: string; fours: string; sixes: string
  }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [partyMatchId, setPartyMatchId] = useState<string | null>(null)

  useEffect(() => {
    if (!partyId) return
    import('../../services/partyService').then(({ subscribeToParty }) =>
      subscribeToParty(partyId, p => setPartyMatchId(p.matchId))
    )
  }, [partyId])

  useEffect(() => {
    if (!partyMatchId) return
    const u1 = subscribeToMatch(partyMatchId, setMatch)
    const u2 = subscribeToMatchOvers(partyMatchId, setOvers)
    return () => { u1(); u2() }
  }, [partyMatchId])

  useEffect(() => {
    if (!partyMatchId || !partyId || !firebaseUser) return
    return subscribeToUserOverGuesses(partyMatchId, partyId, firebaseUser.uid, g => {
      setGuesses(g)
      // Sync drafts from saved guesses (only if not already drafted)
      setDrafts(prev => {
        const next = { ...prev }
        Object.entries(g).forEach(([key, guess]) => {
          if (!next[key]) {
            next[key] = {
              runs:    guess.guessRuns     != null ? String(guess.guessRuns)    : '',
              wickets: guess.guessWickets  != null ? String(guess.guessWickets) : '',
              fours:   guess.guessFours    != null ? String(guess.guessFours)   : '',
              sixes:   guess.guessSixes    != null ? String(guess.guessSixes)   : '',
            }
          }
        })
        return next
      })
    })
  }, [partyMatchId, partyId, firebaseUser])

  function getKey(inn: Inning2, over: number) {
    return `${partyMatchId}_inn${inn}_over${over}`
  }

  function getDraft(inn: Inning2, over: number) {
    return drafts[getKey(inn, over)] || { runs: '', wickets: '', fours: '', sixes: '' }
  }

  function setDraft(inn: Inning2, over: number, field: string, value: string) {
    const key = getKey(inn, over)
    setDrafts(prev => ({ ...prev, [key]: { ...getDraft(inn, over), [field]: value } }))
  }

  async function handleSave(oq: OverQuestion) {
    if (!firebaseUser || !partyId || !partyMatchId) return
    const key = getKey(oq.inning, oq.overNumber)
    const d = drafts[key] || { runs: '', wickets: '', fours: '', sixes: '' }
    if (!d.runs && !d.wickets && !d.fours && !d.sixes) return toast.error('Enter at least one guess')
    setSaving(key)
    try {
      await saveOverGuess(
        firebaseUser.uid, partyId, partyMatchId,
        oq.inning, oq.overNumber, {
          runs:    d.runs    !== '' ? parseInt(d.runs)    : undefined,
          wickets: d.wickets !== '' ? parseInt(d.wickets) : undefined,
          fours:   d.fours   !== '' ? parseInt(d.fours)   : undefined,
          sixes:   d.sixes   !== '' ? parseInt(d.sixes)   : undefined,
        }
      )
      toast.success(`Over ${oq.overNumber} saved!`)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(null) }
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const visibleOvers = overs.filter(
    o => o.inning === inning && o.state !== 'future' && o.state !== 'skipped'
  )
  const openCount = visibleOvers.filter(o => o.state === 'open').length

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Over-by-Over Guesses"
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate(`/party/${partyId}`)}
      />

      <div className="max-w-sm mx-auto px-4 py-5">
        {/* Inning toggle */}
        <div className="flex gap-2 mb-4">
          {([1, 2] as Inning2[]).map(i => {
            const team = i === 1 ? match.team1 : match.team2
            const cnt = overs.filter(o => o.inning === i && o.state === 'open').length
            return (
              <button key={i} onClick={() => setInning(i)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 relative ${
                  inning === i ? 'bg-ipl-blue text-white border-ipl-blue' : 'bg-white text-gray-500 border-gray-200'
                }`}>
                <TeamBadge team={team} size="xs" />
                {cnt > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cnt}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Points legend */}
        <div className="card p-3 mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">Points per over</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            <div>Runs exact → <strong className="text-ipl-orange">+10</strong></div>
            <div>Wickets exact → <strong className="text-ipl-orange">+5</strong></div>
            <div>Runs ±1 → <strong className="text-ipl-orange">+7</strong></div>
            <div>Fours exact → <strong className="text-ipl-orange">+5</strong></div>
            <div>Runs ±3 → <strong className="text-ipl-orange">+5</strong></div>
            <div>Sixes exact → <strong className="text-ipl-orange">+5</strong></div>
            <div>Runs ±5 → <strong className="text-ipl-orange">+3</strong></div>
            <div>Max per over → <strong className="text-ipl-orange">+25</strong></div>
          </div>
        </div>

        {visibleOvers.length === 0 && (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">🕐</div>
            <div className="font-semibold text-gray-600">No overs open yet</div>
            <div className="text-sm text-gray-400 mt-1">Admin will open overs as the match progresses</div>
          </div>
        )}

        <div className="space-y-3">
          {visibleOvers.map(oq => {
            const key = getKey(oq.inning, oq.overNumber)
            const d = getDraft(oq.inning, oq.overNumber)
            const saved = guesses[key]
            const isOpen = oq.state === 'open'
            const isClosed = oq.state === 'closed'
            const isDone = oq.state === 'completed'
            const isSavingThis = saving === key

            return (
              <div key={key} className={`card p-4 border-2 transition-all ${
                isDone  ? 'border-blue-200 bg-blue-50' :
                isClosed? 'border-orange-200 bg-orange-50' :
                isOpen  ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">Over {oq.overNumber}</div>
                  <div className="flex items-center gap-2">
                    {isDone && saved && (
                      <span className="text-xs font-bold text-blue-600">
                        +{saved.totalPoints ?? 0} pts
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isDone  ? 'bg-blue-100 text-blue-700' :
                      isClosed? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {isDone ? 'Done' : isClosed ? 'Locked' : 'Open'}
                    </span>
                  </div>
                </div>

                {/* Input grid */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { field: 'runs',    label: 'Runs',  max: 36, actual: oq.actualRuns,    pts: saved?.pointsRuns },
                    { field: 'wickets', label: 'Wkts',  max: 4,  actual: oq.actualWickets, pts: saved?.pointsWickets },
                    { field: 'fours',   label: 'Fours', max: 9,  actual: oq.actualFours,   pts: saved?.pointsFours },
                    { field: 'sixes',   label: 'Sixes', max: 6,  actual: oq.actualSixes,   pts: saved?.pointsSixes },
                  ].map(f => (
                    <div key={f.field} className="text-center">
                      <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                      <input
                        type="number" min="0" max={f.max}
                        value={d[f.field as keyof typeof d]}
                        onChange={e => setDraft(oq.inning, oq.overNumber, f.field, e.target.value)}
                        disabled={!isOpen}
                        placeholder="?"
                        className={`w-full text-center text-lg font-bold rounded-xl border py-2 outline-none transition-all
                          focus:border-ipl-orange focus:ring-2 focus:ring-ipl-orange/20
                          disabled:cursor-not-allowed
                          ${isDone
                            ? f.actual != null && d[f.field as keyof typeof d] !== ''
                              ? parseInt(d[f.field as keyof typeof d]) === f.actual
                                ? 'border-green-400 bg-green-50 text-green-700'
                                : 'border-red-300 bg-red-50 text-red-600'
                              : 'border-gray-200 bg-gray-50 opacity-60'
                            : isClosed
                              ? 'border-orange-300 bg-orange-50/50 opacity-70'
                              : 'border-gray-200 bg-white'
                          }`}
                      />
                      {/* Show actual result */}
                      {f.actual != null && (
                        <div className="text-xs mt-1">
                          <span className="text-gray-400">{f.actual}</span>
                          {f.pts != null && (
                            <span className={`ml-1 font-bold ${f.pts > 0 ? 'text-green-600' : 'text-red-400'}`}>
                              {f.pts > 0 ? `+${f.pts}` : '✗'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isOpen && (
                  <button
                    onClick={() => handleSave(oq)}
                    disabled={isSavingThis}
                    className="btn-primary w-full text-xs py-2"
                  >
                    {isSavingThis
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                      : saved ? 'Update Guess' : 'Save Guess'
                    }
                  </button>
                )}

                {isClosed && (
                  <p className="text-xs text-center text-orange-500 bg-orange-50 rounded-xl py-1.5">
                    🔒 Locked — waiting for result
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
