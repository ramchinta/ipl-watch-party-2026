import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { initRecaptcha, sendOTP } from '../../services/authService'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [phone, setPhone] = useState('+1')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initRecaptcha('recaptcha-container')
  }, [])

  async function handleSend() {
    const cleaned = phone.trim()
    if (cleaned.length < 10) return toast.error('Enter a valid phone number')
    setLoading(true)
    try {
      await sendOTP(cleaned)
      // Pass through any join params
      const redirect = params.get('redirect') || ''
      const host = params.get('host') || ''
      navigate(`/otp?phone=${encodeURIComponent(cleaned)}&redirect=${redirect}&host=${host}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ipl-blue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-ipl-orange rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">IPL</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Watch Party 2026</h1>
          <p className="text-white/60 text-sm mt-1">Fantasy Cricket League</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-gray-900 font-semibold text-lg mb-1">Enter your phone</h2>
          <p className="text-gray-500 text-sm mb-5">We'll send you a one-time code</p>

          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Phone Number
          </label>
          <input
            className="input-field mb-4 text-lg tracking-wide"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            autoFocus
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Send OTP'
            }
          </button>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Admin / Host sign in →
            </button>
          </div>
        </div>
      </div>

      {/* Invisible recaptcha */}
      <div id="recaptcha-container" />
    </div>
  )
}
