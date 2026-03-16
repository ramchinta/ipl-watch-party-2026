import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  subscribeToMatch, updateMatch, setTossResult,
  setMatchResult, closeTossPrediction, closeMatchPrediction,
  openTossPrediction, openMatchPrediction
} from '../../services/matchService'
import type { Match, IPLTeam } from '../../types'
import { IPL_TEAMS } from '../../types'
import { PageHeader, TeamBadge, StatusBadge, Spinner } from '../../components/shared'
import { formatMatchDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdminMatchDetail() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [timeIST, setTimeIST] = useState('')
  const [resultMargin, setResultMargin] = useState('')

  useEffect(() => {
    if (!matchId) return
    const unsub = subscribeToMatch(matchId, (m) => {
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
    await doAction(
      () => updateMatch(matchId, { venue, city, timeIST }),
      'Match updated'
    )
    setEditing(false)
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const teams: IPLTeam[] = [match.team1, match.team2]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`M${match.matchNumber}`}
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate('/admin/fixtures')}
      />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Match info */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TeamBadge team={match.team1} size="md" />
              <span className="text-gray-400">vs</span>
              <TeamBadge team={match.team2} size="md" />
            </div>
            <StatusBadge status={match.status} />
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
              <div className="text-sm text-gray-600 mb-1">{match.venue}</div>
              <div className="text-xs text-gray-400">{match.city} · {match.timeIST}</div>
              <div className="text-xs text-gray-400">{formatMatchDate(match.matchDate)}</div>
              <button onClick={() => setEditing(true)} className="mt-3 btn-secondary text-xs py-1.5 px-3">
                ✏️ Edit Venue / Time
              </button>
            </>
          )}
        </div>

        {/* Toss prediction window */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Toss Prediction Window</span>
            <StatusBadge status={match.tossPredictionOpen ? 'toss_open' : 'toss_closed'} />
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => doAction(() => openTossPrediction(match.id), 'Toss window opened')}
              disabled={saving || match.tossPredictionOpen}
              className="btn-secondary text-sm flex-1 py-2"
            >
              Open
            </button>
            <button
              onClick={() => doAction(() => closeTossPrediction(match.id), 'Toss window closed')}
              disabled={saving || !match.tossPredictionOpen}
              className="btn-danger text-sm flex-1 py-2"
            >
              Close
            </button>
          </div>

          <div className="text-xs text-gray-500 font-medium mb-2">Set Toss Winner</div>
          <div className="flex gap-2">
            {teams.map(team => (
              <button
                key={team}
                onClick={() => doAction(() => setTossResult(match.id, team), `${team} won toss — scores updated!`)}
                disabled={saving}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                  match.tossWinner === team
                    ? 'border-ipl-orange bg-ipl-orange-light text-ipl-orange'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <TeamBadge team={team} size="sm" />
              </button>
            ))}
          </div>
          {match.tossWinner && (
            <p className="text-xs text-gray-500 mt-2">
              Toss winner set: <strong>{match.tossWinner}</strong>
            </p>
          )}
        </div>

        {/* Match prediction window */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Match Prediction Window</span>
            <StatusBadge status={match.matchPredictionOpen ? 'match_open' : 'match_closed'} />
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => doAction(() => openMatchPrediction(match.id), 'Match window opened')}
              disabled={saving || match.matchPredictionOpen}
              className="btn-secondary text-sm flex-1 py-2"
            >
              Open
            </button>
            <button
              onClick={() => doAction(() => closeMatchPrediction(match.id), 'Match window closed')}
              disabled={saving || !match.matchPredictionOpen}
              className="btn-danger text-sm flex-1 py-2"
            >
              Close
            </button>
          </div>

          <div className="text-xs text-gray-500 font-medium mb-2">Set Match Result</div>
          <div className="flex gap-2 mb-2">
            {teams.map(team => (
              <button
                key={team}
                onClick={() => doAction(
                  () => setMatchResult(match.id, team, resultMargin || 'TBD'),
                  `${team} won — all scores calculated!`
                )}
                disabled={saving}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                  match.result?.winner === team
                    ? 'border-ipl-orange bg-ipl-orange-light'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <TeamBadge team={team} size="sm" />
              </button>
            ))}
          </div>
          <input
            className="input-field text-sm"
            placeholder="Margin e.g. 'by 5 wickets' (optional)"
            value={resultMargin}
            onChange={e => setResultMargin(e.target.value)}
          />
          {match.result && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Result recorded: {match.result.winner} won {match.result.margin}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
