import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToMatch } from '../../services/matchService'
import { subscribeToUserPrediction, savePrediction } from '../../services/predictionService'
import type { Match, Prediction, IPLTeam } from '../../types'
import { PageHeader, PredCard, Spinner } from '../../components/shared'
import { POINTS } from '../../types'
import toast from 'react-hot-toast'

export default function PredictPage() {
  const { partyId, matchId: routeMatchId } = useParams<{ partyId: string; matchId?: string }>()
  const navigate = useNavigate()
  const { firebaseUser, appUser } = useAuth()

  const [match, setMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [tossWinner, setTossWinner] = useState<IPLTeam | null>(null)
  const [matchWinner, setMatchWinner] = useState<IPLTeam | null>(null)
  const [saving, setSaving] = useState(false)
  const [partyMatchId, setPartyMatchId] = useState<string | null>(null)

  // Get matchId from party if not in route
  useEffect(() => {
    if (!partyId) return
    import('../../services/partyService').then(({ subscribeToParty }) => {
      return subscribeToParty(partyId, (p) => {
        setPartyMatchId(p.matchId)
      })
    })
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
        matchWinner ?? undefined
      )
      toast.success('Predictions saved! 🎯')
      navigate(-1)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!match) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>

  const tossOpen = match.tossPredictionOpen
  const matchOpen = match.matchPredictionOpen
  const teams: IPLTeam[] = [match.team1, match.team2]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Make Predictions"
        subtitle={`${match.team1} vs ${match.team2}`}
        onBack={() => navigate(-1)}
      />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-5">
        {/* Toss prediction */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">Who will win the toss?</div>
            <div className="flex items-center gap-1.5">
              {tossOpen
                ? <><div className="w-2 h-2 rounded-full bg-green-500 pulse-live" /><span className="text-xs text-green-600 font-medium">Open</span></>
                : <span className="text-xs text-red-500 font-medium">Closed</span>
              }
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-3">+{POINTS.TOSS_CORRECT} pts for correct pick</div>
          <div className="space-y-2">
            {teams.map(team => (
              <PredCard
                key={team}
                team={team}
                selected={tossWinner === team}
                disabled={!tossOpen}
                points={POINTS.TOSS_CORRECT}
                onClick={() => tossOpen && setTossWinner(tossWinner === team ? null : team)}
              />
            ))}
          </div>
          {!tossOpen && (
            <p className="text-xs text-red-400 mt-2 text-center">
              Toss prediction window is closed
            </p>
          )}
        </div>

        {/* Match winner prediction */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">Who will win the match?</div>
            <div className="flex items-center gap-1.5">
              {matchOpen
                ? <><div className="w-2 h-2 rounded-full bg-green-500 pulse-live" /><span className="text-xs text-green-600 font-medium">Open</span></>
                : <span className="text-xs text-red-500 font-medium">Closed</span>
              }
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-3">+{POINTS.MATCH_CORRECT} pts for correct pick</div>
          <div className="space-y-2">
            {teams.map(team => (
              <PredCard
                key={team}
                team={team}
                selected={matchWinner === team}
                disabled={!matchOpen}
                points={POINTS.MATCH_CORRECT}
                onClick={() => matchOpen && setMatchWinner(matchWinner === team ? null : team)}
              />
            ))}
          </div>
          {!matchOpen && (
            <p className="text-xs text-red-400 mt-2 text-center">
              Match prediction window is closed
            </p>
          )}
        </div>

        {/* Save button */}
        {(tossOpen || matchOpen) && (
          <button
            onClick={handleSave}
            disabled={saving || (!tossWinner && !matchWinner)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Lock Predictions 🔒'
            }
          </button>
        )}

        {prediction && (
          <div className="text-xs text-gray-400 text-center">
            Last saved — predictions update in real time
          </div>
        )}
      </div>
    </div>
  )
}
