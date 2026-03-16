import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../services/authService'

const tiles = [
  { icon: '📅', label: 'Fixtures', sub: 'Manage IPL 2026 schedule', path: '/admin/fixtures' },
  { icon: '🎉', label: 'Watch Parties', sub: 'View all active parties', path: '/admin/parties' },
]

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-ipl-blue text-white px-5 pt-6 pb-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-white/60 text-sm">Admin Portal</div>
              <div className="text-xl font-bold">IPL Watch Party 2026</div>
            </div>
            <button
              onClick={() => signOut().then(() => navigate('/admin-login'))}
              className="text-xs text-white/50 hover:text-white/80"
            >
              Sign out
            </button>
          </div>
          <div className="text-white/50 text-xs mt-1">Logged in as {appUser?.email || appUser?.name}</div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 -mt-2 py-4">
        <div className="section-title">Admin Controls</div>
        <div className="space-y-3">
          {tiles.map(tile => (
            <button
              key={tile.path}
              onClick={() => navigate(tile.path)}
              className="card p-4 w-full text-left flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-ipl-blue/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                {tile.icon}
              </div>
              <div>
                <div className="font-semibold">{tile.label}</div>
                <div className="text-sm text-gray-400">{tile.sub}</div>
              </div>
              <div className="ml-auto text-gray-300 text-lg">›</div>
            </button>
          ))}
        </div>

        <div className="mt-6 card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick Info</div>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between"><span>Season</span><span className="font-medium">IPL 2026 (19th edition)</span></div>
            <div className="flex justify-between"><span>Starts</span><span className="font-medium">28 Mar 2026</span></div>
            <div className="flex justify-between"><span>Final</span><span className="font-medium">31 May 2026</span></div>
            <div className="flex justify-between"><span>Phase 1</span><span className="font-medium">20 matches loaded</span></div>
            <div className="flex justify-between"><span>Teams</span><span className="font-medium">10</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
