import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInAdmin } from '../../services/authService'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    try {
      await signInAdmin(email, password)
      navigate('/')
    } catch {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ipl-blue flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ipl-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">IPL</span>
          </div>
          <h1 className="text-white text-xl font-bold">Admin / Host Login</h1>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</label>
          <input className="input-field mb-4" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Password</label>
          <input className="input-field mb-5" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
          </button>
          <button onClick={() => navigate('/login')} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600">← User login</button>
        </div>
      </div>
    </div>
  )
}
