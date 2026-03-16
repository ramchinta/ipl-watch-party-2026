import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../services/authService'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { copyToClipboard } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [savingCode, setSavingCode] = useState(false)
  const [showCodeSection, setShowCodeSection] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'hostInvite'), snap => {
      if (snap.exists()) setCurrentCode(snap.data().code)
    })
    return () => unsub()
  }, [])

  async function handleSetCode() {
    if (inviteCode.trim().length < 4) return toast.error('Code must be at least 4 characters')
    setSavingCode(true)
    try {
      await httpsCallable(getFunctions(), 'setHostInviteCode')({ code: inviteCode.trim() })
      toast.success(`Invite code set: ${inviteCode.trim().toUpperCase()}`)
      setInviteCode('')
    } catch (e: any) { toast.error(e.message || 'Failed') }
    finally { setSavingCode(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-ipl-blue text-white px-5 pt-6 pb-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-white/60 text-sm">Admin Portal</div>
              <div className="text-xl font-bold">IPL Watch Party 2026</div>
            </div>
            <button onClick={() => signOut().then(() => navigate('/admin-login'))} className="text-xs text-white/50 hover:text-white/80">Sign out</button>
          </div>
          <div className="text-white/50 text-xs">{appUser?.email || appUser?.name}</div>
        </div>
      </div>
      <div className="max-w-sm mx-auto px-5 -mt-2 py-4 space-y-4">
        <div className="section-title">Admin Controls</div>
        {[{icon:'📅',label:'Fixtures',sub:'Manage IPL 2026 schedule',path:'/admin/fixtures'},
          {icon:'🎉',label:'Watch Parties',sub:'View all active parties',path:'/admin/parties'}
        ].map(t => (
          <button key={t.path} onClick={()=>navigate(t.path)} className="card p-4 w-full text-left flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-ipl-blue/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">{t.icon}</div>
            <div><div className="font-semibold">{t.label}</div><div className="text-sm text-gray-400">{t.sub}</div></div>
            <div className="ml-auto text-gray-300 text-lg">›</div>
          </button>
        ))}
        <div className="card p-4">
          <button onClick={()=>setShowCodeSection(!showCodeSection)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ipl-orange/10 rounded-xl flex items-center justify-center text-xl">🔑</div>
              <div className="text-left">
                <div className="font-semibold text-sm">Host Invite Code</div>
                <div className="text-xs text-gray-400">{currentCode ? `Current: ${currentCode}` : 'Not set — hosts cannot sign up yet'}</div>
              </div>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCodeSection?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {showCodeSection && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs text-gray-500">Share this code with people you want to allow as hosts. Only people with this code can register.</p>
              {currentCode && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono font-bold text-ipl-orange tracking-widest text-center text-lg">{currentCode}</div>
                  <button onClick={()=>copyToClipboard(currentCode).then(()=>toast.success('Copied!'))} className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100">📋</button>
                </div>
              )}
              <div className="flex gap-2">
                <input className="input-field flex-1 font-mono uppercase tracking-widest" placeholder="New code e.g. IPL2026" value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())} maxLength={20} onKeyDown={e=>e.key==='Enter'&&handleSetCode()} />
                <button onClick={handleSetCode} disabled={savingCode||inviteCode.trim().length<4} className="btn-primary px-4 py-2.5 text-sm whitespace-nowrap">{savingCode?'...':currentCode?'Update':'Set Code'}</button>
              </div>
              <p className="text-xs text-gray-400">Changing the code invalidates the old one. Existing hosts are not affected.</p>
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Season Info</div>
          <div className="space-y-1 text-sm text-gray-600">
            {[['Season','IPL 2026'],['Starts','28 Mar 2026'],['Final','31 May 2026']].map(([k,v])=>(
              <div key={k} className="flex justify-between"><span>{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
