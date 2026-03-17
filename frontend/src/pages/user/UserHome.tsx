import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPartyByCode, joinParty } from '../../services/partyService'
import { db } from '../../services/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import type { WatchParty, IPLTeam } from '../../types'
import { IPL_TEAMS } from '../../types'
import { StatusBadge, Spinner } from '../../components/shared'
import { cn } from '../../utils/helpers'
import toast from 'react-hot-toast'

type Tab = 'home' | 'past' | 'rules' | 'account'

export default function UserHome() {
  const { appUser, firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('home')
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [allParties, setAllParties] = useState<WatchParty[]>([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [editFood, setEditFood] = useState('')
  const [editTeam, setEditTeam] = useState<IPLTeam | ''>('')
  const [savingAccount, setSavingAccount] = useState(false)

  useEffect(() => {
    if (!appUser) return
    setEditName(appUser.name || '')
    setEditFood((appUser as any).food || '')
    setEditTeam(appUser.favoriteTeam || '')
    const ids: string[] = appUser.joinedParties || []
    if (ids.length === 0) { setLoading(false); return }
    Promise.all(
      ids.map(async (id) => {
        const snap = await getDoc(doc(db, 'watchParties', id))
        if (snap.exists()) return { id: snap.id, ...snap.data() } as WatchParty
        return null
      })
    ).then(results => {
      const valid = (results.filter(Boolean) as WatchParty[])
        .sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0))
      setAllParties(valid)
      setLoading(false)
    })
  }, [appUser])

  async function handleJoin() {
    const c = code.trim().toUpperCase()
    if (c.length < 4) return toast.error('Enter a valid join code')
    setJoining(true)
    try {
      const party = await getPartyByCode(c)
      if (!party) { toast.error('Party not found — check your code'); setJoining(false); return }
      if (firebaseUser) await joinParty(party.id, firebaseUser.uid)
      navigate(`/party/${party.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to join')
    } finally { setJoining(false) }
  }

  async function handleSaveAccount() {
    if (!editName.trim()) return toast.error('Name is required')
    setSavingAccount(true)
    try {
      await updateDoc(doc(db, 'users', firebaseUser!.uid), {
        name: editName.trim(),
        food: editFood.trim() || null,
        favoriteTeam: editTeam || null,
      })
      toast.success('Profile updated!')
    } catch (e: any) { toast.error(e.message || 'Failed to save') }
    finally { setSavingAccount(false) }
  }

  const activeParties = allParties.filter(p => p.status !== 'completed')
  const pastParties = allParties.filter(p => p.status === 'completed')

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'past', icon: '📋', label: 'History' },
    { id: 'rules', icon: '📖', label: 'Rules' },
    { id: 'account', icon: '👤', label: 'Account' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-ipl-blue text-white px-5 pt-6 pb-5">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div>
            <div className="text-white/60 text-xs">Welcome back,</div>
            <div className="text-lg font-bold">{appUser?.name || 'Cricket Fan'} 🏏</div>
          </div>
          <div className="w-9 h-9 bg-ipl-orange rounded-full flex items-center justify-center font-bold text-sm">
            {(appUser?.name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-sm mx-auto px-4 py-5">

          {/* HOME */}
          {tab === 'home' && (
            <>
              {loading ? <Spinner /> : activeParties.length > 0 ? (
                <>
                  <div className="section-title">Current Watch Parties</div>
                  <div className="space-y-3 mb-6">
                    {activeParties.map(party => (
                      <div key={party.id} onClick={() => navigate(`/party/${party.id}`)}
                        className="card p-4 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-semibold text-sm">{party.name}</div>
                          <StatusBadge status={party.status} />
                        </div>
                        <div className="text-xs text-gray-500">Hosted by {party.hostName}</div>
                        <div className="text-xs text-gray-400 mt-1">{party.members.length} members</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="section-title">{activeParties.length > 0 ? 'Join Another Party' : 'Join a Watch Party'}</div>
              <div className="card p-4 mb-4">
                <p className="text-xs text-gray-500 mb-3">Enter the 6-digit code from your host</p>
                <div className="flex gap-2">
                  <input className="input-field flex-1 font-mono tracking-widest uppercase text-center text-lg"
                    placeholder="ABC123" value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    maxLength={6} onKeyDown={e => e.key === 'Enter' && handleJoin()} />
                  <button onClick={handleJoin} disabled={joining || code.length < 4}
                    className="btn-primary px-5 py-3 text-sm whitespace-nowrap">
                    {joining
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : 'Join'}
                  </button>
                </div>
              </div>
              {!loading && allParties.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">🏏</div>
                  <div className="font-semibold text-gray-600">No parties yet</div>
                  <div className="text-sm text-gray-400 mt-1">Enter a code above to join your first watch party</div>
                </div>
              )}
            </>
          )}

          {/* PAST */}
          {tab === 'past' && (
            <>
              <div className="section-title">Past Watch Parties</div>
              {loading ? <Spinner /> : pastParties.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">📋</div>
                  <div className="font-semibold text-gray-600">No past parties yet</div>
                  <div className="text-sm text-gray-400 mt-1">Completed parties will appear here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastParties.map(party => (
                    <div key={party.id} onClick={() => navigate(`/party/${party.id}`)}
                      className="card p-4 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-semibold text-sm">{party.name}</div>
                        <StatusBadge status={party.status} />
                      </div>
                      <div className="text-xs text-gray-500">Hosted by {party.hostName}</div>
                      <div className="text-xs text-gray-400 mt-1">{party.members.length} members</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* RULES */}
          {tab === 'rules' && (
            <>
              {/* Total points summary */}
              <div className="card p-4 mb-4 bg-ipl-blue text-white">
                <div className="text-sm font-semibold mb-3">Maximum Points Per Match</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-ipl-gold">10</div>
                    <div className="text-xs text-white/70 mt-0.5">Toss</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-ipl-gold">20</div>
                    <div className="text-xs text-white/70 mt-0.5">Match</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-ipl-gold">30</div>
                    <div className="text-xs text-white/70 mt-0.5">Powerplay ×2</div>
                  </div>
                </div>
              </div>

              <div className="section-title">Predictions</div>
              <div className="space-y-3 mb-5">
                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🪙</div>
                    <div>
                      <div className="font-semibold text-sm">Toss Prediction</div>
                      <div className="text-xs text-gray-500">Pick who wins the coin toss</div>
                    </div>
                    <div className="ml-auto text-xl font-bold text-ipl-orange">+10</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                    Window closes before the toss. If you pick the correct team you get <strong>10 points</strong>. Wrong pick = 0 points.
                  </div>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏆</div>
                    <div>
                      <div className="font-semibold text-sm">Match Winner</div>
                      <div className="text-xs text-gray-500">Pick who wins the match</div>
                    </div>
                    <div className="ml-auto text-xl font-bold text-ipl-orange">+20</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                    Window closes before the first ball is bowled. Correct team = <strong>20 points</strong>. Wrong = 0.
                  </div>
                </div>
              </div>

              <div className="section-title">⚡ Powerplay Guesses</div>
              <div className="card p-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">⚡</div>
                  <div>
                    <div className="font-semibold text-sm">Guess the 6-over score</div>
                    <div className="text-xs text-gray-500">One guess per team's powerplay</div>
                  </div>
                  <div className="ml-auto text-xl font-bold text-ipl-orange">+15 max</div>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Guess how many runs each team scores in their first 6 overs (powerplay). The closer your guess, the more points you earn.
                </div>
                {/* Scoring table */}
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="grid grid-cols-3 bg-ipl-blue text-white text-xs py-2 px-3 font-semibold">
                    <div>Your guess</div>
                    <div className="text-center">Difference</div>
                    <div className="text-right">Points</div>
                  </div>
                  {[
                    { label: 'Exactly right', diff: '±0 runs', pts: 15, highlight: true },
                    { label: 'Very close',    diff: '±1 run',  pts: 10, highlight: false },
                    { label: 'Close',         diff: '±3 runs', pts: 7,  highlight: false },
                    { label: 'Near',          diff: '±5 runs', pts: 5,  highlight: false },
                    { label: 'Far',           diff: '±8 runs', pts: 2,  highlight: false },
                    { label: 'Too far',       diff: '9+ runs', pts: 0,  highlight: false },
                  ].map((row, i) => (
                    <div key={i} className={`grid grid-cols-3 px-3 py-2 text-xs border-t border-gray-100 ${row.highlight ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <div className={row.highlight ? 'font-semibold text-green-700' : 'text-gray-600'}>{row.label}</div>
                      <div className="text-center text-gray-500">{row.diff}</div>
                      <div className={`text-right font-bold ${row.pts > 0 ? 'text-ipl-orange' : 'text-gray-300'}`}>
                        {row.pts > 0 ? `+${row.pts}` : '0'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-2 text-center">
                  Two powerplay rounds per match (one per team) = max +30 pts
                </div>
              </div>

              <div className="section-title">Host Points</div>
              <div className="space-y-2 mb-5">
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎮</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Mini-game Bonus</div>
                    <div className="text-xs text-gray-500">Trivia, best commentary, quickest answer...</div>
                  </div>
                  <div className="text-lg font-bold text-green-600">+5 / +10</div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">⬇️</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Host Deduction</div>
                    <div className="text-xs text-gray-500">Late arrival, wrong trivia answer...</div>
                  </div>
                  <div className="text-lg font-bold text-red-500">-5 / -10</div>
                </div>
              </div>

              <div className="section-title">How to Play</div>
              <div className="card p-4 space-y-3 mb-5">
                {[
                  { n: '1', text: 'Join a watch party using the 6-digit code from your host' },
                  { n: '2', text: 'Pick your toss winner before the host closes the toss window' },
                  { n: '3', text: 'Pick your match winner before the first ball is bowled' },
                  { n: '4', text: 'Guess both teams\' powerplay scores (first 6 overs) when the window is open' },
                  { n: '5', text: 'Scores update live — check the leaderboard throughout the match' },
                  { n: '6', text: 'Earn bonus points from host mini-games during the party' },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-ipl-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{item.n}</div>
                    <div className="text-sm text-gray-600">{item.text}</div>
                  </div>
                ))}
              </div>

              <div className="section-title">Prediction Windows</div>
              <div className="card p-4 space-y-3">
                {[
                  { color: 'bg-green-500', title: 'Window Open', desc: 'You can submit or change your prediction — do it now!' },
                  { color: 'bg-red-500',   title: 'Window Closed', desc: 'Host closed it — no more changes accepted' },
                  { color: 'bg-blue-500',  title: 'Result Set', desc: 'Actual score/winner entered — points calculated automatically' },
                ].map(item => (
                  <div key={item.title}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-sm font-semibold">{item.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-4">{item.desc}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ACCOUNT */}
          {tab === 'account' && (
            <>
              <div className="section-title">My Account</div>
              <div className="card p-5 mb-4">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 bg-ipl-orange rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {(appUser?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-base">{appUser?.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      📱 {(appUser as any)?.phone || firebaseUser?.phoneNumber || 'Phone user'}
                    </div>
                    {appUser?.favoriteTeam && (
                      <div className="text-xs text-ipl-orange font-semibold mt-1">❤️ {appUser.favoriteTeam}</div>
                    )}
                  </div>
                </div>
                <hr className="border-gray-100 mb-4" />

                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Name *</label>
                <input className="input-field mb-4" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" />

                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Favorite Food (optional)</label>
                <input className="input-field mb-4" value={editFood} onChange={e => setEditFood(e.target.value)} placeholder="e.g. Biryani, Samosas..." />

                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Favorite IPL Team <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {IPL_TEAMS.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => setEditTeam(editTeam === t.id ? '' : t.id as IPLTeam)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-bold transition-all border-2',
                        editTeam === t.id
                          ? `${t.color} border-transparent scale-105`
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {t.id}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone Number</label>
                <div className="input-field mb-5 bg-gray-50 text-gray-400 text-sm cursor-not-allowed">
                  {(appUser as any)?.phone || firebaseUser?.phoneNumber || 'N/A'}
                  <span className="text-xs ml-2">(cannot be changed)</span>
                </div>

                <button onClick={handleSaveAccount} disabled={savingAccount || !editName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {savingAccount
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Save Changes'}
                </button>
              </div>

              <div className="section-title">My Stats</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-ipl-orange">{allParties.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Parties Joined</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-ipl-orange">{pastParties.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Completed</div>
                </div>
              </div>

              <button
                onClick={async () => {
                  const { signOut } = await import('../../services/authService')
                  await signOut()
                  navigate('/login')
                }}
                className="w-full py-3 text-sm text-red-500 font-medium border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </>
          )}

        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-sm mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors relative ${
                tab === item.id ? 'text-ipl-orange' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab === item.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ipl-orange rounded-full" />
              )}
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
