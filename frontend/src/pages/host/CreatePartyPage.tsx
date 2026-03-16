import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAllMatches } from '../../services/matchService'
import { createWatchParty } from '../../services/partyService'
import { generateHostQR } from '../../services/qrService'
import type { Match } from '../../types'
import { PageHeader, Spinner, TeamBadge } from '../../components/shared'
import { formatMatchDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function CreatePartyPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[]>([])
  const [name, setName] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(true)

  useEffect(() => {
    getAllMatches().then(ms => {
      // Show upcoming/active matches only
      setMatches(ms.filter(m => m.status !== 'completed'))
      setMatchLoading(false)
    })
  }, [])

  async function handleCreate() {
    if (!name.trim()) return toast.error('Party name is required')
    if (!selectedMatch) return toast.error('Please select a match')
    if (!appUser) return
    setLoading(true)
    try {
      const qrUrl = await generateHostQR(appUser.uid, appUser.name)
      const partyId = await createWatchParty(
        appUser.uid,
        appUser.name,
        name.trim(),
        selectedMatch,
        qrUrl
      )
      toast.success('Party created!')
      navigate(`/host/party/${partyId}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to create party')
    } finally {
      setLoading(false)
    }
  }

  const upcomingMatches = matches.filter(m => !['completed'].includes(m.status))

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Create Watch Party" onBack={() => navigate('/host')} />

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
        <div className="card p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Party Name <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            placeholder="e.g. IPL Night at Rahul's"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="card p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Select Match <span className="text-red-500">*</span>
          </label>
          {matchLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {upcomingMatches.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatch(m.id)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    selectedMatch === m.id
                      ? 'border-ipl-orange bg-ipl-orange-light'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TeamBadge team={m.team1} size="xs" />
                    <span className="text-xs text-gray-400">vs</span>
                    <TeamBadge team={m.team2} size="xs" />
                    <span className="text-xs text-gray-400 ml-auto">M{m.matchNumber}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatMatchDate(m.matchDate)} · {m.timeIST}
                  </div>
                  <div className="text-xs text-gray-400">{m.city}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !name.trim() || !selectedMatch}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : 'Create Party 🎉'
          }
        </button>
      </div>
    </div>
  )
}
