import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { completeProfile } from '../../services/authService'
import { IPL_TEAMS, type IPLTeam } from '../../types'
import { cn } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ProfileSetupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { firebaseUser } = useAuth()

  const [name, setName] = useState('')
  const [food, setFood] = useState('')
  const [team, setTeam] = useState<IPLTeam | ''>('')
  const [loading, setLoading] = useState(false)

  const redirect = params.get('redirect') || ''
  const host = params.get('host') || ''

  async function handleSave() {
    if (!name.trim()) return toast.error('Name is required')
    if (!firebaseUser) return
    setLoading(true)
    try {
      await completeProfile(firebaseUser.uid, {
        name: name.trim(),
        food: food.trim() || undefined,
        favoriteTeam: team || undefined,
      })
      toast.success('Welcome to IPL Watch Party!')
      if (redirect) navigate(redirect)
      else if (host) navigate(`/join?host=${host}`)
      else navigate('/')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-ipl-blue px-6 py-8 text-white">
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold">Welcome! 🏏</h1>
          <p className="text-white/70 text-sm mt-1">Tell us about yourself</p>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 max-w-sm mx-auto w-full">
        <div className="card p-5 mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            placeholder="e.g. Arjun Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />

          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">
            Favorite Food <span className="text-gray-300 font-normal">(optional)</span>
          </label>
          <input
            className="input-field"
            placeholder="e.g. Biryani, Samosas..."
            value={food}
            onChange={e => setFood(e.target.value)}
          />
        </div>

        <div className="card p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Favorite IPL Team <span className="text-gray-300 font-normal">(optional)</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {IPL_TEAMS.map(t => (
              <button
                key={t.id}
                onClick={() => setTeam(team === t.id ? '' : t.id)}
                className={cn(
                  'py-2 rounded-xl text-xs font-bold transition-all border-2',
                  team === t.id
                    ? `${t.color} border-transparent scale-105`
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                )}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
        >
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : 'Save & Continue'
          }
        </button>
      </div>
    </div>
  )
}
