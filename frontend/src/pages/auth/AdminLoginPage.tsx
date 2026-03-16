import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth } from '../../services/firebase'
import { signInAdmin } from '../../services/authService'
import toast from 'react-hot-toast'

type Tab = 'login' | 'signup'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suConfirm, setSuConfirm] = useState('')
  const [suCode, setSuCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) return toast.error('Enter email and password')
    setLoading(true)
    try { await signInAdmin(email, password); navigate('/') }
    catch { toast.error('Invalid email or password') }
    finally { setLoading(false) }
  }

  async function handleSignUp() {
    if (!suName.trim()) return toast.error('Enter your name')
    if (!suEmail.trim()) return toast.error('Enter your email')
    if (suPassword.length < 6) return toast.error('Password must be at least 6 characters')
    if (suPassword !== suConfirm) return toast.error('Passwords do not match')
    if (!suCode.trim()) return toast.error('Enter the host invite code')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, suEmail.trim(), suPassword)
      const fn = httpsCallable(getFunctions(), 'registerHost')
      await fn({ name: suName.trim(), inviteCode: suCode.trim() })
      toast.success('Host account created!')
      await cred.user.getIdToken(true)
      navigate('/host')
    } catch (e: any) {
      if (auth.currentUser) { try { await auth.currentUser.delete() } catch (_) {} }
      const msg = e.code === 'auth/email-already-in-use' ? 'Email already in use — try signing in'
        : e.code === 'functions/permission-denied' ? 'Invalid invite code — ask your admin'
        : e.code === 'functions/failed-precondition' ? 'Host registration not set up yet — contact admin'
        : e.code === 'functions/already-exists' ? 'Already registered as host or admin'
        : e.message || 'Registration failed'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const Spin = () => <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />

  return (
    <div className="min-h-screen bg-ipl-blue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ipl-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">IPL</span>
          </div>
          <h1 className="text-white text-xl font-bold">Host Portal</h1>
          <p className="text-white/60 text-sm mt-1">IPL Watch Party 2026</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['login','signup'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${tab===t ? 'text-ipl-orange border-b-2 border-ipl-orange bg-orange-50/50' : 'text-gray-400 hover:text-gray-600'}`}>
                {t === 'login' ? 'Sign In' : 'Host Sign Up'}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === 'login' ? (
              <>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</label>
                <input className="input-field mb-4" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Password</label>
                <input className="input-field mb-5" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="••••••••" />
                <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center">{loading ? <Spin/> : 'Sign In'}</button>
              </>
            ) : (
              <>
                <div className="bg-ipl-orange-light border border-ipl-orange/20 rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-600 leading-relaxed">You need an <strong>invite code</strong> from the admin to register as a host.</p>
                </div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Name *</label>
                <input className="input-field mb-4" value={suName} onChange={e=>setSuName(e.target.value)} placeholder="e.g. Rahul Kumar" autoFocus />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email *</label>
                <input className="input-field mb-4" type="email" value={suEmail} onChange={e=>setSuEmail(e.target.value)} placeholder="you@example.com" />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Password *</label>
                <input className="input-field mb-4" type="password" value={suPassword} onChange={e=>setSuPassword(e.target.value)} placeholder="At least 6 characters" />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confirm Password *</label>
                <input className="input-field mb-4" type="password" value={suConfirm} onChange={e=>setSuConfirm(e.target.value)} placeholder="Repeat password" />
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Host Invite Code *</label>
                <input className="input-field mb-5 font-mono tracking-widest uppercase" value={suCode} onChange={e=>setSuCode(e.target.value.toUpperCase())} placeholder="e.g. IPL2026" maxLength={20} onKeyDown={e=>e.key==='Enter'&&handleSignUp()} />
                <button onClick={handleSignUp} disabled={loading} className="btn-primary w-full flex items-center justify-center">{loading ? <Spin/> : 'Create Host Account'}</button>
              </>
            )}
            <button onClick={()=>navigate('/login')} className="w-full mt-4 text-xs text-gray-400 hover:text-gray-600 text-center">← Back to user login</button>
          </div>
        </div>
      </div>
    </div>
  )
}
