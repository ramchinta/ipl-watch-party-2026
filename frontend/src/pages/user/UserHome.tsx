import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPartyByCode, joinParty } from '../../services/partyService'
import { db } from '../../services/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import type { WatchParty } from '../../types'
import { StatusBadge, Spinner } from '../../components/shared'
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
  const [savingAccount, setSavingAccount] = useState(false)

  useEffect(() => {
    if (!appUser) return
    setEditName(appUser.name || '')
    setEditFood((appUser as any).food || '')
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
                    {joining ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Join'}
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

          {tab === 'rules' && (
            <>
              <div className="section-title">How Points Are Scored</div>
              <div className="space-y-3 mb-6">
                {[
                  { icon: '🪙', title: 'Correct Toss Prediction', sub: 'Pick who wins the toss before it happens', pts: '+10', color: 'bg-yellow-100' },
                  { icon: '🏆', title: 'Correct Match Winner', sub: 'Pick the winning team before the first ball', pts: '+20', color: 'bg-green-100' },
                  { icon: '🎮', title: 'Host Bonus Points', sub: 'Awarded by host for mini-games at the party', pts: '+varies', color: 'bg-blue-100' },
                  { icon: '❌', title: 'Host Deduction', sub: 'Deducted by host for penalties', pts: '-varies', color: 'bg-red-100' },
                ].map(item => (
                  <div key={item.title} className="card p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-2xl flex-shrink-0`}>{item.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
                    </div>
                    <div className={`text-xl font-bold ${item.pts.startsWith('+') ? 'text-ipl-orange' : 'text-red-500'}`}>{item.pts}</div>
                  </div>
                ))}
              </div>

              <div className="section-title">How to Play</div>
              <div className="card p-4 space-y-3 mb-5">
                {[
                  'Join a watch party using the 6-digit code from your host',
                  'Make your toss prediction before the host closes the window',
                  'Make your match winner prediction before the first ball',
                  'Watch the leaderboard update live as results come in',
                  'Earn bonus points by winning host mini-games during the party',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-ipl-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <div className="text-sm text-gray-600">{text}</div>
                  </div>
                ))}
              </div>

              <div className="section-title">Prediction Windows</div>
              <div className="card p-4 space-y-3">
                {[
                  { color: 'bg-green-500', title: 'Toss Window Open', desc: 'You can submit or change your toss prediction' },
                  { color: 'bg-red-500', title: 'Toss Window Closed', desc: 'No more toss predictions — host closed it before the toss' },
                  { color: 'bg-blue-500', title: 'Match Window Open', desc: 'You can submit or change your match winner prediction' },
                  { color: 'bg-gray-400', title: 'Match Window Closed', desc: 'No more match predictions — host closed it before first ball' },
                ].map(item => (
                  <div key={item.title}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm font-semibold">{item.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-4">{item.desc}</p>
                  </div>
                ))}
              </div>
            </>
          )}

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
                    <div className="text-xs text-gray-400 mt-0.5">📱 {(appUser as any)?.phone || firebaseUser?.phoneNumber || 'Phone user'}</div>
                    {appUser?.favoriteTeam && <div className="text-xs text-ipl-orange font-semibold mt-1">❤️ {appUser.favoriteTeam}</div>}
                  </div>
                </div>
                <hr className="border-gray-100 mb-4" />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Name *</label>
                <input className="input-field mb-4" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Favorite Food (optional)</label>
                <input className="input-field mb-4" value={editFood} onChange={e => setEditFood(e.target.value)} placeholder="e.g. Biryani, Samosas..." />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone Number</label>
                <div className="input-field mb-5 bg-gray-50 text-gray-400 text-sm">
                  {(appUser as any)?.phone || firebaseUser?.phoneNumber || 'N/A'} <span className="text-xs">(cannot be changed)</span>
                </div>
                <button onClick={handleSaveAccount} disabled={savingAccount || !editName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {savingAccount ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
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

              <button onClick={async () => { const { signOut } = await import('../../services/authService'); await signOut(); navigate('/login') }}
                className="w-full py-3 text-sm text-red-500 font-medium border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
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
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors relative ${tab === item.id ? 'text-ipl-orange' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab === item.id && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ipl-orange rounded-full" />}
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
